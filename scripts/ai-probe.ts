/**
 * AI 심사 하니스 — **게이트의 첫 호출자다.**
 *
 * 세션 11 §8-1 이 `하니스 경로 A·B·C — 안 정했다` 로 남긴 자리를 **C 로 닫는다.**
 *
 * ```
 * A  검증용 계정 하나        하루 한도가 검증 한 번에 다 나간다
 * B  옆으로 돈다             ★ 킬스위치가 안 걸린다 — 세션 6이 막으려던 것
 * C  옆으로 돌되 자기 상한    킬스위치도 지출 상한도 user_id 가 필요 없다   ← 이것
 * ```
 *
 * ★ **하니스가 게이트를 안 타면 그게 B 다.** 172 호출은 프로덕션보다 많다.
 *   세션 6 §12 의 `안 켜고 붙이면 무제한 호출이다` 는 라우트가 아니라 여기 걸린다.
 *
 * 지금 이 스크립트가 하는 일은 설계안 5장의 **4번(10건 실비)** 이다.
 * 172건을 돌리기 전에 열 건만 돌려서 `usageMetadata` 를 읽는다 —
 * `thinkingLevel` 은 토큰 수를 보장하는 값이 아니라 지침이라, 설계안 8장의
 * `$0.21` 은 바닥값이다. 10 호출이면 최악에도 $0.04 다. 안 재고 172 를
 * 돌릴 이유가 없다.
 *
 * ```bash
 * npm run ai:probe -- --dry           # DB 도 네트워크도 안 탄다. 표본·프롬프트·틀 길이
 * npm run ai:probe -- --check         # 마개와 쓰기를 재고 멈춘다. Gemini 는 안 부른다
 * npm run ai:probe -- --n=10          # 실비 측정. 이것이 지금 할 일이다
 * GEMINI_THINKING_LEVEL=high npm run ai:probe -- --n=10   # 흔들림 축을 바꿔 잰다
 * ```
 *
 * ★ 층이 셋인 이유는 하나다. **돈이 나가기 전에 실패해야 한다.**
 *   `부르고 → insert 실패 → 멈춘다` 는 첫 호출이 이미 나간 뒤다.
 *
 * 인자: `--n` 건수 · `--cap` 이 실행의 자기 상한 · `--model` · `--out`
 *       `--dry`(오프라인) · `--check`(마개까지)
 * 환경: `GEMINI_API_KEY` · `GEMINI_THINKING_LEVEL` · `AI_PROBE_USER_ID`(필요하면)
 *
 * ★ `--conditions=react-server` 가 필요하다(package.json 이 준다). gemini.ts 와
 *   flags.ts 가 `server-only` 를 문다 — 그 표시를 떼지 않는다. 여기는 서버다.
 */
// ★ 이 import 가 맨 앞이어야 한다. 아래 모듈들이 불릴 때 process.env 가
//   이미 채워져 있어야 한다 — gemini.ts 는 로드 시점에 env 를 읽는다.
import './load-env'
import { writeFileSync } from 'node:fs'
import { AT_ITEMS, AT_D2_EXTRA, passageOf } from '../lib/scoring/fixtures/action-turn'
import { buildPrompt, fourLines, PROMPT_FRAME_CHARS } from '../lib/ai/prompt'
import { observeWith, type ObserveOutcome } from '../lib/ai/observe'
import { callGemini, DEFAULT_MODEL, THINKING_LEVEL } from '../lib/ai/gemini'
import { checkGateBeforeQuota, checkRunBudget } from '../lib/ai/gate'
import { countTodayRows, logPgError, readFlags, sumSpendTodayUsd } from '../lib/ai/flags'
import { createAdminClient } from '../lib/supabase/admin'
import { PRICES, PROMO_ENDS } from '../lib/ai/pricing'

interface Case {
  sourceKey: string
  difficulty: 1 | 2
  /** 'good' 이면 오탐 표본, 그 밖은 뚫기 갈래 이름. **레인 이름이다** */
  kind: string
  /** 갈래 안의 세부 이름. 전용 뚫기는 지문마다 이름이 다르다 */
  detail: string
  passage: string
  element: string
  text: string
}

/**
 * 표본. **goods 와 known 을 섞고 known 은 갈래마다 하나씩** 넣는다(설계안 5장 2번).
 * 좋은 답안만 뽑으면 fail 쪽 흔들림을 못 본다.
 *
 * ★ 순서를 섞지 않는다. 회차마다 같은 표본이어야 흔들림을 잰다.
 */
