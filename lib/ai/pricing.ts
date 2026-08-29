/**
 * 단가표와 비용 계산.
 *
 * 설계안 8-2 가 `단가는 2차 출처에서 읽은 것이고 공식 페이지가 아니다. 켤 때 다시
 * 확인하라` 고 적었다. 켜면서 확인했다 — 아래 값은 전부 공식 페이지에서 왔다.
 *   https://ai.google.dev/gemini-api/docs/pricing   (확인 2026-08-30)
 *
 * ★ **비용을 예측하려고 두는 표가 아니다.** 세션 11 §8-1 이 정한 대로
 *   `ai_usage_log.cost_usd` 에 **잰 값**을 적으려고 둔다. 호출이 끝난 뒤
 *   usageMetadata 가 준 토큰 수에 이 표를 곱한다. 예측이 아니라 환산이다.
 *
 * ★★ 출력 단가는 **생각 토큰(thinking)을 포함한다.** 공식 표의 항목 이름이
 *    `Output price (including thinking tokens)` 다. 설계안 8-1 이 출력을
 *    `JSON 한 줄 · ~100 토큰` 으로 잡은 것은 생각 토큰을 모르고 잡은 값이다.
 *    gemini-3.7-flash 의 기본 thinking 은 `medium` 이다 — 그대로 두면 출력이
 *    100 토큰에서 끝나지 않는다. gemini.ts 가 `low` 로 내린다.
 *    ★ 그래도 $0.21 은 **바닥값이지 측정값이 아니다.** 진짜 수는 172건을
 *      돌린 뒤 ai_usage_log 가 준다. 0장 계보 셋째 — 예측한 것과 잰 것은 다르다.
 */

export interface ModelPrice {
  /** 100만 토큰당 USD */
  inputPerM: number
  outputPerM: number
  /** 캐시 적중 입력. 지금은 캐싱을 안 켠다(설계안 8-3) — 0 이 아니라 값을 둔다 */
  cachedInputPerM: number
  /** 이 단가가 언제까지인가. 지나면 사람이 갱신해야 한다 */
  note: string
}

/**
 * ★ 프로모 단가다. **2027-01-01 에 두 배가 된다.**
 *   3.7/3.6 Flash: $0.75/$3.75/$0.075 → $1.50/$7.50/$0.15
 *   날짜가 지나면 이 표가 조용히 절반을 덜 센다. `PROMO_ENDS` 가 그것을 잡는다.
 */
export const PROMO_ENDS = '2026-12-31'

export const PRICES: Record<string, ModelPrice> = {
  // 설계안 9장이 고른 등급. Flash 하나로 먼저 재고, 못 잡으면 Pro 로 올린다.
  'gemini-3.7-flash': {
    inputPerM: 0.75,
    outputPerM: 3.75,
    cachedInputPerM: 0.075,
    note: `프로모 ${PROMO_ENDS} 까지. 이후 1.50 / 7.50 / 0.15`,
  },
  'gemini-3.6-flash': {
    inputPerM: 0.75,
    outputPerM: 3.75,
    cachedInputPerM: 0.075,
    note: `프로모 ${PROMO_ENDS} 까지. 이후 1.50 / 7.50 / 0.15`,
  },
  // 설계안 8-2 가 나란히 잰 나머지 둘. 등급을 바꿀 때 쓴다.
  'gemini-3.5-flash-lite': {
    inputPerM: 0.3,
    outputPerM: 2.5,
    cachedInputPerM: 0.03,
    note: '프로모 아님',
  },
  'gemini-3.1-pro-preview': {
    inputPerM: 2.0,
    outputPerM: 12.0,
    cachedInputPerM: 0.2,
    note: '200k 토큰 넘는 프롬프트는 4.00 / 18.00. 우리 프롬프트는 1.2천 자다',
  },
}

export interface TokenUsage {
  /** 캐시 적중분을 **포함한** 총 입력 토큰. usageMetadata.promptTokenCount 가 그렇다 */
  inputTokens: number
  cachedTokens: number
  /** 생각 토큰을 포함한 출력 토큰 */
  outputTokens: number
}

/**
 * 잰 토큰 수를 달러로 환산한다.
 *
 * 모르는 모델이면 null 을 낸다. **0 을 내지 않는다** — 0 을 내면 지출 상한이
 * 모델 이름 하나 바뀐 것만으로 통째로 새고, 아무도 모른다. 세션 11 §8-1 의
 * `적혀 있는 것과 걸리는 것은 다르다` 가 그 자리다.
 */
export function costUsd(model: string, u: TokenUsage): number | null {
  const p = PRICES[model]
  if (!p) return null

  // promptTokenCount 는 캐시 적중분을 포함한다. 캐시분은 싼 단가로 따로 센다.
  const fresh = Math.max(0, u.inputTokens - u.cachedTokens)
  const usd =
    (fresh * p.inputPerM + u.cachedTokens * p.cachedInputPerM + u.outputTokens * p.outputPerM) /
    1_000_000

  // ai_usage_log.cost_usd 는 numeric 이다. 소수 여덟 자리면 1회 호출도 안 사라진다.
  return Math.round(usd * 1e8) / 1e8
}
