/**
 * AI 호출 앞에 서는 마개. **판정만 한다 — 조회도 차감도 여기서 안 한다.**
 *
 * 세션 6 §12 `가` 가 여섯 세션째 살아 있던 자리다. 세션 11 §8-1 이 그것을
 * `가-1`(킬스위치·사용자 한도)과 `가-2`(지출 상한) 둘로 갈랐다.
 *
 * ```
 * 적혀 있는 것과 걸리는 것은 다르다     daily_spend_cap_usd 20 을 읽는 코드가 없었다
 * ```
 *
 * 이 파일이 순수한 이유는 둘이다.
 *   1  verify.ts 가 순수 Node 에서 병을 물릴 수 있다. server-only 를 import 하면 못 한다
 *   2  '무엇을 보고 막았는가' 가 값 하나로 나온다. 조회와 섞으면 그게 안 보인다
 *
 * ★ 함수가 나뉜 이유. `consume_ai_quota` 는 **부작용**이다(하루 사용량을 1 올린다).
 *   킬스위치가 닫힌 채로 차감하면 일어나지도 않은 호출에 사용자 하루치가 깎인다.
 *   그래서 차감 앞의 마개 셋을 먼저 재고, 차감은 그 뒤에 한 번 잰다.
 *
 * ★★ **첫 호출자는 route.ts 가 아니라 하니스다.** 2순위가 요구하는 172건 1회 ·
 *   10건 5회 · 경계 36건은 라우트를 안 탄다. 그러니 세션 6 §12 의
 *   `안 켜고 붙이면 무제한 호출이다` 는 라우트가 아니라 **여기** 걸린다 —
 *   172 호출이 프로덕션보다 많다.
 *
 *   그래서 세션 11 §8-1 의 미결 `하니스 경로 A·B·C` 를 **C 로 닫는다.**
 *     A  검증용 계정 하나        하루 한도가 검증 한 번에 다 나간다
 *     B  옆으로 돈다             ★ 킬스위치가 안 걸린다. 하니스가 게이트를 안 타면 이게 B 다
 *     C  옆으로 돌되 자기 상한    킬스위치도 지출 상한도 user_id 가 필요 없다  ← 이것
 *
 *   두 경로가 같은 마개 셋을 공유하고, 넷째만 다르다.
 *     라우트   api_key → kill_switch → spend_cap → quota      (사용자별 하루 호출 수)
 *     하니스   api_key → kill_switch → spend_cap → run_cap    (이 실행의 호출 수)
 */

/** 어느 마개에 걸렸는가. 순서가 이 배열의 순서다. */
export const GATE_RULES = ['api_key', 'kill_switch', 'spend_cap', 'quota', 'run_cap'] as const
export type GateRule = (typeof GATE_RULES)[number]

export type GateDecision =
  | { allow: true }
  | { allow: false; rule: GateRule; detail: string }

const ALLOW: GateDecision = { allow: true }
const deny = (rule: GateRule, detail: string): GateDecision => ({ allow: false, rule, detail })

export interface PreQuotaFacts {
  /** GEMINI_API_KEY 가 있는가. 없으면 호출 자체가 못 선다 */
  hasApiKey: boolean
  /**
   * system_flags.kill_switch. **null 은 '못 읽었다' 이지 false 가 아니다.**
   * 못 읽었으면 막는다 — 마개를 못 읽은 채로 호출하면 마개가 없는 것과 같다.
   */
  killSwitch: boolean | null
  /**
   * system_flags.daily_spend_cap_usd. null 이면 막는다.
   * ★ 상한이 없는 것과 상한이 무한인 것을 가르지 않는다. 둘 다 마개가 아니다.
   */
  dailySpendCapUsd: number | null
  /**
   * 오늘 ai_usage_log 의 sum(cost_usd). null 은 '못 읽었다' 다.
   * 얼마 썼는지 모르면서 상한을 지킬 수는 없다 — 막는다.
   */
  spentTodayUsd: number | null
}

/**
 * 차감 앞의 마개 셋.
 *
 * 전부 **닫는 쪽으로 기운다.** 못 읽은 값은 통과가 아니라 차단이다.
 * 세션 11 §8-1 의 `20 은 한도가 아니다 — 적혀 있을 뿐이다` 가 이 규칙의 근거다.
 * 반대로 두면 flags 조회가 조용히 0행을 낼 때 마개가 통째로 사라진다.
 */