function buildCases(): Case[] {
  const out: Case[] = []
  for (const item of AT_ITEMS) {
    const passage = passageOf(item)
    const base = { sourceKey: item.sourceKey, difficulty: item.difficulty, passage, element: item.element }
    // 좋은 답안은 지문마다 첫 건. 짧게 끊은 마지막 줄이 섞여 있는 표본이다.
    if (item.goods[0]) out.push({ ...base, kind: 'good', detail: 'good', text: item.goods[0] })
    for (const b of item.bypasses) {
      if (b.known) out.push({ ...base, kind: b.key, detail: b.key, text: b.text })
    }
    // ★ 전용 뚫기는 지문마다 이름이 다르다(복선(오른팔) · 복선(이빨) …).
    //   그대로 두면 레인이 넷으로 쪼개져 10건 중 넷을 전용이 가져간다.
    //   갈래로는 하나다 — 설계안 2-4 가 `전용 복선미사용 4건` 으로 한 덩이로 센다.
    const extra = AT_D2_EXTRA[item.sourceKey]
    if (extra) out.push({ ...base, kind: '전용 복선미사용', detail: extra.key, text: extra.text })
  }
  return out
}

/** 갈래가 골고루 들어가게 앞에서부터 n 건을 고른다 — 한 지문에 몰리지 않게 라운드로빈. */
function pick(cases: Case[], n: number): Case[] {
  const byKind = new Map<string, Case[]>()
  for (const c of cases) {
    const list = byKind.get(c.kind) ?? []
    list.push(c)
    byKind.set(c.kind, list)
  }
  const lanes = [...byKind.values()]
  const out: Case[] = []
  for (let i = 0; out.length < n && i < 100; i++) {
    for (const lane of lanes) {
      if (out.length >= n) break
      if (lane[i]) out.push(lane[i])
    }
  }
  return out
}

const arg = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const flag = (name: string) => process.argv.includes(`--${name}`)

/**
 * 쓰기 예비 검사. **첫 호출 전에** 한다.
 *
 * ★ 지출을 못 적으면 상한이 아니다. 그런데 `부르고 → insert 실패 → 멈춘다` 는
 *   **첫 호출이 이미 나간 뒤**다. 돈은 나가고 기록은 안 남는다. 그 실패를
 *   앞으로 당긴다.
 *
 * 표시 행 하나를 넣고 오늘 행 수가 하나 느는지 본다. 이 한 번으로 넷이 갈린다.
 *
 * ```
 * select 권한       세션 13 §4-2 가 고친 자리. 없으면 42501
 * insert 권한       마찬가지
 * user_id 의 not null   조회로는 nullable 이었다. 코드로 다시 확인한다
 * created_at 기본값     ★ 이 컬럼도 nullable 이다. 기본값이 없으면 null 이 들어가고
 *                      그런 행은 날짜 필터에 안 걸려 합계에서 빠진다
 * ```
 *
 * service_role 에 delete 권한이 없어 표시 행은 지우지 못한다. **남긴다** —
 * `cost_usd = 0` 이라 상한을 안 움직이고, `model='preflight'` 로 구분된다.
 * 지우는 권한을 주는 것보다 못 지우는 행 하나가 낫다.
 */
async function preflightWrite(): Promise<boolean> {
  const admin = createAdminClient()

  const before = await countTodayRows()
  if (before === null) {
    console.error('★ ai_usage_log 를 못 읽는다. 지출 상한이 설 수 없다.')
    console.error('  seed_schema.sql 의 grant select, insert on public.ai_usage_log 를 확인해라.')
    return false
  }

  const { error } = await admin.from('ai_usage_log').insert({
    user_id: process.env.AI_PROBE_USER_ID ?? null,
    submission_id: null,
    model: 'preflight',
    input_tokens: 0,
    cached_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
  })
  if (error) {
    console.error('★ ai_usage_log 에 못 적는다. 호출하기 전에 멈춘다.')
    logPgError('ai_usage_log insert', error)
    console.error('  23502(not null)면 AI_PROBE_USER_ID 를 주고 다시 돌려라.')
    return false
  }

  const after = await countTodayRows()
  if (after === null) return false
  if (after !== before + 1) {
    // 넣었는데 오늘로 안 세어진다. created_at 기본값이 없을 때 이렇게 된다 —
    // 그러면 진짜 호출의 비용도 합계에서 빠지고, 상한이 조용히 사라진다.
    console.error(`★ 넣은 행이 오늘 합계에 안 잡힌다 (${before} → ${after}).`)
    console.error('  ai_usage_log.created_at 의 기본값을 확인해라. 상한이 못 선다.')
    return false
  }

  console.log(`예비 검사 통과 — 오늘 행 ${before} → ${after}`)
  return true
}

