/**
 * lib/setting/schema.ts — 회차 원고 → 설정집 추출 결과의 계약.
 *
 * 이 스키마는 LLM 구조화 출력(JSON 스키마 강제)과 서버 후처리가 공유한다.
 *   - LLM 은 `ExtractionRaw` 를 낸다. 문자 오프셋은 내지 않는다 (LLM 은 오프셋을 못 센다).
 *   - 서버가 `surface` 를 원고에서 찾아 `span` 을 붙인다 (locate.ts). 못 찾으면 그 항목은 폐기.
 *   - 폐기까지 끝난 것이 `Extraction` 이고, 이것만 저장소에 들어간다.
 *
 * 원칙 (설계 v1 §3):
 *   2  버리지 않는다      → unclassified 가 스키마의 1급 필드
 *   4  작가 말로 보여준다  → 모든 값에 surface
 *   5  판정 못 한 것을 숨기지 않는다 → excluded / unanchored 를 결과에 남긴다
 *   6  LLM 은 읽고 코드가 판단한다 → 이 스키마에 "충돌" 필드는 없다. 충돌은 conflicts.ts 가 만든다
 *
 * zod v4 (novel-trainer 와 동일). Gemini 에 넘길 JSON 스키마는 z.toJSONSchema(ExtractionRaw) 로 만든다.
 */
import { z } from "zod";

// ───────────────────────── 공통 ─────────────────────────

/** LLM 이 내는 근거. surface 는 원고에 **문자 그대로** 있어야 한다. */
export const EvidenceRaw = z.object({
  surface: z.string().min(2).max(200),
});

/** 서버가 위치를 붙인 근거. */
export const Evidence = EvidenceRaw.extend({
  episode: z.number().int().positive(),
  span: z.object({ start: z.number().int().nonnegative(), end: z.number().int().positive() }),
  scene: z.number().int().nonnegative(),
  /** 같은 surface 가 원고에 몇 번 나오는가. 2 이상이면 위치가 모호하다 — coverage 로 드러낸다 (리뷰 P7). */
  occurrences: z.number().int().positive(),
});

/** 갈래. 회귀물이면 main / pre_regression, 회상은 flashback. 자유 문자열이되 UI 는 3개까지. */
export const Branch = z.string().min(1).max(40);

/**
 * 아래 `.describe()` 는 z.toJSONSchema 를 거쳐 모델에게 간다 — TS 주석은 안 간다.
 * 원고의 이름·값은 넣지 않는다(베끼기 방지). 모델이 실제로 틀릴 자리만 적는다.
 */
export const EntityKind = z.enum([
  "character",     // 인물
  "organization",  // 조직·팀·기관
  "place",         // 지명
  "structure",     // 탑·던전처럼 장소이면서 개체인 것
  "item",          // 물건·무기
  "skill",         // 스킬·능력·마법
  "term",          // 그 밖의 작품 고유 용어
  "creature",      // 종족·몬스터
]).describe("character 인물 / organization 조직·팀·기관 / place 지명 / structure 장소이면서 개체인 것(탑·던전류) / item 물건 / skill 스킬·능력·마법 / term 그 밖의 고유 용어 / creature 종족·몬스터. 스킬·조직을 character 로 두지 않는다");

const REF = "entities 의 ref";

/** 참고 앱(스노우플레이크 계열)의 세계 카테고리를 그대로 기본값으로 쓴다. */
export const RuleCategory = z.enum([
  "history", "economy", "politics", "religion",
  "geography_physics", "culture", "inhabitants", "magic",
  "system",   // 상태창·탑·게임 문법처럼 세계의 운영 규칙
  "other",
]);

// ───────────────────────── 개체 ─────────────────────────

export const EntityRaw = z.object({
  /** 이 회차 안에서만 유효한 임시 id. 저장 시 lexicon 과 대조해 실제 id 로 바뀐다. */
  ref: z.string().min(1).max(40).describe("이 회차 안에서만 쓰는 임시 id. 같은 개체는 모든 항목에서 같은 ref"),
  kind: EntityKind,
  name: z.string().min(1).max(60),
  aliases: z.array(z.string().min(1).max(60)).default([]),
  /** 한 줄. 원고에서 드러난 것만. */
  summary: z.string().max(200).nullable().default(null),
  first_mention: EvidenceRaw,
});

// ───────────────────────── 상태 ─────────────────────────

/**
 * LLM 은 값을 **문자열로만** 낸다. 숫자화·단위 제거는 서버(attributes.ts)가 한다.
 * union 타입은 JSON 스키마에서 type:[...] 가 되어 provider 가 못 받을 수 있다 (리뷰 I).
 */
