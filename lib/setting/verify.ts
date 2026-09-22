/**
 * lib/setting/verify.ts — 1·2화 골든 대조.
 *
 *   npx tsx lib/setting/verify.ts <extraction_ep1.json> <extraction_ep2.json> [<extraction_ep1_run2.json> <extraction_ep2_run2.json>]
 *   예) npx tsx lib/setting/verify.ts lib/setting/fixtures/prelim_ep1.hand.json lib/setting/fixtures/prelim_ep2.hand.json
 *
 * 입력은 locate.ts 를 거친 Extraction JSON. 두 회차를 저장소 형태로 합친 뒤
 *   - 골든의 required / forbidden 을 하나씩 대조
 *   - conflicts.ts 를 돌려 카드가 나오는지 확인
 *   - 골든의 상한(카드 수·dropped·orphan)과 정밀도(요구 카드 / 총 카드)를 찍는다 (리뷰 E)
 *   - run2 가 있으면 결정성 대조 — 개체·상태뿐 아니라 사건·카드 키까지 (리뷰 D)
 * 결과는 한 줄에 하나. 통과 개수 / 실패 개수 로 끝난다.
 *
 * novel-trainer 규칙 그대로: 빈 결과를 통과로 읽지 않는다. 골든에 없는 항목이 더 있는 건 실패가 아니다.
 * 골든 자체도 GoldenSchema(strict) 로 읽는다 — 키 오타가 "조건 없음" 으로 조용히 통과하지 않게.
 * 이 파일은 네트워크를 쓰지 않는다. 추출 호출은 별도 스크립트(scripts/extract-setting.ts)가 한다.
 */
import { readFileSync } from "node:fs";
import { Extraction } from "./schema";
import { GoldenSchema, type ConflictCardRequired, type EventQuery, type Golden, type StateQuery } from "./golden";
import { detectStateChangeWithoutEvent, toStoredState, type StoredEvent, type StoredState } from "./conflicts";
import { normalizeAttribute, normalizeValue, sameValue, similarUnmergedAttributePairs } from "./attributes";

const results: { ok: boolean; line: string }[] = [];
const pass = (line: string) => { results.push({ ok: true, line: `  ok   ${line}` }); };
const fail = (line: string) => { results.push({ ok: false, line: `  FAIL ${line}` }); };
const check = (ok: boolean, okLine: string, failLine: string) => { if (ok) pass(okLine); else fail(failLine); };

function load(path: string): Extraction {
  const parsed = Extraction.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    console.error(`스키마 불일치: ${path}`);
    console.error(parsed.error.issues.slice(0, 5));
    process.exit(2);
  }
  return parsed.data;
}

function loadGolden(): Golden {
  const path = new URL("fixtures/prelim_ep1-2.golden.json", import.meta.url);
  const parsed = GoldenSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    console.error(`골든 스키마 불일치: ${path.pathname}`);
    console.error(parsed.error.issues.slice(0, 10));
    process.exit(2);
  }
  return parsed.data;
}

// ── 두 회차를 저장소 모양으로 합친다 (실제 서비스에선 DB 가 하는 일) ──
interface StoreEntity { id: string; name: string; kind: string; aliases: string[] }
interface Store {
  entities: StoreEntity[];
  states: StoredState[];
  events: StoredEvent[];
  relations: { subject: string; predicate: string; object: string; episode: number }[];
  rules: { statement: string; category: string; surface: string; episode: number }[];
  excluded: { surface: string; reason: string; episode: number }[];
  unclassified: { surface: string; episode: number }[];
  scenes: { episode: number; branch: string; anchored: boolean }[];
  narrator: { person: string; entityName: string | null };
  branches: Set<string>;
  orphan_ref: number;
  dropped: number;
  ambiguous_surface: number;
}

