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
 *   - run2 가 있으면 결정성 대조 — required 통과 집합과 카드 키 집합이 같은가. 개체·상태 대칭차는 info (세션 55 ①-6)
 * 결과는 한 줄에 하나. 통과 개수 / 실패 개수 로 끝난다. `info` 줄은 세지 않는다.
 *
 * novel-trainer 규칙 그대로: 빈 결과를 통과로 읽지 않는다. 골든에 없는 항목이 더 있는 건 실패가 아니다.
 * 골든 자체도 GoldenSchema(strict) 로 읽는다 — 키 오타가 "조건 없음" 으로 조용히 통과하지 않게.
 * 이 파일은 네트워크를 쓰지 않는다. 추출 호출은 별도 스크립트(scripts/extract-setting.ts)가 한다.
 */
import { readFileSync } from "node:fs";
import { Extraction } from "./schema";
import { GoldenSchema, type ConflictCardRequired, type EventQuery, type Golden, type StateQuery } from "./golden";
import { detectStateChangeWithoutEvent, toStoredState, type ConflictCard, type StoredEvent, type StoredState } from "./conflicts";
import { normalizeAttribute, normalizeValue, sameValue, similarUnmergedAttributePairs } from "./attributes";
import { materializeRelationStates, materializeTransitionStates } from "./store";

interface Line { ok: boolean | null; line: string }   // ok=null 은 info — 세지 않는다
type Sink = Line[];
const mk = (sink: Sink) => ({
  pass: (line: string) => { sink.push({ ok: true, line: `  ok   ${line}` }); },
  fail: (line: string) => { sink.push({ ok: false, line: `  FAIL ${line}` }); },
  info: (line: string) => { sink.push({ ok: null, line: `  info ${line}` }); },
  check: (ok: boolean, okLine: string, failLine: string) => { sink.push(ok ? { ok: true, line: `  ok   ${okLine}` } : { ok: false, line: `  FAIL ${failLine}` }); },
});

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
  relations: { subject: string; predicate: string; object: string; episode: number; surface: string }[];
  rules: { statement: string; category: string; surface: string; episode: number }[];
  excluded: { surface: string; reason: string; episode: number }[];
  unclassified: { surface: string; episode: number }[];
  scenes: { episode: number; branch: string; anchored: boolean }[];
  narrator: { person: string; entityName: string | null };
  branches: Set<string>;
  orphan_ref: number;
  dropped: number;
  ambiguous_surface: number;
  first_mention_fallback: number;
  /** 관계·전이에서 물질화된 상태 수 (store.ts) */
  states_from_relations: number;
  states_from_transitions: number;
}