export const StateRaw = z.object({
  entity: z.string().describe(REF),      // EntityRaw.ref
  /** 속성명은 개방형. 작가가 쓴 말을 우선한다: 나이·소속·거주지·무기·스킬·직업·외모·성격… */
  attribute: z.string().min(1).max(40),
  value: z.string().min(1).max(120).describe("문자열. 원고 표현에 가깝게. 단, 유추한 숫자(나이 등)는 숫자로 적는다"),
  branch: Branch,
  /** explicit: 원고가 직접 말함. inferred: 원고의 표현에서 도출 (예: "생일 지난 나이라 합법적으로 술" → 19). */
  certainty: z.enum(["explicit", "inferred"]),
  /** 대사 속 주장이면 true. 제외하지 않고 약하게 본다 (리뷰 G). 발화자가 주체 본인이면 정상 비교. */
  claimed_in_dialogue: z.boolean().default(false),
  /** 대사면 발화자 ref. 지문이면 null. */
  speaker: z.string().nullable().default(null).describe(`대사 속 값이면 발화자의 ${REF}. 지문이면 null`),
  /** 집합 속성(스킬·무기)에서 "이것뿐이다" 를 원고가 말했으면 true — "내가 가진 유일한 스킬". */
  exclusive: z.boolean().default(false).describe("원고가 이 값뿐이라고 말했을 때만 true (유일한, 하나밖에)"),
  evidence: EvidenceRaw,
});

// ───────────────────────── 사건 ─────────────────────────

export const EventRaw = z.object({
  /** transition: 어떤 개체의 상태를 바꾼다. occurrence: 세계에 일어난 일 (시간선 후보). */
  kind: z.enum(["transition", "occurrence"]),
  description: z.string().min(2).max(120),
  branch: Branch,
  /** transition 일 때만. 무엇의 무엇이 어떻게 바뀌었나. */
  subject: z.string().nullable().default(null).describe(`transition 일 때 상태가 바뀐 개체의 ${REF}. occurrence 면 null`),
  attribute: z.string().max(40).nullable().default(null),
  before: z.string().max(120).nullable().default(null),
  after: z.string().max(120).nullable().default(null),
  /** occurrence 가 시간 도약이면 년 수: "3년 후" → 3, "이듬해" → 1. 나이 변화를 사건 없이 설명한다 (리뷰 H). */
  elapsed_years: z.number().nonnegative().nullable().default(null).describe("시간 도약 사건일 때만. '3년 후' → 3"),
  evidence: EvidenceRaw,
});

// ───────────────────────── 관계 ─────────────────────────

export const RelationRaw = z.object({
  subject: z.string().describe(REF),     // ref
  /** 스승·부모·거주·소속·동료·연인·적… 개방형. */
  predicate: z.string().min(1).max(40),
  object: z.string().describe(REF),      // ref
  branch: Branch,
  claimed_in_dialogue: z.boolean().default(false),
  evidence: EvidenceRaw,
});

// ───────────────────────── 규칙 ─────────────────────────

export const RuleRaw = z.object({
  category: RuleCategory,
  /** 작가 말에 가깝게 한 문장. 검사기가 읽는 형식(formal)은 나중에 작가/코드가 붙인다. */
  statement: z.string().min(2).max(200),
  /** 특정 개체에 걸린 제약이면 그 ref. 세계 전체면 null. */
  scope: z.string().nullable().default(null).describe(`특정 개체에만 걸린 제약이면 그 개체의 ${REF}. 세계 전체면 null`),
  branch: Branch,
  evidence: EvidenceRaw,
});

// ───────────────────────── 장면 ─────────────────────────

export const SceneRaw = z.object({
  ord: z.number().int().nonnegative(),
  /** 장면 첫 문장의 앞부분. 서버가 이걸로 경계를 잡는다. */
  opening: EvidenceRaw,
  branch: Branch,
  /** 이 장면의 이야기 시간. null 이면 "시간 미확정" 으로 coverage 에 남는다. */
  anchor: z.object({
    event: z.string().min(2).max(120).describe("events 중 occurrence 의 description 과 같은 문구"),
    relation: z.enum(["before", "after", "during"]),
  }).nullable().default(null),
  /** 시점 인물. 1인칭 '나' 가 누구인지 여기서 결정된다. */
  pov: z.string().nullable().default(null).describe(`시점 인물의 ${REF}`),   // ref
  summary: z.string().max(120),
});

// ───────────────────────── 시간선 ─────────────────────────

export const TimelineRaw = z.object({
  label: z.string().min(1).max(60),
  branch: Branch,
  /** 같은 갈래 안의 상대 순서. 확신 없으면 null. */
  order_hint: z.number().int().nullable().default(null),
  evidence: EvidenceRaw,
});