/** 이름 정규화: 같은 이름/별칭이면 같은 개체로. 실제 서비스의 lexicon 대조를 단순화한 것. */
function buildStore(exs: Extraction[]): Store {
  const st: Store = { entities: [], states: [], events: [], relations: [], rules: [], excluded: [], unclassified: [], scenes: [], narrator: { person: "", entityName: null }, branches: new Set(), orphan_ref: 0, dropped: 0, ambiguous_surface: 0 };
  const idByName = new Map<string, string>();
  const idOf = (name: string) => idByName.get(name.trim());

  for (const ex of exs) {
    for (const b of ex.branches) st.branches.add(b.id);
    st.dropped += ex.dropped.filter((d) => d.reason === "surface_not_found").length;
    st.orphan_ref += ex.dropped.filter((d) => d.reason === "orphan_ref").length;
    st.ambiguous_surface += [...ex.states, ...ex.events, ...ex.relations, ...ex.rules].filter((r) => r.evidence.occurrences > 1).length;
    const refToId = new Map<string, string>();
    for (const e of ex.entities) {
      const names = [e.name, ...e.aliases];
      let id = names.map((n) => idOf(n)).find(Boolean);
      if (!id) {
        id = `ent_${st.entities.length}`;
        st.entities.push({ id, name: e.name, kind: e.kind, aliases: [...e.aliases] });
      } else {
        const ent = st.entities.find((x) => x.id === id)!;
        for (const n of names) if (n !== ent.name && !ent.aliases.includes(n)) ent.aliases.push(n);
      }
      for (const n of names) idByName.set(n.trim(), id);
      refToId.set(e.ref, id);
    }
    const rid = (ref: string | null) => (ref ? refToId.get(ref) ?? null : null);

    for (const s of ex.states) {
      const entity_id = rid(s.entity);
      if (!entity_id) { st.orphan_ref++; continue; }   // 조용히 버리지 않는다
      st.states.push(toStoredState({ id: `st_${st.states.length}`, entity_id, attribute: s.attribute, value: s.value, branch: s.branch, episode: ex.episode, pos: s.evidence.span.start, certainty: s.certainty, claimed_in_dialogue: s.claimed_in_dialogue, speaker_id: rid(s.speaker), exclusive: s.exclusive, status: "observed", surface: s.evidence.surface }));
    }
    for (const ev of ex.events) {
      const attribute_key = ev.attribute ? normalizeAttribute(ev.attribute) : null;
      st.events.push({ id: `ev_${st.events.length}`, kind: ev.kind, subject_id: rid(ev.subject), attribute_key, branch: ev.branch, episode: ex.episode, pos: ev.evidence.span.start, description: ev.description, surface: ev.evidence.surface,
        value_before: ev.before != null && attribute_key ? normalizeValue(attribute_key, ev.before) : ev.before, value_after: ev.after != null && attribute_key ? normalizeValue(attribute_key, ev.after) : ev.after, elapsed_years: ev.elapsed_years });
    }
    for (const r of ex.relations) {
      const s = rid(r.subject), o = rid(r.object);
      if (s && o) st.relations.push({ subject: s, predicate: r.predicate, object: o, episode: ex.episode });
    }
    for (const r of ex.rules) st.rules.push({ statement: r.statement, category: r.category, surface: r.evidence.surface, episode: ex.episode });
    for (const x of ex.excluded) st.excluded.push({ ...x, episode: ex.episode });
    for (const u of ex.unclassified) st.unclassified.push({ surface: u.surface, episode: ex.episode });
    for (const sc of ex.scenes) st.scenes.push({ episode: ex.episode, branch: sc.branch, anchored: sc.anchor !== null });
    if (ex.narrator.entity) {
      const id = rid(ex.narrator.entity);
      st.narrator = { person: ex.narrator.person, entityName: st.entities.find((e) => e.id === id)?.name ?? null };
    }
  }
  return st;
}

// ── 대조 헬퍼 ──
const entityByName = (st: Store, name: string) => st.entities.find((e) => e.name === name || e.aliases.includes(name));
const anyAttr = (attrOrKey: string, list?: string[]) => !list || list.includes(attrOrKey) || list.map((a) => normalizeAttribute(a)).includes(attrOrKey);
const contains = (hay: unknown, needle?: string) => needle == null || String(hay).includes(needle);

