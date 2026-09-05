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
  /**
   * 답안과 무관한 기준만. detail이 "123자 / 135자 이하"라면 rule은 "135자 이하".
   * 선택 필드로 두지 않는다 — rule?: string이면 빼먹어도 타입이 통과해
   * 화면에 빈 줄로 나가도 아무도 못 본다. gradeLocal이 유일한 출처다.
   */
  rule: string
  evidence?: string[] // 걸린 근거. UI에서 그대로 보여준다
  gating?: boolean // true면 fail 시 AI를 호출하지 않는다
  /**
   * forbidWords 검사 전용 표시 데이터. scoring_config.forbidDisplay 를 그대로
   * 옮긴다. 있으면 rule 은 범주 한 줄(forbidLabel)이고, 화면은 그 아래에
   * '예: …' 로 이 배열의 앞 몇 개만 보이고 펼치면 전체를 보여준다. 없으면
   * rule 이 목록 전체다(지금까지). 채점(evidence)과는 무관하다 — 표시만이다.
   */
  examples?: string[]
}

export type ProblemType =
  | 'remove'
  | 'convert'
  | 'continue'
  | 'choice'
  | 'order'
  | 'coinage'
  | 'count'
  | 'fill'

export type ScoringMode = 'auto' | 'ai' | 'hybrid'

// 사칙연산만 허용한다. 문자열 수식을 두지 않으므로 평가할 것이 없다.
export type CountOp = 'multiply' | 'add' | 'subtract' | 'divide'

export interface CountInput {
  key: string
  label: string
  min: number
  max: number
}

// fill 유형. 고정 줄 사이에 뚫린 빈칸 하나. 재설계안 11-3장.
//
// 자유 서술형(remove/convert)의 검사를 빈칸 단위로 재사용한다 — 새 축을
// 만들지 않는다. minSentences/maxSentences 만 fill 전용이고, 그것도
// 형태소 없이 종결부호로 센다(local.ts countSentences).
export interface BlankSpec {
  key: string // 지문에 박히는 표식. '①' '②' 처럼 한 글자
  label: string // 무엇이 들어가는지. 화면과 rule 에 그대로 나간다
  /** 최소 문장 수. 종결부호로 센다. 기본 1 */
  minSentences?: number
  /** 최대 문장 수. "한 문장에서 두 문장" 조건이 이걸로 내려온다 */
  maxSentences?: number
  minChars?: number // 공백 제외
  maxChars?: number // 공백 제외
  /** true 면 비워도 통과. 7-10-2 '가'(①이 없음)를 살린다 */
  optional?: boolean
}