// ───────────────────────── 버리지 않는 것 ─────────────────────────

/** 구조에 못 넣었지만 설정으로 보이는 문장. 가장 가까운 개체에 메모로 붙는다. */
export const UnclassifiedRaw = z.object({
  surface: z.string().min(2).max(200),
  attach_to: z.string().nullable().default(null),  // ref
  note: z.string().max(120).nullable().default(null),
});

/** 설정으로 읽힐 수 있었지만 의도적으로 뺀 것. 사람이 "왜 안 잡았나" 를 볼 수 있게 남긴다. */
export const ExcludedRaw = z.object({
  surface: z.string().min(2).max(200),
  reason: z.enum([
    "hypothetical",     // "~했다면", "~할 수 있었을", 가정·소망
    "dialogue_claim",   // 대사 속 주장 (별도로 claimed_in_dialogue 로도 남김)
    "metaphor",         // 비유·수사
    "narrator_opinion", // 화자의 추측·평가
    "unit_noise",       // 세기·세대·개월처럼 단위가 다른 숫자
  ]),
});

// ───────────────────────── 최상위 ─────────────────────────

export const ExtractionRaw = z.object({
  episode: z.number().int().positive(),
  narrator: z.object({
    person: z.enum(["first", "third", "mixed"]),
    entity: z.string().nullable().default(null).describe(`1인칭 '나' 인 인물의 ${REF}. 3인칭이면 null`),  // ref — 1인칭이면 필수에 가깝다
  }),
  branches: z.array(z.object({
    id: Branch.describe("입력에 이미 있는 갈래 id 를 그대로 쓴다. 새 갈래만 짧은 영문 id 로 짓는다"),
    label: z.string().max(40),
  })).min(1),
  scenes: z.array(SceneRaw).min(1),
  entities: z.array(EntityRaw),
  states: z.array(StateRaw),
  events: z.array(EventRaw),
  relations: z.array(RelationRaw),
  rules: z.array(RuleRaw),
  timeline: z.array(TimelineRaw),
  unclassified: z.array(UnclassifiedRaw),
  excluded: z.array(ExcludedRaw),
});
export type ExtractionRaw = z.infer<typeof ExtractionRaw>;

/** locate.ts 를 거친 뒤의 형태. Evidence 에 span/scene/episode 가 붙고, 못 찾은 항목은 dropped 로 옮겨진다. */
export const Extraction = ExtractionRaw.extend({
  entities: z.array(EntityRaw.extend({ first_mention: Evidence })),
  states: z.array(StateRaw.extend({ evidence: Evidence })),
  events: z.array(EventRaw.extend({ evidence: Evidence })),
  relations: z.array(RelationRaw.extend({ evidence: Evidence })),
  rules: z.array(RuleRaw.extend({ evidence: Evidence })),
  timeline: z.array(TimelineRaw.extend({ evidence: Evidence })),
  scenes: z.array(SceneRaw.extend({
    opening: Evidence,
    span: z.object({ start: z.number().int(), end: z.number().int() }),
  })),
  /** 폐기한 항목과 사유. surface_not_found: 근거가 원고에 없음. orphan_ref: 폐기된 개체를 가리킴. 개수가 coverage 에 들어간다. */
  dropped: z.array(z.object({
    table: z.enum(["entities", "states", "events", "relations", "rules", "timeline", "scenes"]),
    surface: z.string(),
    reason: z.enum(["surface_not_found", "orphan_ref"]),
  })),
});
export type Extraction = z.infer<typeof Extraction>;

/** 설계 v1 §6-6 의 coverage. 매 회차 결과에 반드시 붙는다. */
export const Coverage = z.object({
  scenes_total: z.number().int(),
  scenes_unanchored: z.number().int(),
  states_inferred: z.number().int(),
  states_claimed_in_dialogue: z.number().int(),
  dropped_surface_not_found: z.number().int(),
  /** 근거 surface 가 원고에 2회 이상 나와 위치가 모호한 항목 수 (P7) */
  ambiguous_surface: z.number().int(),
  /** 폐기된 개체를 가리켜 함께 버려진 상태·관계 수 — 조용히 버리지 않는다 (리뷰 I) */
  orphan_ref: z.number().int(),
  /** 같은 개체에서 키가 갈린 유사 속성명 쌍 수 (P2) */
  similar_attributes_unmerged: z.number().int(),
  /** 값을 숫자로 바꾸지 못한 number 속성 상태 수 ("열댓 살") */
  values_unparsed: z.number().int(),
  excluded: z.number().int(),
  unclassified: z.number().int(),
});
export type Coverage = z.infer<typeof Coverage>;
