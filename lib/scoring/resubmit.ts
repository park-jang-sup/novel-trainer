/**
 * 재제출 비교 피드백(세션 52). **규칙 검사만 쓴다 — AI·DB 안 탄다.** 직전
 * 제출과 이번 제출의 checks 를 비교해 "이번엔 무엇이 나아졌는가" 한 줄을
 * 짓는다. 결정적이라 "근거 줄이 생겼어"가 사실임을 코드가 보증한다(AI
 * 관측 비교는 판정선을 넘은 뒤에 얹는다 — 지금은 안 한다).
 *
 * ★ 나빠진 것(pass→fail)은 말하지 않는다 — 미달 목록에 이미 보인다.
 * ★ pending→pass 는 말하지 않는다 — 형태소 서버가 꺼졌다 켜진 것이지
 *   학습자가 고친 게 아니다.
 */
import type { Check } from './types'

/**
 * curr 를 **배열 순서 그대로** 훑으며, 같은 key 의 prev 가 'fail' 이고
 * curr 가 'pass' 인 것만 모은다. 정렬하지 않는다 — checks 배열 순서가
 * 화면 표시 순서이고, resubmitLine 이 그 순서의 "앞 둘"을 쓴다(박 님).
 *
 * ★ 세션 53 — key 가 같아도 **rule 이 같아야** 짝짓는다. submissions.
 *   auto_result 는 제출 시점의 판정이라 문항 설정이 바뀌면 과거 기록과
 *   현재 기준이 어긋난다(실측 — maxChars fail 45건 중 rp-kongjwi-jar
 *   11건이 34자 시절 기록인데 현재 설정은 68자다). rule 이 다르면 학습자가
 *   고쳐서 통과한 게 아니라 기준이 바뀐 것이므로 침묵한다. 이 대조는
 *   나중에 '자주 하는 실수'에도 그대로 필요하다(박 님).
 */
export function diffChecks(prev: Check[], curr: Check[]): Check[] {
  const prevByKey = new Map(prev.map((c) => [c.key, c]))
  const gained: Check[] = []
  for (const c of curr) {
    const p = prevByKey.get(c.key)
    if (p && p.rule === c.rule && p.status === 'fail' && c.status === 'pass') gained.push(c)
  }
  return gained
}

/**
 * 조각 문구. 단계마다 같은 key 의 뜻이 다르므로(requireAll 이 9단계에선
 * 인물 이름, 8단계에선 keyword, bt- 에선 다른 낱말이다) **검사의 뜻에 안
 * 기대는 중립 문구**로 쓴다.
 *
 * ★ 세션 52 조사 회피(1-A) — 변수(rule·label) 직후에 을/를/이/가를 안
 *   둔다. 변수 뒤는 늘 낱말(없이·조건을)이라 어떤 값이 와도 안 깨진다.
 *
 * forbidWords 만 예외다 — forbidLabel 이 문항마다 다르게 정확하다
 * ('sensory' 는 "눈에 기대는 표현", 'cliffhanger_adv' 는 "서술자가 미리
 * 말해 주거나 억지로 끊는 표현"). label 유무는 **호출부가 cfg.forbidLabel
 * 로 직접 넘긴다**(hasForbidLabel) — Check.rule 에 쉼표가 있는지로
 * 추측하지 않는다(forbidLabel 자체에 쉼표가 들어오면 그 휴리스틱이
 * 깨진다, 세션 52 2-A).
 *
 * ★ key 'passageCopy' 는 scoring_config.forbidPassageCopy 가 켜졌을 때
 *   local.ts 가 내는 실제 Check.key 다(설정 필드명과 다르다 — local.ts
 *   853행).
 */
function fragmentFor(check: Check, opts: { hasForbidLabel: boolean }): string {
  switch (check.key) {
    case 'maxChars':
    case 'minChars':
      return '길이를 맞췄어'
    case 'minSentences':
    case 'maxSentences':
      return '문장 수를 맞췄어'
    case 'requireAll':
    case 'requireAny':
      return '넣어야 할 말을 다 넣었어'
    case 'minVerbs':
      return '움직이는 말이 늘었어'
    case 'passageCopy':
      return '원문에 안 기댔어'
    case 'forbidWords':
      return opts.hasForbidLabel ? `${check.rule} 없이 썼어` : '쓰지 말라는 말을 안 썼어'
    default:
      return `${check.label} 조건을 맞췄어`
  }
}

/**
 * 조각을 이어 붙일 때 앞 조각을 연결형으로 바꾼다. 조각은 전부 '…어'로
 * 끝난다(맞췄어·넣었어·늘었어·기댔어·썼어) — 그냥 이으면 두 문장이 나란히
 * 선다. 앞 조각의 마지막 '어'를 '고'로 바꾸고 ", " 로 잇는다(세션 52 1-B).
 */
function toConnective(fragment: string): string {
  return fragment.endsWith('어') ? `${fragment.slice(0, -1)}고` : fragment
}

/**
 * gained 가 비어 있으면 null. **앞 두 개만** 쓴다(셋 이상이어도 — curr
 * 순서 그대로 온 배열의 처음 둘). 하나면 "이번엔 X." · 둘이면 "이번엔
 * X, Y."(앞 조각을 연결형으로 이어 한 문장으로 낸다).
 */
export function resubmitLine(gained: Check[], opts: { hasForbidLabel: boolean }): string | null {
  if (gained.length === 0) return null
  const top = gained.slice(0, 2)
  const fragments = top.map((c) => fragmentFor(c, opts))
  if (fragments.length === 1) return `이번엔 ${fragments[0]}.`
  return `이번엔 ${toConnective(fragments[0])}, ${fragments[1]}.`
}