/** 이름 정규화: 같은 이름/별칭이면 같은 개체로. 실제 서비스의 lexicon 대조를 단순화한 것. */
function buildStore(exs: Extraction[]): Store {
  const st: Store = { entities: [], states: [], events: [], relations: [], rules: [], excluded: [], unclassified: [], scenes: [], narrator: { person: "", entityName: null }, branches: new Set(), orphan_ref: 0, dropped: 0, ambiguous_surface: 0, first_mention_fallback: 0, states_from_relations: 0, states_from_transitions: 0 };
  const idByName = new Map<string, string>();
  const idOf = (name: string) => idByName.get(name.trim());

  for (const ex of exs) {
    for (const b of ex.branches) st.branches.add(b.id);
    st.dropped += ex.dropped.filter((d) => d.reason === "surface_not_found").length;
    st.orphan_ref += ex.dropped.filter((d) => d.reason === "orphan_ref").length;
    st.first_mention_fallback += ex.first_mention_fallback;
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
    const trRows = [];
    for (const ev of ex.events) {
      const attribute_key = ev.attribute ? normalizeAttribute(ev.attribute) : null;
      const subject_id = rid(ev.subject);
      st.events.push({ id: `ev_${st.events.length}`, kind: ev.kind, subject_id, attribute_key, branch: ev.branch, episode: ex.episode, pos: ev.evidence.span.start, description: ev.description, surface: ev.evidence.surface,
        value_before: ev.before != null && attribute_key ? normalizeValue(attribute_key, ev.before) : ev.before, value_after: ev.after != null && attribute_key ? normalizeValue(attribute_key, ev.after) : ev.after, elapsed_years: ev.elapsed_years });
      trRows.push({ kind: ev.kind, subject_id, attribute: ev.attribute, after: ev.after, branch: ev.branch, episode: ex.episode, pos: ev.evidence.span.start, surface: ev.evidence.surface });
    }
    // 전이 → 상태 물질화 (store.ts). subject·attribute·after 가 다 있는 transition 만. 같은 위치의 전이가 설명이 된다.
    for (const m of materializeTransitionStates(trRows)) {
      st.states.push(toStoredState({ id: `st_${st.states.length}`, ...m }));
      st.states_from_transitions++;
    }
    const relRows = [];
    for (const r of ex.relations) {
      const s = rid(r.subject), o = rid(r.object);
      if (!(s && o)) continue;
      st.relations.push({ subject: s, predicate: r.predicate, object: o, episode: ex.episode, surface: r.evidence.surface });
      relRows.push({ subject_id: s, predicate: r.predicate, object_id: o, branch: r.branch, episode: ex.episode, pos: r.evidence.span.start, surface: r.evidence.surface, claimed_in_dialogue: r.claimed_in_dialogue });
    }
    // 관계 → 상태 물질화 (store.ts). 술어가 동의어표에 있고 객체가 사람이 아닌 것만.
    for (const m of materializeRelationStates(relRows, st.entities)) {
      st.states.push(toStoredState({ id: `st_${st.states.length}`, ...m }));
      st.states_from_relations++;
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
const containsAny = (hay: unknown, needles?: string[]) => !needles || needles.some((n) => String(hay).includes(n));

interface VerifyOutcome {
  /** 통과한 required/forbidden 검사의 라벨 집합 — 결정성이 이걸 비교한다 */
  passed: Set<string>;
  cards: ConflictCard[];
  store: Store;
}

function verify(st: Store, g: Golden, sink: Sink): VerifyOutcome {
  const { pass, fail, info, check } = mk(sink);
  const passed = new Set<string>();
  const req = (label: string, ok: boolean, failLine: string) => { check(ok, label, failLine); if (ok) passed.add(label); };

  // narrator
  req(`화자 = ${g.narrator.entity_name}`, st.narrator.entityName === g.narrator.entity_name, `화자: 기대 ${g.narrator.entity_name}, 실제 ${st.narrator.entityName}`);

  // branches
  for (const b of g.branches_min) req(`갈래 ${b}`, st.branches.has(b), `갈래 ${b} 없음`);

  // entities
  for (const r of g.entities_required) {
    const e = entityByName(st, r.name);
    const kinds = r.kind_any ?? [r.kind!];
    const label = `개체 ${r.name} (${kinds.join("/")})`;
    if (!e) { fail(`개체 없음: ${r.name}`); continue; }
    if (!kinds.includes(e.kind)) { fail(`개체 ${r.name} kind: 기대 ${kinds.join("/")}, 실제 ${e.kind}`); continue; }
    if (r.aliases_any && !r.aliases_any.some((a) => e.aliases.includes(a))) { fail(`개체 ${r.name} 별칭 누락 (${r.aliases_any.join("/")})`); continue; }
    pass(label); passed.add(label);
  }
  for (const f of g.entities_forbidden_kind) {
    const e = entityByName(st, f.name);
    req(`개체 ${f.name} 는 ${f.not_kind} 아님`, !(e && e.kind === f.not_kind), `개체 ${f.name} 가 ${f.not_kind} 로 분류됨`);
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
    if (q.value_any && !q.value_any.some((v) => sameValue(s.value, v))) return false;
    if (!contains(s.value, q.value_contains)) return false;
    if (!contains(s.surface, q.surface_contains)) return false;
    if (!containsAny(s.surface, q.surface_contains_any)) return false;
    if (q.value_min !== undefined && !(typeof s.value === "number" && s.value >= q.value_min)) return false;
    return true;
  };
  for (const q of g.states_required) {
    const shown = q.value ?? q.value_any?.join("|") ?? q.value_contains;
    const label = `상태 ${q.entity}.${q.attribute_any[0]} = ${shown} (${q.episode}화)`;
    req(label, st.states.some((s) => stateMatch(s, q)), `상태 없음: ${q.entity}.${q.attribute_any[0]} = ${shown} (${q.episode}화)`);
  }
  for (const q of g.states_forbidden) {
    const hits = st.states.filter((s) => stateMatch(s, q));
    req(`금지 상태 없음: ${q._why}`, hits.length === 0, `금지 상태 존재: ${q._why} — ${hits.map((h) => `${h.attribute}=${String(h.value)} (${h.episode}화 "${h.surface}")`).join(" / ")}`);
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
  for (const q of g.events_required) req(`사건 ${q.kind} ${q.description_contains_any?.[0] ?? q.after} (${q.episode}화)`, st.events.some((e) => eventMatch(e, q)), `사건 없음: ${JSON.stringify(q)}`);
  for (const q of g.events_forbidden) {
    const hits = st.events.filter((e) => eventMatch(e, q));
    req(`금지 사건 없음: ${q._why}`, hits.length === 0, `금지 사건 존재: ${q._why} — ${hits.map((h) => `${h.episode}화 "${h.description}" ${String(h.value_before)}→${String(h.value_after)}`).join(" / ")}`);
  }

  // relations — 판정은 주체·객체·근거 문장. 술어는 info
  let predicateMismatch = 0;
  for (const q of g.relations_required) {
    const s = entityByName(st, q.subject), o = entityByName(st, q.object);
    const hits = s && o ? st.relations.filter((r) => r.subject === s.id && r.object === o.id && containsAny(r.surface, q.surface_contains_any)) : [];
    req(`관계 ${q.subject} -> ${q.object} (${q.surface_contains_any[0]})`, hits.length > 0, `관계 없음: ${q.subject} -> ${q.object} — 근거 후보 ${JSON.stringify(q.surface_contains_any)}; 있는 관계: ${(s && o ? st.relations.filter((r) => r.subject === s.id && r.object === o.id) : []).map((r) => `${r.predicate} "${r.surface.slice(0, 30)}"`).join(" / ") || "(없음)"}`);
    if (hits.length > 0 && q.predicate_info && !hits.some((r) => q.predicate_info!.some((p) => r.predicate.includes(p)))) { predicateMismatch++; info(`관계 술어 불일치: ${q.subject} -> ${q.object} 실제 "${hits.map((r) => r.predicate).join("/")}" (참고 ${q.predicate_info.join("/")})`); }
  }
  info(`관계 술어 불일치 ${predicateMismatch} / ${g.relations_required.length}`);

  // rules — 카테고리는 info
  let categoryMismatch = 0;
  for (const q of g.rules_required) {
    const hits = st.rules.filter((r) => q.statement_contains_any.some((k) => r.statement.includes(k)) && contains(r.surface, q.surface_contains) && containsAny(r.surface, q.surface_contains_any));
    req(`규칙 ${q.statement_contains_any[0]}`, hits.length > 0, `규칙 없음: ${q.statement_contains_any.join("/")}`);
    if (hits.length > 0 && q.category_info && !hits.some((r) => q.category_info!.includes(r.category))) categoryMismatch++;
  }
  info(`규칙 카테고리 불일치 ${categoryMismatch} / ${g.rules_required.length}`);

  // excluded — info. unclassified 는 required
  const exHit = g.excluded_info.filter((q) => st.excluded.some((x) => x.surface.includes(q.surface_contains) && x.reason === q.reason)).length;
  info(`제외(excluded) 기대 ${g.excluded_info.length} 중 ${exHit} 일치 · 모델이 낸 excluded ${st.excluded.length}건`);
  req(`분류 안 됨 ≥${g.unclassified_expected_min}`, st.unclassified.length >= g.unclassified_expected_min, `분류 안 됨 ${st.unclassified.length}건 — 버려진 문장이 있는지 확인`);

  // scenes — 미확정 비율은 info
  const ep1 = st.scenes.filter((s) => s.episode === 1), ep2 = st.scenes.filter((s) => s.episode === 2);
  req(`1화 장면 ≥${g.scenes.ep1_min}`, ep1.length >= g.scenes.ep1_min, `1화 장면 ${ep1.length} (< ${g.scenes.ep1_min})`);
  req(`2화 장면 ≥${g.scenes.ep2_min}`, ep2.length >= g.scenes.ep2_min, `2화 장면 ${ep2.length} (< ${g.scenes.ep2_min})`);
  req(`1화 첫 장면 갈래 = ${g.scenes.ep1_first_scene_branch}`, ep1[0]?.branch === g.scenes.ep1_first_scene_branch, `1화 첫 장면 갈래: 기대 ${g.scenes.ep1_first_scene_branch}, 실제 ${ep1[0]?.branch}`);
  const unanch = st.scenes.filter((s) => !s.anchored).length / Math.max(1, st.scenes.length);
  info(`시간 미확정 장면 비율 ${(unanch * 100).toFixed(0)}% (${st.scenes.filter((s) => !s.anchored).length}/${st.scenes.length})${g.scenes.unanchored_ratio_info !== undefined ? ` · 참고선 ${g.scenes.unanchored_ratio_info * 100}%` : ""}`);

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
    if (!q.evidence_values.every((v, i) => (Array.isArray(v) ? v.some((x) => sameValue(vals[i], x)) : sameValue(vals[i], v)))) return false;
    if (q.weak !== undefined && c.weak !== q.weak) return false;
    return true;
  });
  for (const q of g.conflict_cards_required) {
    const ok = cardMatch(q);
    if (ok) requiredHit++;
    req(`카드 ${q.kind} ${q.entity ?? q.entity_lexicon_merge_of?.join("/")} ${q.evidence_values.map((v) => (Array.isArray(v) ? v.join("|") : String(v))).join("→")}`, ok, `카드 없음: ${q._why}`);
  }
  // 나온 카드 전부 — 요구 밖 카드가 무엇인지 보여야 정밀도가 읽힌다
  for (const c of cards) {
    const ent = st.entities.find((e) => e.id === c.entity_id)?.name ?? c.entity_id;
    const sup = (x: StoredState) => (x.support !== undefined ? ` s${x.support}` : "");
    info(`카드: ${ent}.${c.attribute} ${String(c.evidence[0].value)}(${c.evidence[0].episode}화${sup(c.evidence[0])})→${String(c.evidence[1].value)}(${c.evidence[1].episode}화${sup(c.evidence[1])})${c.weak ? " weak" : ""} [${c.kind}]`);
  }

  // 상한 (리뷰 E) — required 만 보면 카드 100장을 내도 통과한다
  const caps = g.caps;
  const cap = (name: string, actual: number, max: number | undefined) => {
    if (max === undefined) return;
    req(`상한 ${name} ≤ ${max}`, actual <= max, `상한 초과 ${name} ${actual} > ${max}`);
  };
  cap("conflict_cards", cards.length, caps.conflict_cards_max);
  cap("dropped", st.dropped, caps.dropped_max);
  cap("orphan_ref", st.orphan_ref, caps.orphan_ref_max);
  cap("ambiguous_surface", st.ambiguous_surface, caps.ambiguous_surface_max);
  const unmerged = similarUnmergedAttributePairs(st.states);
  cap("similar_attributes_unmerged", unmerged.length, caps.similar_attributes_unmerged_max);

  const precision = cards.length === 0 ? 0 : requiredHit / cards.length;
  console.log(`\n  카드 총 ${cards.length}건 / 골든 요구 ${g.conflict_cards_required.length}건 충족 ${requiredHit} → 정밀도 ${(precision * 100).toFixed(0)}%   (검출기 #0: 제안 149건 중 실제 후보 한 자릿수)`);
  console.log(`  coverage: dropped ${st.dropped} · orphan_ref ${st.orphan_ref} · first_mention_fallback ${st.first_mention_fallback} · ambiguous_surface ${st.ambiguous_surface} · ambiguous_order ${ambiguous_order} · similar_attributes_unmerged ${unmerged.length}${unmerged.length ? " " + JSON.stringify(unmerged) : ""} · states_from_relations ${st.states_from_relations} · states_from_transitions ${st.states_from_transitions}`);
  return { passed, cards, store: st };
}

/**
 * 결정성 (세션 55 ①-6 → ③ N회). 실패 조건 둘: 모든 실행의 required 통과 집합 동일 · 카드 키 집합 동일.
 * 그 밑에 정보: required 항목별 N회 중 통과 횟수(불안정한 것만 나열) · 카드 키별 N회 중 등장 횟수 · 실행별 카드 수 · 개체·상태 대칭차(run1 대비).
 */
function determinism(runs: VerifyOutcome[], sink: Sink) {
  const { info, check } = mk(sink);
  const N = runs.length;
  const setEq = (x: Set<string>, y: Set<string>) => x.size === y.size && [...x].every((v) => y.has(v));
  const symdiff = (x: string[], y: string[]) => { const X = new Set(x), Y = new Set(y); return [...X].filter((v) => !Y.has(v)).length + [...Y].filter((v) => !X.has(v)).length; };

  // required 항목별 통과 횟수
  const allLabels = new Set<string>(); for (const r of runs) for (const l of r.passed) allLabels.add(l);
  const passCount = new Map<string, number>(); for (const l of allLabels) passCount.set(l, runs.filter((r) => r.passed.has(l)).length);
  const unstable = [...passCount].filter(([, k]) => k < N);
  check(runs.every((r) => setEq(r.passed, runs[0].passed)), `결정성: ${N}회 required 통과 집합 동일 (${runs[0].passed.size}건)`, `결정성: required 통과 집합이 실행마다 다름 — 불안정 ${unstable.length}건 (아래 info)`);
  // 카드 키별 등장 횟수
  const keySets = runs.map((r) => new Set(r.cards.map((c) => c.dismiss_key)));
  const allKeys = new Set<string>(); for (const k of keySets) for (const v of k) allKeys.add(v);
  const keyLabel = (key: string) => { for (const r of runs) { const c = r.cards.find((x) => x.dismiss_key === key); if (c) return `${r.store.entities.find((e) => e.id === c.entity_id)?.name ?? c.entity_id}.${c.attribute} ${String(c.evidence[0].value)}→${String(c.evidence[1].value)}`; } return key; };
  check(keySets.every((k) => setEq(k, keySets[0])), `결정성: ${N}회 카드 키 집합 동일 (${keySets[0].size}장)`, `결정성: 카드 키 집합이 실행마다 다름 — ${runs.map((r, i) => `run${i + 1} ${r.cards.length}장`).join(" · ")}`);
  info(`카드 수 ${runs.map((r, i) => `run${i + 1} ${r.cards.length}`).join(" · ")}`);
  for (const key of allKeys) info(`카드 키 등장 ${keySets.filter((k) => k.has(key)).length}/${N}: ${keyLabel(key)}`);
  info(`required 안정 ${allLabels.size - unstable.length} · 불안정 ${unstable.length} (${N}회 모두 통과한 항목 수 / 실행마다 갈리는 항목 수)`);
  for (const [l, k] of unstable.sort((x, y) => y[1] - x[1])) info(`required 통과 ${k}/${N}: ${l}`);
  const entSig = (st: Store) => st.entities.map((x) => [x.name, x.kind].join("|"));
  const stSig = (st: Store) => st.states.map((x) => [st.entities.find((e) => e.id === x.entity_id)?.name, x.attribute_key, String(x.value), x.branch].join("|"));
  for (let i = 1; i < N; i++) info(`대칭차 run1↔run${i + 1}: 개체 ${symdiff(entSig(runs[0].store), entSig(runs[i].store))} · 상태 ${symdiff(stSig(runs[0].store), stSig(runs[i].store))} (run1 개체 ${runs[0].store.entities.length}/상태 ${runs[0].store.states.length} · run${i + 1} 개체 ${runs[i].store.entities.length}/상태 ${runs[i].store.states.length})`);
}

/**
 * 합집합 채점 (세션 55 ③-3, --union). N회 결과를 근거 기준으로 하나로 합친다 —
 *   상태  같은 (개체 이름, 속성키, 값, 갈래) 면 하나. support = 몇 회에서 나왔나. 1/N 이면 weak (카드가 weak 가 된다).
 *         exclusive 는 OR, certainty 는 하나라도 explicit 이면 explicit, 위치는 가장 앞선 것.
 *   사건  transition 은 (주체, 속성키, before, after, 갈래), occurrence 는 (갈래, description). 관계는 (주체, 객체, 술어). 규칙은 statement.
 *   장면  회차마다 장면이 가장 많은 실행의 것(장면은 실행마다 경계가 달라 합칠 수 없다). 화자는 run1.
 *   coverage 수치는 실행 중 최댓값.
 * 합집합은 "N번 돌려 모은 것" 이지 한 실행의 성적이 아니다 — 재현율은 오르고 support 가 정밀도를 말한다.
 */
function unionStores(stores: Store[]): Store {
  const N = stores.length;
  const st: Store = { entities: [], states: [], events: [], relations: [], rules: [], excluded: [], unclassified: [], scenes: [], narrator: stores[0].narrator, branches: new Set(), orphan_ref: 0, dropped: 0, ambiguous_surface: 0, first_mention_fallback: 0, states_from_relations: 0, states_from_transitions: 0 };
  const idByName = new Map<string, string>();
  for (const s of stores) for (const e of s.entities) {
    const names = [e.name, ...e.aliases];
    let id = names.map((n) => idByName.get(n)).find(Boolean);
    if (!id) { id = `u_${st.entities.length}`; st.entities.push({ id, name: e.name, kind: e.kind, aliases: [...e.aliases] }); }
    else { const ent = st.entities.find((x) => x.id === id)!; for (const n of names) if (n !== ent.name && !ent.aliases.includes(n)) ent.aliases.push(n); }
    for (const n of names) idByName.set(n, id);
  }
  const uid = (s: Store, id: string | null) => (id == null ? null : idByName.get(s.entities.find((e) => e.id === id)?.name ?? "") ?? null);
  const posKey = (x: { episode: number; pos: number }) => x.episode * 1e9 + x.pos;

  const states = new Map<string, StoredState>(), stSup = new Map<string, number>();
  const events = new Map<string, StoredEvent>();
  const rels = new Map<string, Store["relations"][number]>();
  const rules = new Map<string, Store["rules"][number]>();
  const excluded = new Map<string, Store["excluded"][number]>();
  const uncl = new Map<string, Store["unclassified"][number]>();
  for (const s of stores) {
    for (const b of s.branches) st.branches.add(b);
    st.dropped = Math.max(st.dropped, s.dropped); st.orphan_ref = Math.max(st.orphan_ref, s.orphan_ref); st.ambiguous_surface = Math.max(st.ambiguous_surface, s.ambiguous_surface);
    st.first_mention_fallback = Math.max(st.first_mention_fallback, s.first_mention_fallback); st.states_from_relations = Math.max(st.states_from_relations, s.states_from_relations); st.states_from_transitions = Math.max(st.states_from_transitions, s.states_from_transitions);
    const seen = new Set<string>();
    for (const x of s.states) {
      const eid = uid(s, x.entity_id); if (!eid) continue;
      const k = [eid, x.attribute_key, String(x.value), x.branch].join("\0");
      const cur = states.get(k);
      if (!cur) states.set(k, { ...x, id: `st_${states.size}`, entity_id: eid, speaker_id: uid(s, x.speaker_id) });
      else { if (x.exclusive) cur.exclusive = true; if (x.certainty === "explicit") cur.certainty = "explicit"; if (posKey(x) < posKey(cur)) { cur.pos = x.pos; cur.episode = x.episode; cur.surface = x.surface; } }
      if (!seen.has(k)) { seen.add(k); stSup.set(k, (stSup.get(k) ?? 0) + 1); }
    }
    for (const e of s.events) {
      const sid = uid(s, e.subject_id);
      const k = e.kind === "transition" ? ["t", sid, e.attribute_key, String(e.value_before), String(e.value_after), e.branch].join("\0") : ["o", e.branch, e.description].join("\0");
      if (!events.has(k)) events.set(k, { ...e, id: `ev_${events.size}`, subject_id: sid });
    }
    for (const r of s.relations) { const a = uid(s, r.subject), b = uid(s, r.object); if (!a || !b) continue; const k = [a, b, r.predicate].join("\0"); if (!rels.has(k)) rels.set(k, { ...r, subject: a, object: b }); }
    for (const r of s.rules) if (!rules.has(r.statement)) rules.set(r.statement, r);
    for (const x of s.excluded) { const k = x.surface + "\0" + x.reason; if (!excluded.has(k)) excluded.set(k, x); }
    for (const u of s.unclassified) if (!uncl.has(u.surface)) uncl.set(u.surface, u);
  }
  for (const [k, x] of states) { const sup = stSup.get(k)!; x.support = sup; x.weak = N > 1 && sup === 1; st.states.push(x); }
  st.events = [...events.values()]; st.relations = [...rels.values()]; st.rules = [...rules.values()]; st.excluded = [...excluded.values()]; st.unclassified = [...uncl.values()];
  for (const ep of [1, 2]) { const best = stores.map((s) => s.scenes.filter((x) => x.episode === ep)).sort((a, b) => b.length - a.length)[0] ?? []; st.scenes.push(...best); }
  return st;
}

function supportSummary(st: Store, N: number, sink: Sink) {
  const { info } = mk(sink);
  const hist = new Map<number, number>(); for (const x of st.states) hist.set(x.support ?? 0, (hist.get(x.support ?? 0) ?? 0) + 1);
  info(`합집합 상태 ${st.states.length}건 — support ${[...hist].sort((a, b) => b[0] - a[0]).map(([k, v]) => `${k}/${N}: ${v}`).join(" · ")} (1/${N} 은 weak)`);
  info(`합집합 개체 ${st.entities.length} · 사건 ${st.events.length} · 관계 ${st.relations.length} · 규칙 ${st.rules.length}`);
}

// ── main ──
const union = process.argv.includes("--union");
const args = process.argv.slice(2).filter((a) => a !== "--union");
if (args.length < 2 || args.length % 2 !== 0) { console.error("usage: verify.ts ep1.json ep2.json [ep1_run2.json ep2_run2.json [ep1_run3.json ep2_run3.json …]]  — 회차 쌍을 실행 수만큼"); process.exit(2); }
const golden = loadGolden();
const tally = (sink: Sink) => ({ pass: sink.filter((r) => r.ok === true).length, fail: sink.filter((r) => r.ok === false).length });
const print = (title: string, sink: Sink) => {
  console.log(`\n=== ${title} ===`);
  for (const r of sink) console.log(r.line);
  const t = tally(sink);
  console.log(`  ${title}: 통과 ${t.pass} / 실패 ${t.fail}`);
  return t;
};

// 실행별로 완전히 분리해 찍는다 (세션 55 ①-b-4). run1 → run2 → … → 결정성. 총계는 전부의 합이다.
console.log("prelim 1·2화 골든 대조");
const N = args.length / 2;
const outs: VerifyOutcome[] = [];
const tallies: { pass: number; fail: number }[] = [];
const stores: Store[] = [];
for (let i = 0; i < N; i++) {
  const sink: Sink = [];
  const store = buildStore([load(args[2 * i]), load(args[2 * i + 1])]);
  stores.push(store);
  outs.push(verify(store, golden, sink));
  tallies.push(print(`run${i + 1}`, sink));
}
let tD = { pass: 0, fail: 0 };
if (N >= 2) {
  const sinkD: Sink = [];
  determinism(outs, sinkD);
  tD = print("결정성", sinkD);
}
let tU = { pass: 0, fail: 0 };
if (union && N >= 2) {
  const sinkU: Sink = [];
  const u = unionStores(stores);
  supportSummary(u, N, sinkU);
  verify(u, golden, sinkU);
  tU = print(`union(${N})`, sinkU);
}
const nPass = tallies.reduce((s, t) => s + t.pass, 0) + tD.pass + tU.pass, nFail = tallies.reduce((s, t) => s + t.fail, 0) + tD.fail + tU.fail;
console.log(`\n통과 ${nPass} / 실패 ${nFail}   (${tallies.map((t, i) => `run${i + 1} ${t.pass}/${t.fail}`).join(" · ")}${N >= 2 ? ` · 결정성 ${tD.pass}/${tD.fail}` : ""}${union && N >= 2 ? ` · union ${tU.pass}/${tU.fail}` : ""} · 검출기 #0 기준선: 심은 오류 2건 중 0건)`);
process.exit(nFail === 0 ? 0 : 1);
