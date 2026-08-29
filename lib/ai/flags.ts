import 'server-only'
import { createAdminClient } from '../supabase/admin'

/**
 * 마개가 볼 사실을 DB 에서 읽어 온다. **판정은 안 한다** — gate.ts 가 한다.
 *
 * ★ `system_flags` 는 **단일 행이 아니라 key/value 다.** 조회로 확인했다.
 *
 * ```
 * key                   value
 * daily_spend_cap_usd   20
 * kill_switch           false
 * ```
 *
 * 세션 11 §8-1 이 `system_flags.kill_switch` 로 적어서 컬럼처럼 읽혔고, 이
 * 세션도 처음에 단일 행으로 짰다. 그대로 커밋했으면 조회가 늘 0행을 내서
 * **마개가 항상 deny** 가 됐을 것이다. 그건 안전하게 죽는 것이 아니라
 * 아무도 못 쓰는 것이다. 세션 12 §5 계보에 얹는다 —
 * `문서의 표기와 테이블의 모양은 다르다`.
 */

/** value 컬럼의 타입을 모른다(text 인지 jsonb 인지). 둘 다 받는다. */
function asBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    if (v === 'true') return true
    if (v === 'false') return false
  }
  return null
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v)
    return v.trim() !== '' && Number.isFinite(n) ? n : null
  }
  return null
}

export interface SystemFlags {
  killSwitch: boolean | null
  dailySpendCapUsd: number | null
}

/**
 * 두 깃발을 읽는다. **못 읽은 것은 null 로 낸다 — 기본값으로 채우지 않는다.**
 * 여기서 `kill_switch ?? false` 를 쓰면 조회가 죽은 날 마개가 통째로 열린다.
 */
export async function readFlags(): Promise<SystemFlags> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('system_flags')
    .select('key, value')
    .in('key', ['kill_switch', 'daily_spend_cap_usd'])

  if (error) {
    logPgError('system_flags select', error)
    return { killSwitch: null, dailySpendCapUsd: null }
  }

  const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]))
  return {
    killSwitch: byKey.has('kill_switch') ? asBoolean(byKey.get('kill_switch')) : null,
    dailySpendCapUsd: byKey.has('daily_spend_cap_usd')
      ? asNumber(byKey.get('daily_spend_cap_usd'))
      : null,
  }
}

/**
 * 오늘 태운 돈. **null 은 0 이 아니라 '못 읽었다' 다.**
 *
 * 하루의 경계는 UTC 로 잡는다. `created_at` 이 timestamptz 이고, 로컬 자정으로
 * 잡으면 배포 지역이 바뀔 때 상한이 조용히 하루 두 번 열린다.
 * ★ 사용자 한도(`ai_quota`)는 자기 날짜 규칙을 갖는다. 둘을 맞추지 않았다 —
 *   지출 상한은 지갑을 지키고 사용자 한도는 남용을 막는 서로 다른 마개다.
 *
 * ★★ `created_at` 이 **nullable 이다**(조회로 확인). 그런 행은 `gte` 필터에
 *   안 걸려 합계에서 **조용히 빠진다** — 덜 센 합계로 재는 상한은 상한이 아니다.
 *   그래서 null 인 행을 오늘로 **친다.** 더 세는 쪽으로 틀리면 마개가 일찍
 *   닫힐 뿐이고, 덜 세는 쪽으로 틀리면 마개가 없어진다.
 *   `cost_usd` 도 nullable 이라 같은 자리다 — 아래가 null 을 만나면 합계 대신
 *   null 을 낸다(값을 못 매긴 호출에 돈이 나갔다는 뜻이니 멈추는 게 맞다).
 */
function todayFilter() {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  // ★ 밀리초를 뗀다. PostgREST 의 `or=()` 안에서 값은 점(.)으로 갈리는 자리다.
  //   `...T00:00:00.000Z` 는 점을 하나 더 갖고 있어 파서에 걸릴 여지가 있다.
  //   초 단위여도 하루 경계를 재는 데 아무 손해가 없다.
  const iso = since.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return `created_at.is.null,created_at.gte.${iso}`
}

/**
 * 오류를 통째로 낸다. `code` 하나만 찍으면 무엇이 왔는지 모른다 —
 * 실제로 `code=undefined message=` 만 보고 권한인지 문법인지 못 갈랐다.
 */
export function logPgError(
  where: string,
  e: { code?: string; message?: string; details?: string; hint?: string }
) {
  console.error(
    `${where} failed`,
    'code=' + (e.code || '(없음)'),
    'message=' + (e.message || '(없음)'),
    'details=' + (e.details || '(없음)'),
    'hint=' + (e.hint || '(없음)')
  )
  if (e.code === '42501') {
    console.error('  ★ 42501 은 권한이다. seed_schema.sql 을 DB 에 다시 적용해라 —')
    console.error('    파일만 고쳐서는 안 걸린다. grant 는 DB 에 가야 걸린다.')
    if ((e.message || '').includes('sequence')) {
      console.error('    ★★ 시퀀스다. 테이블 권한과 다른 객체다:')
      console.error('       grant usage, select on sequence public.ai_usage_log_id_seq to service_role;')
    }
  }
}

export async function sumSpendTodayUsd(): Promise<number | null> {
  const admin = createAdminClient()

  const { data, error } = await admin.from('ai_usage_log').select('cost_usd').or(todayFilter())

  if (error) {
    logPgError('ai_usage_log select', error)
    return null
  }

  // numeric 은 supabase-js 가 문자열로 줄 수 있다. 숫자로 못 읽는 행이 하나라도
  // 있으면 합계가 아니라 null 을 낸다 — 덜 센 합계로 상한을 재면 상한이 아니다.
  let sum = 0
  for (const row of data ?? []) {
    const n = asNumber((row as { cost_usd: unknown }).cost_usd)
    if (n === null) {
      console.error('ai_usage_log.cost_usd 를 숫자로 못 읽었다', row)
      return null
    }
    sum += n
  }
  return sum
}

/**
 * 오늘 행 수. 비용이 아니라 **쓰기가 실제로 도착했는지**를 보려고 센다.
 * 하니스의 예비 검사가 이 수가 하나 느는지로 insert 를 확인한다 —
 * `$0` 짜리 표시 행은 합계를 안 움직여서 합계로는 못 본다.
 *
 * ★★ **`head: true` 를 쓰지 않는다.** HEAD 응답은 본문이 없어서, 오류가 나도
 *   PostgREST 가 실어 보내는 `{code, message, details, hint}` 가 통째로
 *   사라진다. 실제로 `code=undefined message=` 만 나왔고, 그래서 권한(42501)
 *   인지 필터 문법(400)인지를 못 갈랐다.
 *
 *   ★ `검사가 통과한 채로 비는 자리` 의 사촌이다 — 이쪽은 **오류가 오는데
 *     내용이 없다.** 몸통을 안 받는 최적화가 진단을 통째로 지웠다.
 *     `limit(1)` 로 몸통을 최소로 두되 **받기는 받는다.** count 는 어차피
 *     Content-Range 헤더로 오므로 limit 이 세는 수를 안 줄인다.
 */
export async function countTodayRows(): Promise<number | null> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('ai_usage_log')
    .select('id', { count: 'exact' })
    .or(todayFilter())
    .limit(1)

  if (error) {
    logPgError('ai_usage_log count', error)
    return null
  }
  return count ?? null
}