export interface ScoringConfig {
  maxChars?: number
  minChars?: number
  maxLineChars?: number // 한 줄 최대 글자수. 공백 제외. 형태소 필요 없음
  minLines?: number // 형태소 필요 없음
  maxLines?: number // 형태소 필요 없음
  maxDuplicateLines?: number
  // 중복 때문에 늘어난 줄 수의 상한. lines.length - new Set(lines).size
  // 줄마다 거는 상한이 아니다. "각 줄을 딱 두 번씩" 쓰는 답안을 잡으려면
  // 답안 전체에서 세야 한다. 형태소 불필요.
  /** 한 줄 안에서 같은 어절이 몇 번까지 나올 수 있는가.
   *  maxDuplicateLines는 줄 단위라 한 줄 안을 못 본다. */
  maxLineWordRepeat?: number
  /** 이 중 하나가 마지막 줄에 있는가. 줄은 '\n'으로 나눈 진짜 줄이다.
   *  requireAny와 목록이 같으면 requireAny는 탐지에 아무것도 더하지 않는다
   *  (마지막 줄은 본문의 부분 문자열이므로 이 검사가 통과하면 requireAny도
   *  반드시 통과한다). 화면에 두 단계로 알려 주려고 남기는 것이지
   *  두 검사가 각각 잡는 것이 아니다. 형태소 필요 없음 */
  requireInLastLine?: string[]
  //
  // 아래 넷은 줄이 아니라 따옴표 쌍을 센다 — Lines를 붙이지 않는다.
  // minLines·maxLines·maxLineChars·maxDuplicateLines는 전부 '\n'으로 나눈
  // 진짜 줄을 세지만, 이 넷은 큰따옴표/작은따옴표 쌍의 개수·글자수·위치를
  // 잰다. 같은 이름표가 두 단위를 가리키면 scoring_config를 읽는 사람이
  // 속는다. 형태소 필요 없음.
  /** 큰따옴표 쌍의 개수 하한. 대사가 몇 개인가 */
  minSpeeches?: number
  /** 작은따옴표 쌍의 개수 하한. 독백이 몇 개인가 */
  minMonologues?: number
  /** 독백 하나의 최소 글자수(공백 제외). 빈 독백을 막는다 */
  minMonologueChars?: number
  /** 독백이 첫 대사와 마지막 대사 사이에 있는가. 문자 인덱스로 잰다 */
  requireMonologueBetween?: boolean
  /** 대사도 독백도 아닌 줄의 수 상한. 서술이 대사를 밀어내지 않게 한다 */
  maxNarrationLines?: number
  maxAdverbs?: number // 부사(MAG/MAJ)만. 형태소 필요
  maxModifiers?: number // 관형형(ETM/MM)만. 형태소 필요
  minVerbs?: number // 형태소 필요
  maxProperNouns?: number // 고유명사(NNP)만. 형태소 필요
  maxRepeat?: number
  /**
   * 문항별로 지정한 낱말이 답안에 몇 번까지 나와도 되는가. 형태소가 아니라
   * 답안 문자열에서 그 낱말이 나온 횟수를 그대로 센다 — 형태소 서버의
   * maxRepeat 가 못 세는 한 음절 반복(박·물·간)을 규칙으로 잡는다(4단계).
   */
  repeatTargets?: { word: string; max: number }[]
  forbidWords?: string[] // 어간 매칭
  forbidLemmas?: string[] // "보/VV" 형식. 형태소 필요
  /**
   * 표시 전용. 채점은 forbidWords/forbidLemmas 가 그대로 한다 — 이 둘은 안 본다.
   * forbidLabel   금지어 범주 한 줄. 예: '분노를 직접 말하는 표현'
   * forbidDisplay 학습자에게 보여줄 기본형 묶음. 예: ['화나다','분노','짜증', …]
   * 둘이 함께 있으면 화면의 규칙 줄이 forbidLabel + '예: …'(펼치면 전체)로 바뀐다.
   * 없으면 forbidWords 목록을 그대로 보여준다(다른 단계 안 깨짐).
   * verify 가 forbidDisplay 의 각 기본형이 forbidWords/forbidLemmas 에 실재하는지 문다.
   */
  forbidLabel?: string
  forbidDisplay?: string[]
  requireAny?: string[]
  /** requireAny 의 복수형 — 나열된 낱말이 전부 있어야 통과(구성 12 대비 캐릭터).
   *  부분 문자열 includes 라, 일반명사와 겹치는 이름('하늘')은 sky 를 쓴 것만으로
   *  충족되는 누수가 있다(관찰 항목 — 규칙으로 안 막는다). */
  requireAll?: string[]
  /** 답안(공백 제거)이 원문 전체(같은 정규화)를 부분 문자열로 포함하면 fail.
   *  무난한 원문 단계(lack·contrast_char)의 '원문 복사 + 이름' 뚫기를 막는다
   *  (세션 32 후기 박 님 실증). 원문 일부 유지가 정상인 remove 계열엔 쓰지 마라
   *  — opt-in 전용. gradeLocal 에 원문을 넘겨야 판정한다(config 가 아니라 인자). */
  forbidPassageCopy?: boolean
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
  // fill — 재설계안 11-3장
  /** 뚫린 빈칸의 목록. 채점은 빈칸마다 위 줄 검사를 재사용한다 */
  blanks?: BlankSpec[]
  /** 지문의 고정 줄 원문. forbidCopyOfFixedLines 가 이것과 대조한다.
   *  gradeLocal 에는 passage 가 안 들어오므로 config 가 실어 나른다.
   *  시드가 지문에서 뽑아 채운다 */
  fixedLines?: string[]
  /** 빈칸에 앞뒤 고정 줄을 그대로 베끼면 fail. cue_copied 관측을
   *  규칙으로 내린 것이다(재설계안 11-3장) */
  forbidCopyOfFixedLines?: boolean
  /**
   * AI 섀도 판정을 붙일 것인가. 'support' 면 규칙 판정이 pass 일 때
   * 결정타 빌드업(2-3 verifySupportJudgment)을 매긴다 — **섀도 모드다.**
   * submissions.is_passed·진도와 무관하다(세션 40, 세션 32 섀도 모드 원칙).
   * 지금 값은 'support' 하나뿐이지만 문자열 유니온으로 열어 둔다 — 보스
   * 문항이 다른 섀도 종류를 쓸 수 있다.
   */
  ai_shadow?: 'support'
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
  blanks?: Record<string, string> // fill 유형. 빈칸 key → 채운 글
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
