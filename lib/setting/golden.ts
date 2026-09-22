/**
 * lib/setting/golden.ts — 골든(fixtures/prelim_ep1-2.golden.json)의 계약.
 *
 * 골든은 손으로 쓰는 문서다. 그래서 더 엄격하게 읽는다 — strictObject 라 키 오타는 로드 시점에 죽는다.
 * `attribute_any` 를 `attribute_amy` 로 잘못 적으면 지금까지는 그 항목이 조용히 "조건 없음" 이 되어 통과했다.
 * 그것도 "빈 결과를 통과로 읽는" 종류라 여기서 막는다. `_why` `_what` `_comment` 는 사람용 메모라 허용한다.
 */
import { z } from "zod";

const Value = z.union([z.string(), z.number()]);
const Why = z.string().optional();

export const EntityRequired = z.strictObject({
  name: z.string(),
  kind: z.string().optional(),
  /** kind 가 둘 중 하나여도 되는 자리(소원권: item/term). kind 와 kind_any 중 하나는 있어야 한다 */
  kind_any: z.array(z.string()).min(1).optional(),
  aliases_any: z.array(z.string()).min(1).optional(),
}).refine((q) => q.kind !== undefined || q.kind_any !== undefined, { message: "kind 또는 kind_any 가 필요하다" });

export const EntityForbiddenKind = z.strictObject({
  name: z.string(),
  not_kind: z.string(),
});

/** states_required 와 states_forbidden 이 같은 꼴을 쓴다. 조건이 없는 키는 묻지 않는다. */
export const StateQuery = z.strictObject({
  _why: Why,
  entity: z.string(),
  attribute_any: z.array(z.string()).min(1),
  value: Value.optional(),
  value_contains: z.string().optional(),
  value_min: z.number().optional(),
  branch: z.string().optional(),
  episode: z.number().int().positive().optional(),
  certainty: z.enum(["explicit", "inferred"]).optional(),
  exclusive: z.boolean().optional(),
  surface_contains: z.string().optional(),
  /** 근거 문장이 여러 후보 중 하나면 된다 — 모델이 같은 사실을 다른 문장으로 잡는 자리(질풍·마강혁). 조건은 유지된다: 하나는 맞아야 한다 */
  surface_contains_any: z.array(z.string()).min(1).optional(),
});
export type StateQuery = z.infer<typeof StateQuery>;

export const EventQuery = z.strictObject({
  _why: Why,
  kind: z.enum(["transition", "occurrence"]).optional(),
  branch: z.string().optional(),
  episode: z.number().int().positive().optional(),
  subject: z.string().optional(),
  attribute_any: z.array(z.string()).min(1).optional(),
  description_contains_any: z.array(z.string()).min(1).optional(),
  before: Value.optional(),
  after: Value.optional(),
  surface_contains: z.string().optional(),
});
export type EventQuery = z.infer<typeof EventQuery>;

/** 판정은 주체·객체 + 근거 문장(surface_contains_any). 술어는 모델이 제 말로 짓는 자리라 info 로만 본다 (세션 55 ②) */
export const RelationRequired = z.strictObject({
  subject: z.string(),
  object: z.string(),
  surface_contains_any: z.array(z.string()).min(1),
  predicate_info: z.array(z.string()).min(1).optional(),
  episode: z.number().int().positive().optional(),
});

export const RuleRequired = z.strictObject({
  statement_contains_any: z.array(z.string()).min(1),
  /** 정보성. 카테고리가 여기 없어도 실패가 아니다 — 불일치 수만 찍는다 */
  category_info: z.array(z.string()).min(1).optional(),
  surface_contains: z.string().optional(),
  /** 근거 문장 후보 중 하나면 된다 — 모델이 같은 규칙을 다른 문장에서 잡는 자리 */
  surface_contains_any: z.array(z.string()).min(1).optional(),
});

