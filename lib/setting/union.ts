/**
 * lib/setting/union.ts — 같은 회차를 N번 추출한 결과를 근거 기준으로 하나로 합친다 (세션 55 ③-3, 1단계 기본 경로).
 *
 * 결정(박 님, 세션 55): 기본 경로는 MEDIUM · 3회 · 합집합. support(N회 중 등장 횟수) 1/N 인 관찰은 weak.
 * 합집합은 "N번 돌려 모은 것" 이지 한 실행의 성적이 아니다 — 재현율은 오르고 support 가 정밀도를 말한다.
 *
 * 합치는 기준 (같으면 하나, support += 1)
 *   개체   이름/별칭이 겹치면 같은 개체. ref 는 첫 실행의 것. kind 는 첫 실행, 별칭은 합집합.
 *   상태   (개체, 속성키, 정규화 값, 갈래). exclusive 는 OR, certainty 는 하나라도 explicit 이면 explicit, 근거는 가장 앞선 것.
 *   사건   transition (주체, 속성키, before, after, 갈래) · occurrence (갈래, description)
 *   관계   (주체, 객체, 술어)      규칙 statement      시간선 label      분류 안 됨·제외 surface
 *   장면   장면이 가장 많은 실행의 것 그대로 — 장면 경계는 실행마다 달라 합칠 수 없다.
 *   화자   첫 실행. 갈래 합집합. dropped 는 가장 많은 실행의 것, first_mention_fallback 은 최댓값.
 * 결과 Extraction 에 runs = N 과 항목별 support 가 붙는다. verify 는 그걸로 weak 를 정한다.
 */
import type { Extraction } from "./schema";
import { normalizeAttribute, normalizeValue } from "./attributes";

type Ent = Extraction["entities"][number];
type St = Extraction["states"][number];
type Ev = Extraction["events"][number];
type Rel = Extraction["relations"][number];
type Rule = Extraction["rules"][number];
type Tl = Extraction["timeline"][number];

const NUL = "\u0000";
const posOf = (x: { evidence: { span: { start: number } } }) => x.evidence.span.start;