export function checkGateBeforeQuota(f: PreQuotaFacts): GateDecision {
  if (!f.hasApiKey) return deny('api_key', 'GEMINI_API_KEY 없음')

  if (f.killSwitch === null) return deny('kill_switch', 'kill_switch 를 못 읽었다')
  if (f.killSwitch) return deny('kill_switch', 'kill_switch 가 켜져 있다')

  if (f.dailySpendCapUsd === null) return deny('spend_cap', 'daily_spend_cap_usd 를 못 읽었다')
  if (f.spentTodayUsd === null) return deny('spend_cap', '오늘 지출을 못 읽었다')
  if (f.spentTodayUsd >= f.dailySpendCapUsd) {
    return deny('spend_cap', `오늘 ${f.spentTodayUsd} >= 상한 ${f.dailySpendCapUsd}`)
  }

  return ALLOW
}

/**
 * `consume_ai_quota(p_user, p_limit)` 의 결과 하나만 본다.
 *
 * remaining 이 null 이면 RPC 가 던졌거나 못 읽은 것이다 — 막는다.
 * 0 이하는 오늘치를 다 쓴 것이다.
 */
export function checkQuota(remaining: number | null): GateDecision {
  if (remaining === null) return deny('quota', '한도 차감에 실패했다')
  if (remaining < 0) return deny('quota', `오늘 한도를 다 썼다 (${remaining})`)
  return ALLOW
}

/**
 * 하니스의 넷째 마개 — `C` 의 `자기 상한` 이다.
 *
 * 사용자 한도는 `p_user uuid` 를 받는데 회귀 검증에는 사용자가 없다. 그 자리를
 * 이 함수가 메운다. **이 실행 안에서 나간 호출 수만 센다.**
 *
 * ★ 하니스는 이걸 **호출마다** 재야 한다. 한 번 재고 반복문에 들어가면 그것이
 *   세션 12 §6 의 `루프에 걸린 호출` 이다. 지출 상한도 같다 — 호출이 돈을 태우면
 *   다음 호출 앞의 사실이 달라진다.
 */
export function checkRunBudget(callsMade: number, runCap: number): GateDecision {
  if (!Number.isFinite(runCap) || runCap <= 0) return deny('run_cap', `상한이 수가 아니다 (${runCap})`)
  if (callsMade >= runCap) return deny('run_cap', `이 실행의 상한 ${runCap} 을 채웠다`)
  return ALLOW
}

/**
 * 넷을 한 번에 잰다. **어느 호출자도 이걸 쓰지 않는다** — 넷째가 부작용 뒤에
 * 오기 때문이다. 검사가 순서를 한 자리에서 물려고 둔다.
 */
export function checkGate(f: PreQuotaFacts & { quotaRemaining: number | null }): GateDecision {
  const pre = checkGateBeforeQuota(f)
  if (!pre.allow) return pre
  return checkQuota(f.quotaRemaining)
}

/**
 * 사용자 하루 호출 수 상한(`consume_ai_quota` 의 `p_limit`).
 *
 * ★ **비용으로 정한 수가 아니다.** 설계안 8-3 이 쟀다 — 20 USD/일은 이 프롬프트
 *   기준으로 하루 수천~수만 호출이다. 상한에 닿으려면 동시 사용자가 수백 명이어야
 *   한다. 그러니 이 수는 **남용 방지 수치**다. 세션 11 §8-1 의 사슬
 *   (`호출 1회 비용 × 사용자 수 <= 20`)은 그래서 끊겼다.
 *
 * 40 인 이유: 10단계 문항이 8건이고, 한 문항을 다섯 번 고쳐 내면 40이다.
 * 하루에 그보다 많이 내는 것은 학습이 아니라 루프다. **근거는 그것뿐이다** —
 * 재서 나온 수가 아니라 정한 수이니, 실사용 분포가 생기면 다시 정하라.
 *
 * ★ 지금 이 수를 넘기는 코드가 없다. `route.ts` 가 붙을 때 쓴다 — 10단계가
 *   `hybrid` 로 가는 때다. 그때까지는 하니스가 `checkRunBudget` 을 쓴다.
 */
export const DAILY_CALL_LIMIT = 40