function verify(st: Store, g: Golden) {
  // narrator
  check(st.narrator.entityName === g.narrator.entity_name, `화자 = ${g.narrator.entity_name}`, `화자: 기대 ${g.narrator.entity_name}, 실제 ${st.narrator.entityName}`);

  // branches
  for (const b of g.branches_min) check(st.branches.has(b), `갈래 ${b}`, `갈래 ${b} 없음`);

  // entities
  for (const req of g.entities_required) {
    const e = entityByName(st, req.name);
    if (!e) { fail(`개체 없음: ${req.name}`); continue; }
    if (e.kind !== req.kind) { fail(`개체 ${req.name} kind: 기대 ${req.kind}, 실제 ${e.kind}`); continue; }
    if (req.aliases_any && !req.aliases_any.some((a) => e.aliases.includes(a))) { fail(`개체 ${req.name} 별칭 누락 (${req.aliases_any.join("/")})`); continue; }
    pass(`개체 ${req.name} (${e.kind})`);
  }
  for (const f of g.entities_forbidden_kind) {
    const e = entityByName(st, f.name);
    check(!(e && e.kind === f.not_kind), `개체 ${f.name} 는 ${f.not_kind} 아님`, `개체 ${f.name} 가 ${f.not_kind} 로 분류됨`);
  }

  // states
  const stateMatch = (s: StoredState, q: StateQuery) => {
    const ent = entityByName(st, q.entity);
    if (!ent || s.entity_id !== ent.id) return false;
    if (!anyAttr(s.attribute, q.attribute_any) && !anyAttr(s.attribute_key, q.attribute_any)) return false;
    if (q.branch && s.branch !== q.branch) return false;
    if (q.episode && s.episode !== q.episode) return false;
    if (q.certainty && s.certainty !== q.certainty) return false;
    if (q.exclusive !== undefined && s.exclusive !== q.exclusive) return false;
    if (q.value !== undefined && !sameValue(s.value, q.value)) return false;
    if (!contains(s.value, q.value_contains)) return false;
    if (!contains(s.surface, q.surface_contains)) return false;
    if (q.value_min !== undefined && !(typeof s.value === "number" && s.value >= q.value_min)) return false;
    return true;
  };
  for (const q of g.states_required) {
    const label = `${q.entity}.${q.attribute_any[0]} = ${q.value ?? q.value_contains} (${q.episode}화)`;
    check(st.states.some((s) => stateMatch(s, q)), `상태 ${label}`, `상태 없음: ${label}`);
  }
  for (const q of g.states_forbidden) {
    check(!st.states.some((s) => stateMatch(s, q)), `금지 상태 없음: ${q._why}`, `금지 상태 존재: ${q._why}`);
  }

  // events
  const eventMatch = (e: StoredEvent, q: EventQuery) => {
    if (q.kind && e.kind !== q.kind) return false;
    if (q.branch && e.branch !== q.branch) return false;
    if (q.episode && e.episode !== q.episode) return false;
    if (q.subject) { const ent = entityByName(st, q.subject); if (!ent || e.subject_id !== ent.id) return false; }
    if (q.attribute_any && !(e.attribute_key && anyAttr(e.attribute_key, q.attribute_any))) return false;
    if (q.description_contains_any && !q.description_contains_any.some((d) => e.description.includes(d))) return false;
    if (q.before !== undefined && !(e.value_before != null && sameValue(e.value_before, q.before))) return false;
    if (q.after !== undefined && !(e.value_after != null && sameValue(e.value_after, q.after))) return false;
    if (!contains(e.surface, q.surface_contains)) return false;
    return true;
  };
  for (const q of g.events_required) check(st.events.some((e) => eventMatch(e, q)), `사건 ${q.kind} ${q.description_contains_any?.[0] ?? q.after} (${q.episode}화)`, `사건 없음: ${JSON.stringify(q)}`);
  for (const q of g.events_forbidden) check(!st.events.some((e) => eventMatch(e, q)), `금지 사건 없음: ${q._why}`, `금지 사건 존재: ${q._why}`);

  // relations
  for (const q of g.relations_required) {
    const s = entityByName(st, q.subject), o = entityByName(st, q.object);
    const ok = !!s && !!o && st.relations.some((r) => r.subject === s.id && r.object === o.id && q.predicate_any.some((p) => r.predicate.includes(p)));
    check(ok, `관계 ${q.subject} -${q.predicate_any[0]}-> ${q.object}`, `관계 없음: ${q.subject} -> ${q.object}`);
  }

  // rules
  for (const q of g.rules_required) {
    const ok = st.rules.some((r) => q.statement_contains_any.some((k) => r.statement.includes(k)) && q.category_any.includes(r.category) && contains(r.surface, q.surface_contains));
    check(ok, `규칙 ${q.statement_contains_any[0]}`, `규칙 없음: ${q.statement_contains_any.join("/")}`);
  }

  // excluded / unclassified
  for (const q of g.excluded_required) check(st.excluded.some((x) => x.surface.includes(q.surface_contains) && x.reason === q.reason), `제외 ${q.surface_contains} (${q.reason})`, `제외 누락: ${q.surface_contains}`);
  check(st.unclassified.length >= g.unclassified_expected_min, `분류 안 됨 ${st.unclassified.length}건 (≥${g.unclassified_expected_min})`, `분류 안 됨 ${st.unclassified.length}건 — 버려진 문장이 있는지 확인`);

  // scenes
  const ep1 = st.scenes.filter((s) => s.episode === 1), ep2 = st.scenes.filter((s) => s.episode === 2);
  check(ep1.length >= g.scenes.ep1_min, `1화 장면 ${ep1.length}`, `1화 장면 ${ep1.length} (< ${g.scenes.ep1_min})`);
  check(ep2.length >= g.scenes.ep2_min, `2화 장면 ${ep2.length}`, `2화 장면 ${ep2.length} (< ${g.scenes.ep2_min})`);
  check(ep1[0]?.branch === g.scenes.ep1_first_scene_branch, `1화 첫 장면 갈래 = ${g.scenes.ep1_first_scene_branch}`, `1화 첫 장면 갈래: 기대 ${g.scenes.ep1_first_scene_branch}, 실제 ${ep1[0]?.branch}`);
  const unanch = st.scenes.filter((s) => !s.anchored).length / Math.max(1, st.scenes.length);
  check(unanch <= g.scenes.unanchored_allowed_max_ratio, `시간 미확정 장면 비율 ${(unanch * 100).toFixed(0)}%`, `시간 미확정 장면 비율 ${(unanch * 100).toFixed(0)}% (> ${g.scenes.unanchored_allowed_max_ratio * 100}%)`);

  // 검사 ① — 여기서는 저장소 상태만 태운다. 등록된 별칭(유진혁/진혁)은 표기 변경이 아니므로
  // namingStatesFromMentions 는 lexicon 이 "다른 이름 두 개를 같은 개체로 묶었을 때" 만 쓴다 (서비스 코드 몫).
  const { cards, ambiguous_order } = detectStateChangeWithoutEvent(st.states, st.events, []);
  let requiredHit = 0;
  const cardMatch = (q: ConflictCardRequired) => cards.some((c) => {
    if (c.kind !== q.kind) return false;
    if (q.entity) { const ent = entityByName(st, q.entity); if (!ent || c.entity_id !== ent.id) return false; }
    if (q.entity_lexicon_merge_of) {
      // lexicon 이 두 이름을 한 개체로 묶었으면 그 개체, 아니면 화자(소유자)의 set 속성 카드.
      const ents = q.entity_lexicon_merge_of.map((n) => entityByName(st, n)).filter((e): e is StoreEntity => e !== undefined);
      const owner = entityByName(st, g.narrator.entity_name);
      if (!(ents.some((e) => e.id === c.entity_id) || (owner && c.entity_id === owner.id))) return false;
    }
    if (!anyAttr(c.attribute, q.attribute_any) && !anyAttr(c.attribute_key, q.attribute_any)) return false;
    const vals = [c.evidence[0].value, c.evidence[1].value];
    if (!q.evidence_values.every((v, i) => sameValue(vals[i], v))) return false;
    if (q.weak !== undefined && c.weak !== q.weak) return false;
    return true;
  });
  for (const q of g.conflict_cards_required) {
    const ok = cardMatch(q);
    if (ok) requiredHit++;
    check(ok, `카드 ${q.kind} ${q.entity ?? q.entity_lexicon_merge_of?.join("/")} ${q.evidence_values.join("→")}`, `카드 없음: ${q._why}`);
  }

  // 상한 (리뷰 E) — required 만 보면 카드 100장을 내도 통과한다
  const caps = g.caps;
  const cap = (name: string, actual: number, max: number | undefined) => {
    if (max === undefined) return;
    check(actual <= max, `상한 ${name} ${actual} ≤ ${max}`, `상한 초과 ${name} ${actual} > ${max}`);
  };
  cap("conflict_cards", cards.length, caps.conflict_cards_max);
  cap("dropped", st.dropped, caps.dropped_max);
  cap("orphan_ref", st.orphan_ref, caps.orphan_ref_max);
  cap("ambiguous_surface", st.ambiguous_surface, caps.ambiguous_surface_max);
  const unmerged = similarUnmergedAttributePairs(st.states);
  cap("similar_attributes_unmerged", unmerged.length, caps.similar_attributes_unmerged_max);

  const precision = cards.length === 0 ? 0 : requiredHit / cards.length;
  console.log(`\n  카드 총 ${cards.length}건 / 골든 요구 ${g.conflict_cards_required.length}건 충족 ${requiredHit} → 정밀도 ${(precision * 100).toFixed(0)}%   (검출기 #0: 제안 149건 중 실제 후보 한 자릿수)`);
  console.log(`  coverage: dropped ${st.dropped} · orphan_ref ${st.orphan_ref} · ambiguous_surface ${st.ambiguous_surface} · ambiguous_order ${ambiguous_order} · similar_attributes_unmerged ${unmerged.length}${unmerged.length ? " " + JSON.stringify(unmerged) : ""}`);
}

