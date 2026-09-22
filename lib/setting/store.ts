/**
 * lib/setting/store.ts — 저장소로 들어가기 전의 물질화 규칙. verify 의 buildStore 와 나중 저장소 어댑터가 같이 쓴다.
 *
 * 관계 → 상태 (세션 55 ①-4)
 *   "김태진 -소속-> 베나토르" 는 관계이면서 김태진의 상태(소속=베나토르)이기도 하다. 모델이 어느 쪽으로 내든
 *   검사 ① 은 상태만 보므로, 술어가 attributes.ts 동의어표에 **있는** 관계는 상태로도 물질화한다.
 *   사람이 객체인 관계(스승·부모·동료·연인…)는 상태가 아니다 — 객체 개체의 kind 가 character 면 제외한다.
 *   술어가 동의어표에 없으면(짝사랑·약속…) 관계로만 남는다. 조용히 넓히지 않기 위해 표에 있는 것만.
 *
 * 전이 → 상태 (세션 55 ②-0)
 *   "유진혁.보유 스킬 null→쾌속" 같은 transition 은 그 위치에서 after 값이 관찰된 것과 같다. 모델이 상태 대신
 *   전이로만 내는 실행(run2)이 있어서, subject·attribute·after 가 다 있는 transition 은 그 위치에 상태로도 물질화한다.
 *   같은 위치의 전이가 그 상태를 설명하므로 검사 ① 이 이 상태를 "설명 없는 변화" 로 잡지 않는다(P11).
 *   before 만 있는 전이(상실)는 상태를 만들지 않는다 — ①′ 가 보는 자리다.
 */
import { isKnownAttribute } from "./attributes";

export interface RelationRow {
  subject_id: string;
  predicate: string;
  object_id: string;
  branch: string;
  episode: number;
  pos: number;
  surface: string;
  claimed_in_dialogue: boolean;
}

export interface TransitionRow {
  kind: "transition" | "occurrence";
  subject_id: string | null;
  /** 원문 속성명. attribute_key 는 toStoredState 가 만든다 */
  attribute: string | null;
  after: string | null;
  branch: string;
  episode: number;
  pos: number;
  surface: string;
}

export interface EntityRow {
  id: string;
  name: string;
  kind: string;
}

export type MaterializedSource = "from_relation" | "from_transition";

/** toStoredState 에 바로 넣을 수 있는 꼴. id 는 호출자가 붙인다. */
export interface MaterializedState {
  entity_id: string;
  attribute: string;
  value: string;
  branch: string;
  episode: number;
  pos: number;
  certainty: "explicit";
  claimed_in_dialogue: boolean;
  speaker_id: null;
  exclusive: false;
  status: "observed";
  surface: string;
  /** 어디서 왔는지 — 화면이 "관계/전이에서 온 상태" 로 표시할 수 있게 */
  source: MaterializedSource;
}

export function materializeRelationStates(relations: RelationRow[], entities: EntityRow[]): MaterializedState[] {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const out: MaterializedState[] = [];
  for (const r of relations) {
    if (!isKnownAttribute(r.predicate)) continue;
    const obj = byId.get(r.object_id);
    if (!obj || obj.kind === "character") continue;
    out.push({
      entity_id: r.subject_id, attribute: r.predicate, value: obj.name, branch: r.branch, episode: r.episode, pos: r.pos,
      certainty: "explicit", claimed_in_dialogue: r.claimed_in_dialogue, speaker_id: null, exclusive: false, status: "observed", surface: r.surface,
      source: "from_relation",
    });
  }
  return out;
}

export function materializeTransitionStates(events: TransitionRow[]): MaterializedState[] {
  const out: MaterializedState[] = [];
  for (const e of events) {
    if (e.kind !== "transition" || !e.subject_id || !e.attribute || e.after == null || e.after.trim() === "") continue;
    out.push({
      entity_id: e.subject_id, attribute: e.attribute, value: e.after, branch: e.branch, episode: e.episode, pos: e.pos,
      certainty: "explicit", claimed_in_dialogue: false, speaker_id: null, exclusive: false, status: "observed", surface: e.surface,
      source: "from_transition",
    });
  }
  return out;
}
