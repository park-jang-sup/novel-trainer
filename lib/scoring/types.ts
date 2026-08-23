// 채점 결과 타입
//
// 핵심 설계: status에 'pending'이 있다.
// 형태소 분석 서버(4주차)가 아직 없거나 응답에 실패했을 때
// 검사를 조용히 통과시키면 3주차 테스트가 거짓 신호를 준다.
// 판정하지 못한 검사는 반드시 pending으로 남긴다.

export type CheckStatus = 'pass' | 'fail' | 'pending'

export interface Check {
  key: string
  label: string
  status: CheckStatus
  detail: string
  evidence?: string[] // 걸린 근거. UI에서 그대로 보여준다
  gating?: boolean // true면 fail 시 AI를 호출하지 않는다
}

export type ProblemType =
  | 'remove'
  | 'convert'
  | 'continue'
  | 'choice'
  | 'order'
  | 'coinage'
  | 'count'

export type ScoringMode = 'auto' | 'ai' | 'hybrid'

// 사칙연산만 허용한다. 문자열 수식을 두지 않으므로 평가할 것이 없다.
export type CountOp = 'multiply' | 'add' | 'subtract' | 'divide'

export interface CountInput {
  key: string
  label: string
  min: number
  max: number
}

export interface ScoringConfig {
  maxChars?: number
  minChars?: number
  maxLineChars?: number // 한 줄 최대 글자수. 공백 제외. 형태소 필요 없음
  minLines?: number // 형태소 필요 없음
  maxLines?: number // 형태소 필요 없음
  maxAdverbs?: number // 부사(MAG/MAJ)만. 형태소 필요
  maxModifiers?: number // 관형형(ETM/MM)만. 형태소 필요
  minVerbs?: number // 형태소 필요
  maxProperNouns?: number // 고유명사(NNP)만. 형태소 필요
  maxRepeat?: number
  forbidWords?: string[] // 어간 매칭
  forbidLemmas?: string[] // "보/VV" 형식. 형태소 필요
  requireAny?: string[]
  // coinage
  count?: number
  minLen?: number
  maxLen?: number
  distinctInitial?: boolean
  // order — 섞인 카드. 정답 sequence 의 숫자가 이 배열의 인덱스다
  cards?: string[]
  // count
  inputs?: CountInput[]
  op?: CountOp
}

export interface Problem {
  id: string
  type: ProblemType
  scoring_mode: ScoringMode
  scoring_config: ScoringConfig
}

// problem_answers.answer 의 형식. service_role만 읽는다.
export type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'order'; sequence: number[] }
  | { kind: 'count'; expected: number; tolerance: number }

// 사용자 제출물. 유형에 따라 담기는 것이 다르다.
export interface Submission {
  text?: string
  choiceIndex?: number
  order?: number[]
  values?: Record<string, number> // count 유형
}

// 형태소 분석 서버 응답
export interface MorphResult {
  adverbs: string[]
  modifiers: string[] // 관형형 수식어. 서버에서 계산해 내려준다
  verbs: string[]
  propers: string[]
  repeats: { word: string; count: number }[] // 표제어 기준. 서버가 계산한다
  lemmas: { lemma: string; tag: string; surface: string }[] // forbidLemmas 재료
  sentences: number
}

export interface GradeResult {
  checks: Check[]
  status: CheckStatus // 전체 판정
  blocked: boolean // gating 검사 실패 → AI 호출 금지
  needsAi: boolean
}
