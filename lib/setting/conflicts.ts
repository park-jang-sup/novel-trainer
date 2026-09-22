/**
 * lib/setting/conflicts.ts — 결정적 검사 ① "전이 없는 상태 변화" 와 거울검사 ①′ "전이 뒤 옛 값 재등장".
 *
 * 입력은 저장소에 누적된 관찰·사건·작가 결정이고, 출력은 카드다.
 * LLM 은 여기 없다. 같은 입력이면 같은 출력이다 — 입력 배열의 순서와 무관하게 (P6).
 *
 * 정의
 *   ①  같은 (개체, 속성키, 갈래) 의 관찰을 (회차, 오프셋) 순으로 늘어놓았을 때
 *      인접한 두 값이 다르고, 그 사이에 그 속성을 바꾸는 transition 이 없으면 카드.
 *      "사이" 는 앞 관찰의 위치보다 뒤, 뒤 관찰의 위치 이하. 앞 값을 만든 사건은 설명이 아니다.
 *      사건에 before/after 가 적혀 있으면 값도 맞아야 한다.
 *   ①′ transition 이 값 X 를 끝냈는데(before=X, after≠X) 그 뒤에 X 가 다시 관찰되고,
 *      그 사이에 X 로 되돌리는 transition 이 없으면 카드. ①이 "원인 없는 결과", ①′이 "결과 없는 원인".
 *
 * 속성 성질 (attributes.ts)
 *   single  ① 그대로.
 *   set     원소가 늘어나는 건 변화가 아니다 (스킬 셋 보유). ① 은 exclusive 관찰("이것뿐")이 있을 때만:
 *           exclusive 관찰의 값이 앞선 관찰의 값과 다르면, 앞 값을 제거한 transition 이 사이에 없는 한 카드.
 *           ①′ 는 set 에도 그대로 (부러진 검이 다시 나오면 카드).
 *   age     시간 도약(occurrence.elapsed_years)이 사이에 있고 0 ≤ Δ ≤ elapsed+1 이면 설명된 것.
 *           도약이 없으면 Δ=±1 도 카드지만 "만 나이/세는 나이" 힌트와 규칙 등록 액션을 붙인다.
 *
 * 정직성
 *   - 대사 속 주장은 빼지 않는다. 발화자 ≠ 주체면 weak (리뷰 G).
 *   - inferred 끼리, 또는 숫자화 실패 값이 끼면 weak.
 *   - 같은 위치(회차·오프셋 동일)면 값 문자열 순으로 고정하고 ambiguous_order 표시.
 *   - dismiss 키는 순서 무관 (값 둘을 정렬해 만든다).
 */
import { normalizeAttribute, normalizeValue, sameValue, specOf } from "./attributes";

export type Value = string | number;

export interface StoredState {
  id: string;
  entity_id: string;
  attribute: string;        // 원문
  attribute_key: string;    // 정규화 키
  value: Value;             // 정규화된 값 (number 속성이면 number, 실패 시 원문 string)
  value_raw: string;        // 원문 값
  branch: string;
  episode: number;
  pos: number;              // evidence.span.start
  certainty: "explicit" | "inferred";
  claimed_in_dialogue: boolean;
  speaker_id: string | null;
  exclusive: boolean;
  status: "observed" | "canonical" | "rejected";
  surface: string;
  /** 합집합 채점(verify --union)에서만: N회 중 몇 번 관찰됐나. 1/N 이면 weak (세션 55 ③-3) */
  support?: number;
  weak?: boolean;
}

export interface StoredEvent {
  id: string;
  kind: "transition" | "occurrence";
  subject_id: string | null;
  attribute_key: string | null;
  branch: string;
  episode: number;
  pos: number;
  description: string;
  surface: string;
  value_before: Value | null;
  value_after: Value | null;
  elapsed_years: number | null;
}

export interface Decision {
  action: "dismiss" | "register_event" | "register_rule" | "register_alias" | "fix_manuscript";
  key: string;
}

export interface ConflictCard {
  kind: "state_change_without_event" | "state_reappears_after_transition";
  entity_id: string;
  attribute_key: string;
  attribute: string;        // 화면용 원문 (뒤 관찰의 표기)
  branch: string;
  /** 항상 둘. ①: 앞 관찰, 뒤 관찰. ①′: [사건을 대신하는 가짜 관찰(사건 위치·before 값), 재등장 관찰] */
  evidence: [StoredState, StoredState];
  cause_event?: StoredEvent;
  missing: string;
  weak: boolean;
  hint?: string;
  ambiguous_order?: boolean;
  actions: Decision["action"][];
  dismiss_key: string;
}