function determinism(a: Extraction[], b: Extraction[]) {
  const sig = (exs: Extraction[]) => {
    const st = buildStore(exs);
    const { cards } = detectStateChangeWithoutEvent(st.states, st.events, []);
    return JSON.stringify({
      ent: st.entities.map((x) => [x.name, x.kind, ...x.aliases].join("|")).sort(),
      st: st.states.map((x) => [x.entity_id, x.attribute_key, String(x.value), x.branch].join("|")).sort(),
      ev: st.events.map((x) => [x.kind, x.subject_id, x.attribute_key, String(x.value_before), String(x.value_after), x.branch].join("|")).sort(),
      cards: cards.map((c) => c.dismiss_key).sort(),
    });
  };
  check(sig(a) === sig(b), "결정성: 두 실행의 개체·상태·사건·카드 키 집합 동일", "결정성: 두 실행의 결과가 다름 — thinkingLevel/스키마 확인");
}

// ── main ──
const args = process.argv.slice(2);
if (args.length < 2) { console.error("usage: verify.ts ep1.json ep2.json [ep1_run2.json ep2_run2.json]"); process.exit(2); }
const golden = loadGolden();
const run1 = [load(args[0]), load(args[1])];
console.log("prelim 1·2화 골든 대조");
verify(buildStore(run1), golden);
if (args.length >= 4) determinism(run1, [load(args[2]), load(args[3])]);

for (const r of results) console.log(r.line);
const nFail = results.filter((r) => !r.ok).length;
console.log(`\n통과 ${results.length - nFail} / 실패 ${nFail}   (검출기 #0 기준선: 심은 오류 2건 중 0건)`);
process.exit(nFail === 0 ? 0 : 1);
