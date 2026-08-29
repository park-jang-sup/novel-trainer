/**
 * 재시도 판단. **순수하다** — 기다리는 것도 부르는 것도 여기서 안 한다.
 *
 * ★ 503 은 우리 잘못이 아니고 **없앨 수도 없다.** `gemini-3.7-flash` 가
 *   몰리면 `This model is currently experiencing high demand` 가 온다.
 *   172건을 한 번 돌리면 그중 몇 건은 반드시 이걸 만난다. 재시도가 없으면
 *   **측정이 모델 혼잡도에 따라 찢어진다** — 그건 프롬프트를 재는 게 아니다.
 *
 * ★★ 재시도가 미검출을 만들지 않게 하는 것이 요점이다. 되는 것만 세고
 *   안 되는 것을 조용히 버리면 `관측 선 것 8/10` 이 프롬프트 탓처럼 보인다.
 *   그래서 **몇 번 만에 됐는지를 세서 실어 보낸다**(observe.ts 의 attempts).
 */

/** 다시 걸어 볼 값어치가 있는 응답인가. 그 밖은 즉시 포기한다. */
export const RETRYABLE_STATUS = [429, 500, 502, 503, 504] as const

/**
 * 던져진 것에서 상태 코드를 캔다.
 *
 * SDK 가 던지는 꼴이 한 가지가 아니다 — `Error.status` 로 오기도 하고,
 * 메시지가 통째로 `{"error":{"code":503,...}}` JSON 인 경우도 있다.
 * 실제로 후자였다. **그래서 메시지도 뒤진다.**
 */
export function statusOf(e: unknown): number | null {
  if (e && typeof e === 'object') {
    const o = e as { status?: unknown; code?: unknown; message?: unknown }
    if (typeof o.status === 'number') return o.status
    if (typeof o.code === 'number') return o.code
    if (typeof o.message === 'string') {
      try {
        const j = JSON.parse(o.message) as { error?: { code?: unknown } }
        if (typeof j?.error?.code === 'number') return j.error.code
      } catch {
        // JSON 이 아니면 숫자 세 자리를 찾는다. 마지막 수단이다.
        const m = /\b(4\d\d|5\d\d)\b/.exec(o.message)
        if (m) return Number(m[1])
      }
    }
  }
  return null
}

export function isRetryable(e: unknown): boolean {
  const s = statusOf(e)
  if (s === null) {
    // 상태를 못 캤다. 중단(abort)과 네트워크 끊김은 다시 걸어 볼 값어치가 있다.
    const msg = e instanceof Error ? e.message : String(e)
    return /abort|timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(msg)
  }
  return (RETRYABLE_STATUS as readonly number[]).includes(s)
}

/**
 * 몇 밀리초 쉬고 다시 걸까. `attempt` 는 0부터다.
 *
 * 지수로 늘리되 **흔들림(jitter)을 넣는다.** 172건이 같은 박자로 재시도하면
 * 몰린 모델을 우리가 더 민다. 상한 30초.
 */
export function backoffMs(attempt: number, rand: () => number = Math.random): number {
  const base = Math.min(30_000, 1_000 * 2 ** attempt)
  return Math.round(base * (0.5 + rand() * 0.5))
}