async function main() {
  const dry = flag('dry')
  const check = flag('check')
  const n = Number(arg('n', '10'))
  const model = arg('model', DEFAULT_MODEL)
  const out = arg('out', 'ai-probe.json')
  /** 이 실행의 자기 상한. C 의 `자기 상한` 이 이 수다. n 보다 크게 두지 않는다. */
  const runCap = Number(arg('cap', String(n)))

  const all = buildCases()
  const cases = pick(all, n)

  console.log(`표본 전체 ${all.length}건 중 ${cases.length}건`)
  console.log(`틀 ${PROMPT_FRAME_CHARS}자 · 모델 ${model} · thinking ${THINKING_LEVEL} · 이 실행 상한 ${runCap}회`)
  if (!PRICES[model]) {
    console.log(`★ 단가표에 없는 모델이다. 비용이 null 로 나간다 — pricing.ts 에 넣어라`)
  } else {
    console.log(`★ 단가는 프로모다. ${PROMO_ENDS} 이후 두 배 — pricing.ts`)
  }
  console.log(cases.map((c) => `  ${c.sourceKey} 난${c.difficulty} ${c.detail}`).join('\n'))

  // ── --dry : DB 도 네트워크도 안 탄다 ─────────────────────────────────
  // ★ 자격 없이 도는 것이 이 층의 값어치다. README 의 상태 확인이 이걸 쓴다.
  if (dry) {
    console.log('\n--- 프롬프트 한 건 ---')
    const c = cases[0]
    const lines = fourLines(c.text)
    console.log(lines ? buildPrompt({ passage: c.passage, lines, element: c.element }) : '★ 네 줄이 아니다')
    console.log('\n--dry 다. DB 도 Gemini 도 안 탔다. 마개까지 재려면 --check 다.')
    return
  }

  // 무엇이 있고 무엇이 없는지를 이름으로 낸다. `자격이 없다` 한 줄로는
  // '파일이 없다' 와 '읽는 코드가 없다' 를 못 가른다 — 실제로 그 둘을 헷갈렸다.
  const need = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = need.filter((k) => !process.env[k])
  console.log(
    '\nenv  ' +
      [...need, 'GEMINI_API_KEY']
        .map((k) => `${k}=${process.env[k] ? '있음' : '없음'}`)
        .join(' · ')
  )
  if (missing.length > 0) {
    console.error(`★ DB 자격이 없다: ${missing.join(' · ')}`)
    console.error('  .env.local 에 넣어라. 이 스크립트가 그 파일을 읽는다(scripts/load-env.ts).')
    console.error('  자격 없이 볼 것은 --dry 다.')
    process.exit(1)
  }

  // ── --check : 마개와 쓰기를 재고 멈춘다. Gemini 는 안 부른다 ──────────
  // ★ 이 층이 있는 이유. `부르고 → insert 실패 → 멈춘다` 는 첫 호출이 이미
  //   나간 뒤다. 돈은 나가고 기록은 안 남는다. 그 실패를 앞으로 당긴다.
  const flags = await readFlags()
  console.log(`\nflags  kill_switch=${flags.killSwitch} cap=${flags.dailySpendCapUsd}`)
  if (!(await preflightWrite())) process.exit(1)

  const gate = checkGateBeforeQuota({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    killSwitch: flags.killSwitch,
    dailySpendCapUsd: flags.dailySpendCapUsd,
    spentTodayUsd: await sumSpendTodayUsd(),
  })
  console.log(gate.allow ? '마개 통과 — 부를 수 있다' : `막혔다 [${gate.rule}] ${gate.detail}`)

  if (check) {
    console.log('\n--check 다. Gemini 는 안 불렀다.')
    return
  }
  if (!gate.allow) process.exit(1)

  const admin = createAdminClient()

  const results: (Case & { outcome: ObserveOutcome })[] = []
  let calls = 0

  for (const c of cases) {
    // ★ 마개를 호출마다 다시 잰다. 한 번 재고 반복문에 들어가면 그것이
    //   세션 12 §6 의 `루프에 걸린 호출` 이다. 앞 호출이 돈을 태웠으면
    //   다음 호출 앞의 사실이 달라져 있다.
    const spent = await sumSpendTodayUsd()
    const pre = checkGateBeforeQuota({
      hasApiKey: !!process.env.GEMINI_API_KEY,
      killSwitch: flags.killSwitch,
      dailySpendCapUsd: flags.dailySpendCapUsd,
      spentTodayUsd: spent,
    })
    if (!pre.allow) {
      console.log(`\n막혔다 [${pre.rule}] ${pre.detail}  — ${calls}회에서 멈춘다`)
      break
    }
    const budget = checkRunBudget(calls, runCap)
    if (!budget.allow) {
      console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`)
      break
    }

    const lines = fourLines(c.text)
    if (!lines) {
      // 규칙이 이미 4줄을 걸렀어야 한다. 여기 오면 그게 규칙의 구멍이다.
      console.log(`★ ${c.sourceKey}/${c.detail} 가 네 줄이 아니다. 건너뛴다 — 규칙을 봐라`)
      continue
    }

    const outcome = await observeWith(callGemini, { passage: c.passage, lines, element: c.element }, model)
    calls++

    // ★ 돈을 태웠으면 **먼저 적는다.** 관측이 깨졌어도 토큰은 나갔다.
    //   못 적으면 다음 호출 앞의 상한이 틀린다 — 그 순간 마개가 아니다.
    if (outcome.usage) {
      const { error } = await admin.from('ai_usage_log').insert({
        user_id: process.env.AI_PROBE_USER_ID ?? null,
        submission_id: null,
        model: outcome.model,
        input_tokens: outcome.usage.inputTokens,
        cached_tokens: outcome.usage.cachedTokens,
        output_tokens: outcome.usage.outputTokens,
        cost_usd: outcome.costUsd,
      })
      if (error) {
        console.error('\n★ ai_usage_log 에 못 적었다. 지출을 못 세면 상한이 아니다 — 멈춘다.')
        logPgError('ai_usage_log insert', error)
        console.error('  user_id 가 not null 이면 AI_PROBE_USER_ID 를 주고 다시 돌려라.')
        results.push({ ...c, outcome })
        break
      }
    }

    results.push({ ...c, outcome })
    const u = outcome.usage
    console.log(
      `${String(calls).padStart(3)} ${c.sourceKey}/${c.detail}  ` +
        `in=${u?.inputTokens ?? '-'} cache=${u?.cachedTokens ?? '-'} out=${u?.outputTokens ?? '-'} ` +
        `$${outcome.costUsd ?? '-'}  ${outcome.ok ? 'ok' : '★ ' + outcome.error}`
    )
    if (!outcome.ok && outcome.detail) console.log(`      ${outcome.detail}`)
    if (!outcome.ok && outcome.raw) console.log(`      raw: ${outcome.raw.slice(0, 200)}`)

    // ★ 첫 호출부터 못 나가면 뒤를 더 돌릴 이유가 없다. 열 번 같은 오류를
    //   찍는 대신 멈춘다 — 부분 실패와 설정 실패를 가르는 자리다.
    if (outcome.error === 'call_failed' && calls === 1) {
      console.log('\n★ 첫 호출부터 못 나갔다. 설정 문제다 — 뒤를 안 돌린다.')
      break
    }
  }

  // ── 요약. 설계안 8장을 정정할 수 있는 수는 이 넷이다 ──────────────────
  const withUsage = results.filter((r) => r.outcome.usage)
  const totalCost = withUsage.reduce((s, r) => s + (r.outcome.costUsd ?? 0), 0)
  const avgIn = withUsage.reduce((s, r) => s + r.outcome.usage!.inputTokens, 0) / (withUsage.length || 1)
  const avgOut = withUsage.reduce((s, r) => s + r.outcome.usage!.outputTokens, 0) / (withUsage.length || 1)
  const parsed = results.filter((r) => r.outcome.ok).length

  console.log(`\n호출 ${calls} · 관측 선 것 ${parsed} · 실비 $${totalCost.toFixed(6)}`)
  console.log(`평균 입력 ${avgIn.toFixed(0)} 토큰 · 평균 출력 ${avgOut.toFixed(0)} 토큰(생각 포함)`)
  if (withUsage.length > 0) {
    const per = totalCost / withUsage.length
    console.log(`1회 $${per.toFixed(6)} → 172건 $${(per * 172).toFixed(4)} · 172×3 $${(per * 516).toFixed(4)}`)
    console.log(`★ 이 수를 설계안 8장에 박아라. 지금 그 자리의 $0.21 은 예측이다`)
  }

  writeFileSync(out, JSON.stringify(results, null, 2))
  console.log(`관측을 ${out} 에 적었다 — T 가 정해지면 다시 안 돌리고 다시 센다`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