/** 순서 무관 dismiss 키 (P6). */
export function makeDismissKey(entity_id: string, attribute_key: string, v1: Value, v2: Value): string {
  const [a, b] = [String(v1), String(v2)].sort();
  return [entity_id, attribute_key, a, b].join("\u0000");
}

/** Extraction 의 상태 한 줄 → StoredState. 정규화는 여기서 한 번만. */
export function toStoredState(
  o: Omit<StoredState, "attribute_key" | "value" | "value_raw"> & { value: string },
  workAliases: Record<string, string> = {},
): StoredState {
  const attribute_key = normalizeAttribute(o.attribute, workAliases);
  return { ...o, attribute_key, value_raw: o.value, value: normalizeValue(attribute_key, o.value) };
}

type Pos = { episode: number; pos: number };
const posKey = (x: Pos) => x.episode * 1e9 + x.pos;
const before = (x: Pos, y: Pos) => posKey(x) < posKey(y);
const beforeOrAt = (x: Pos, y: Pos) => posKey(x) <= posKey(y);

function sortStable(list: StoredState[]): { sorted: StoredState[]; ties: Set<string> } {
  const sorted = [...list].sort((a, b) => posKey(a) - posKey(b) || String(a.value).localeCompare(String(b.value)) || a.id.localeCompare(b.id));
  const ties = new Set<string>();
  for (let i = 0; i + 1 < sorted.length; i++)
    if (posKey(sorted[i]) === posKey(sorted[i + 1])) { ties.add(sorted[i].id); ties.add(sorted[i + 1].id); }
  return { sorted, ties };
}

const foreignClaim = (s: StoredState) => s.claimed_in_dialogue && s.speaker_id !== s.entity_id;

function isWeak(a: StoredState, b: StoredState): boolean {
  const numeric = specOf(a.attribute_key).valueKind === "number";
  const unparsed = numeric && (typeof a.value !== "number" || typeof b.value !== "number");
  const bothInferred = a.certainty === "inferred" && b.certainty === "inferred";
  return unparsed || bothInferred || foreignClaim(a) || foreignClaim(b) || !!a.weak || !!b.weak;
}