export function unionExtractions(exs: Extraction[]): Extraction {
  if (exs.length === 0) throw new Error("합칠 추출 결과가 없다");
  if (exs.length === 1) return { ...exs[0], runs: exs[0].runs ?? 1 };   // 이미 합집합 파일이면 runs 를 지키지 않으면 support 1 이 weak 가 안 된다
  const N = exs.length;
  const episode = exs[0].episode;
  if (exs.some((e) => e.episode !== episode)) throw new Error("회차가 다른 결과를 합치려 한다");

  // 개체 — 이름/별칭으로 묶고, 실행별 ref → 합집합 ref 매핑
  const entities: Ent[] = [];
  const idByName = new Map<string, string>();
  const refMaps: Map<string, string>[] = [];
  for (const ex of exs) {
    const m = new Map<string, string>();
    for (const e of ex.entities) {
      const names = [e.name, ...e.aliases];
      let ref = names.map((n) => idByName.get(n.trim())).find(Boolean);
      if (!ref) { ref = e.ref; if (entities.some((x) => x.ref === ref)) ref = `${e.ref}_u${entities.length}`; entities.push({ ...e, ref, aliases: [...e.aliases] }); }
      else { const ent = entities.find((x) => x.ref === ref)!; for (const n of names) if (n !== ent.name && !ent.aliases.includes(n)) ent.aliases.push(n); }
      for (const n of names) idByName.set(n.trim(), ref);
      m.set(e.ref, ref);
    }
    refMaps.push(m);
  }
  const rid = (i: number, ref: string | null) => (ref == null ? null : refMaps[i].get(ref) ?? null);

  // 상태
  const states = new Map<string, St>();
  const sup = new Map<string, number>();   // 항목 키 → support (표는 종류별 접두어로 나눈다)
  const bump = (k: string, seen: Set<string>) => { if (!seen.has(k)) { seen.add(k); sup.set(k, (sup.get(k) ?? 0) + 1); } };
  const events = new Map<string, Ev>();
  const relations = new Map<string, Rel>();
  const rules = new Map<string, Rule>();
  const timeline = new Map<string, Tl>();
  const unclassified = new Map<string, Extraction["unclassified"][number]>();
  const excluded = new Map<string, Extraction["excluded"][number]>();
  const branches = new Map<string, Extraction["branches"][number]>();

  exs.forEach((ex, i) => {
    const seen = new Set<string>();
    for (const b of ex.branches) if (!branches.has(b.id)) branches.set(b.id, b);
    for (const s of ex.states) {
      const ref = rid(i, s.entity); if (!ref) continue;
      const key = normalizeAttribute(s.attribute);
      const k = ["s", ref, key, String(normalizeValue(key, s.value)), s.branch].join(NUL);
      const cur = states.get(k);
      if (!cur) states.set(k, { ...s, entity: ref, speaker: rid(i, s.speaker) });
      else {
        if (s.exclusive) cur.exclusive = true;
        if (s.certainty === "explicit") cur.certainty = "explicit";
        if (posOf(s) < posOf(cur)) cur.evidence = s.evidence;
      }
      bump(k, seen);
    }
    for (const e of ex.events) {
      const subj = rid(i, e.subject);
      const key = e.attribute ? normalizeAttribute(e.attribute) : null;
      const k = e.kind === "transition"
        ? ["t", subj, key, e.before == null ? "" : String(key ? normalizeValue(key, e.before) : e.before), e.after == null ? "" : String(key ? normalizeValue(key, e.after) : e.after), e.branch].join(NUL)
        : ["o", e.branch, e.description].join(NUL);
      if (!events.has(k)) events.set(k, { ...e, subject: subj });
      bump(k, seen);
    }
    for (const r of ex.relations) {
      const a = rid(i, r.subject), b = rid(i, r.object); if (!a || !b) continue;
      const k = ["r", a, b, r.predicate].join(NUL);
      if (!relations.has(k)) relations.set(k, { ...r, subject: a, object: b });
      bump(k, seen);
    }
    for (const r of ex.rules) { const k = ["rule", r.statement].join(NUL); if (!rules.has(k)) rules.set(k, { ...r, scope: rid(i, r.scope) }); bump(k, seen); }
    for (const t of ex.timeline) { const k = ["tl", t.branch, t.label].join(NUL); if (!timeline.has(k)) timeline.set(k, t); }
    for (const u of ex.unclassified) if (!unclassified.has(u.surface)) unclassified.set(u.surface, { ...u, attach_to: rid(i, u.attach_to) });
    for (const x of ex.excluded) { const k = x.surface + NUL + x.reason; if (!excluded.has(k)) excluded.set(k, x); }
  });

  const withSupport = <T>(m: Map<string, T>): (T & { support: number })[] => [...m].map(([k, v]) => ({ ...v, support: sup.get(k) ?? 1 }));
  const bestScenes = [...exs].sort((a, b) => b.scenes.length - a.scenes.length)[0];
  const bestDropped = [...exs].sort((a, b) => b.dropped.length - a.dropped.length)[0];

  return {
    episode,
    narrator: { person: exs[0].narrator.person, entity: rid(0, exs[0].narrator.entity) },
    branches: [...branches.values()],
    scenes: bestScenes.scenes.map((sc) => ({ ...sc, pov: rid(exs.indexOf(bestScenes), sc.pov) })),
    entities,
    states: withSupport(states),
    events: withSupport(events),
    relations: withSupport(relations),
    rules: withSupport(rules),
    timeline: [...timeline.values()],
    unclassified: [...unclassified.values()],
    excluded: [...excluded.values()],
    dropped: bestDropped.dropped,
    first_mention_fallback: Math.max(...exs.map((e) => e.first_mention_fallback)),
    runs: N,
  };
}
