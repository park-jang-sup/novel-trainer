/**
 * lib/setting/store.ts — 저장소로 들어가기 전의 물질화 규칙. verify 의 buildStore 와 나중 저장소 어댑터가 같이 쓴다.
 *
 * 관계 → 상태 (세션 55 ①-4)
 *   "김태진 -소속-> 베나토르" 는 관계이면서 김태진의 상태(소속=베나토르)이기도 하다. 모델이 어느 쪽으로 내든
 *   검사 ① 은 상태만 보므로, 술어가 attributes.ts 동의어표에 **있는** 관계는 상태로도 물질화한다.
 *   사람이 객체인 관계(스승·부모·동료·연인…)는 상태가 아니다 — 객체 개체의 kind 가 character 면 제외한다.
 *   술어가 동의어표에 없으면(짝사랑·약속…) 관계로만 남는다. 조용히 넓히지 않기 위해 표에 있는 것만.
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

export interface EntityRow {
  id: string;
  name: string;
  kind: string;
}

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
  /** 어느 관계에서 왔는지 — 화면이 "관계에서 온 상태" 로 표시할 수 있게 */
  from_relation: true;
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
      from_relation: true,
    });
  }
  return out;
}