export function detectStateChangeWithoutEvent(
  states: StoredState[],
  events: StoredEvent[],
  decisions: Decision[],
): { cards: ConflictCard[]; weak_dialogue_claims: number; ambiguous_order: number } {
  const dismissed = new Set(decisions.filter((d) => d.action === "dismiss").map((d) => d.key));
  const usable = states.filter((s) => s.status !== "rejected");
  const weak_dialogue_claims = usable.filter(foreignClaim).length;

  const groups = new Map<string, StoredState[]>();
  for (const s of usable) {
    const k = [s.entity_id, s.attribute_key, s.branch].join("\u0000");
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
  }
  const transitions = events.filter((e) => e.kind === "transition");
  const jumps = events.filter((e) => e.kind === "occurrence" && e.elapsed_years != null);

  const cards: ConflictCard[] = [];
  let ambiguous = 0;

  for (const [, list] of groups) {
    const spec = specOf(list[0].attribute_key);
    const { sorted, ties } = sortStable(list);

    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = sorted[i], b = sorted[i + 1];
      if (sameValue(a.value, b.value)) continue;

      // set 속성: 뒤 관찰이 exclusive 일 때만 "앞 값이 사라졌다" 로 본다. 아니면 원소 추가일 뿐.
      if (spec.cardinality === "set" && !b.exclusive) continue;

      const key = makeDismissKey(a.entity_id, a.attribute_key, a.value, b.value);
      if (dismissed.has(key)) continue;

      const explained = transitions.some((e) => {
        if (e.subject_id !== a.entity_id || e.branch !== a.branch || e.attribute_key !== a.attribute_key) return false;
        if (!before(a, e) || !beforeOrAt(e, b)) return false;
        if (e.value_before != null && !sameValue(e.value_before, a.value)) return false;
        // set 속성에서는 앞 값을 없앤 사건이면 충분하다 (after 는 묻지 않는다)
        if (spec.cardinality === "single" && e.value_after != null && !sameValue(e.value_after, b.value)) return false;
        return true;
      });
      if (explained) continue;

      let hint: string | undefined;
      if (spec.drifts_with_time && typeof a.value === "number" && typeof b.value === "number") {
        const delta = b.value - a.value;
        const between = jumps.filter((j) => j.branch === a.branch && before(a, j) && beforeOrAt(j, b));
        const elapsed = between.reduce((acc, j) => acc + (j.elapsed_years ?? 0), 0);
        if (between.length > 0 && delta >= 0 && delta <= elapsed + 1) continue;   // 시간 도약이 설명. 도약이 없으면 +1 도 카드(힌트 붙여서)
        if (Math.abs(delta) === 1) hint = "만 나이/세는 나이 차이일 수 있음 — 나이 체계 규칙 등록 가능";
      }

      const amb = ties.has(a.id) && ties.has(b.id);
      if (amb) ambiguous++;
      cards.push({
        kind: "state_change_without_event",
        entity_id: a.entity_id,
        attribute_key: a.attribute_key,
        attribute: b.attribute,
        branch: a.branch,
        evidence: [a, b],
        missing: `${a.episode}~${b.episode}화 사이 '${b.attribute}' 변화 사건`,
        weak: isWeak(a, b),
        hint,
        ambiguous_order: amb || undefined,
        actions: hint ? ["register_event", "register_rule", "fix_manuscript", "dismiss"] : ["register_event", "fix_manuscript", "dismiss"],
        dismiss_key: key,
      });
    }
  }

  // ①′ 거울검사 (P4)
  for (const e of transitions) {
    if (e.subject_id == null || e.attribute_key == null || e.value_before == null) continue;
    if (e.value_after != null && sameValue(e.value_after, e.value_before)) continue;
    const later = usable
      .filter((s) => s.entity_id === e.subject_id && s.attribute_key === e.attribute_key && s.branch === e.branch && before(e, s) && sameValue(s.value, e.value_before!))
      .sort((x, y) => posKey(x) - posKey(y));
    if (later.length === 0) continue;
    const re = later[0];
    const restored = transitions.some((t) =>
      t.id !== e.id && t.subject_id === e.subject_id && t.attribute_key === e.attribute_key && t.branch === e.branch &&
      before(e, t) && beforeOrAt(t, re) && t.value_after != null && sameValue(t.value_after, e.value_before!));
    if (restored) continue;
    const key = makeDismissKey(e.subject_id, e.attribute_key, `Δ${e.id}`, re.value);
    if (dismissed.has(key)) continue;
    const ghost: StoredState = { ...re, id: `event:${e.id}`, value: e.value_before, value_raw: String(e.value_before), episode: e.episode, pos: e.pos, surface: e.surface, certainty: "explicit", claimed_in_dialogue: false, speaker_id: null, exclusive: false };
    cards.push({
      kind: "state_reappears_after_transition",
      entity_id: e.subject_id,
      attribute_key: e.attribute_key,
      attribute: re.attribute,
      branch: e.branch,
      evidence: [ghost, re],
      cause_event: e,
      missing: `${e.episode}화 '${e.description || e.surface}' 이후 '${String(e.value_before)}' 이(가) 돌아오는 사건`,
      weak: re.certainty === "inferred" || foreignClaim(re),
      actions: ["register_event", "fix_manuscript", "dismiss"],
      dismiss_key: key,
    });
  }

  cards.sort((x, y) => x.dismiss_key.localeCompare(y.dismiss_key));   // 출력 순서도 입력과 무관하게
  return { cards, weak_dialogue_claims, ambiguous_order: ambiguous };
}

/**
 * 표기 변경도 ① 의 특수형이다. lexicon 이 서로 다른 이름 두 개를 같은 개체로 묶었을 때만 쓴다.
 * 등록된 별칭(유진혁/진혁)은 표기 변경이 아니므로 여기 넣지 않는다.
 */
export function namingStatesFromMentions(
  entity_id: string,
  mentions: { name: string; episode: number; pos: number; surface: string; branch: string }[],
): StoredState[] {
  return mentions.map((m, i) => ({
    id: `naming:${entity_id}:${i}`, entity_id, attribute: "표기", attribute_key: "naming", value: m.name, value_raw: m.name,
    branch: m.branch, episode: m.episode, pos: m.pos, certainty: "explicit", claimed_in_dialogue: false, speaker_id: null, exclusive: true, status: "observed", surface: m.surface,
  }));
}