/** 정보성. 모델이 무엇을 일부러 뺐는지는 보되, 못 뺐다고 실패로 삼지 않는다 */
export const ExcludedInfo = z.strictObject({
  surface_contains: z.string(),
  reason: z.string(),
});

export const ConflictCardRequired = z.strictObject({
  _why: Why,
  kind: z.enum(["state_change_without_event", "state_reappears_after_transition"]),
  /** 둘 중 하나는 있어야 한다. entity 는 개체 이름, entity_lexicon_merge_of 는 lexicon 이 묶었을 수 있는 이름들. */
  entity: z.string().optional(),
  entity_lexicon_merge_of: z.array(z.string()).min(1).optional(),
  attribute_any: z.array(z.string()).min(1),
  evidence_values: z.tuple([Value, Value]),
  weak: z.boolean().optional(),
}).refine((q) => q.entity !== undefined || q.entity_lexicon_merge_of !== undefined, { message: "entity 또는 entity_lexicon_merge_of 가 필요하다" });
export type ConflictCardRequired = z.infer<typeof ConflictCardRequired>;

export const Caps = z.strictObject({
  _why: Why,
  conflict_cards_max: z.number().int().nonnegative().optional(),
  dropped_max: z.number().int().nonnegative().optional(),
  orphan_ref_max: z.number().int().nonnegative().optional(),
  ambiguous_surface_max: z.number().int().nonnegative().optional(),
  similar_attributes_unmerged_max: z.number().int().nonnegative().optional(),
});

export const GoldenSchema = z.strictObject({
  _comment: z.string().optional(),
  narrator: z.strictObject({ person: z.enum(["first", "third", "mixed"]), entity_name: z.string() }),
  branches_min: z.array(z.string()).min(1),
  entities_required: z.array(EntityRequired),
  entities_forbidden_kind: z.array(EntityForbiddenKind).default([]),
  states_required: z.array(StateQuery),
  states_forbidden: z.array(StateQuery).default([]),
  events_required: z.array(EventQuery),
  events_forbidden: z.array(EventQuery).default([]),
  relations_required: z.array(RelationRequired).default([]),
  rules_required: z.array(RuleRequired).default([]),
  excluded_info: z.array(ExcludedInfo).default([]),
  unclassified_expected_min: z.number().int().nonnegative(),
  unclassified_examples: z.array(z.string()).default([]),
  scenes: z.strictObject({
    ep1_min: z.number().int().nonnegative(),
    ep2_min: z.number().int().nonnegative(),
    ep1_first_scene_branch: z.string(),
    /** 정보성. 시간 미확정 장면 비율을 찍기만 한다 — 앵커는 2단계(검사 ②) 몫이다 */
    unanchored_ratio_info: z.number().min(0).max(1).optional(),
  }),
  conflict_cards_required: z.array(ConflictCardRequired),
  caps: Caps.default({}),
  /** 정보성. verify 는 대조하지 않는다 — 있으면 꼴만 검사한다. */
  info_optional: z.array(z.strictObject({
    _what: z.string().optional(),
    surfaces: z.array(z.string()).min(1),
    expected_pair: z.tuple([z.string(), z.string()]).optional(),
  })).default([]),
  determinism: z.strictObject({
    runs: z.number().int().positive(),
    /** required_passed·conflict_card_keys 는 실패 조건. entities·states 는 대칭차를 info 로만 찍는다 (세션 55 ①-6) */
    must_equal: z.array(z.enum(["required_passed", "conflict_card_keys"])),
    info: z.array(z.enum(["entities", "states"])).default([]),
  }),
  /** 검출기 #0 기준선. 사람이 옆에 두고 보는 수치라 verify 는 읽지 않는다. */
  baseline_detector0: z.strictObject({
    _what: z.string().optional(),
    planted_errors: z.number().int(),
    detected: z.number().int(),
    violations: z.number().int(),
    proposed_additions_ep1: z.number().int(),
    proposed_additions_ep2: z.number().int(),
  }).optional(),
});
export type Golden = z.infer<typeof GoldenSchema>;
