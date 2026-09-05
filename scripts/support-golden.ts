/**
 * 결정타 빌드업 섀도(support-v2) 골든셋 하네스 — **게이트의 하니스 경로(C)** 를
 * 탄다. scripts/ai-probe.ts 와 같은 마개·예비쓰기 관례를 그대로 재사용한다
 * (세션 40) — 하니스가 게이트를 안 타면 그게 세션 6 §12 가 막으려던 'B' 다.
 *
 * 재는 것: 골든셋 판정이 문체가 아니라 빌드업을 재는가. 두 집합을
 * **분리 집계**한다 — 둘 다 오탐이 없어야 "빌드업을 재는 것"이라고 말할 수 있다.
 *
 *   set A  data/probe/ch10_decisive.json 의 9쌍(1인칭). good → 'buildup' 기대,
 *          nak → 'none' 기대. nak 은 good 의 정보 줄만 위치 제공형으로 바꾼
 *          통제 짝이라, 판정이 문체가 아니라 근거 유무를 재는지 가른다.
 *   set B  bt- 모범답안 10건(3인칭·good) → 'buildup' 기대. nak 자리는 비워
 *          둔다(다음 턴에 초안 5건 → 박 님이 거른다) — 형식은 set A 와 같다.
 *
 * 각 답안 5회 반복(흔들림을 재려면 5회가 최소다 — gemini.ts 의 THINKING_LEVEL
 * 주석과 같은 이유). **캐시는 기본 우회한다** — 캐시를 쓰면 5회가 사실 1회가
 * 된다. --use-cache 를 줘야 ai_shadow_cache 를 본다(실제 캐시 배선 자체를
 * 검증하고 싶을 때만).
 *
 * 이 하니스는 verifySupportJudgment 를 **재시도 없이 원본 그대로** 잰다 —
 * route.ts 의 재시도 1회는 프로덕션 판정을 세우는 것이고, 여기는 흔들림
 * 자체(같은 답안 5회가 얼마나 갈리는지)를 재는 자리라 스무딩하면 안 된다.
 *
 * ```bash
 * npx tsx scripts/support-golden.ts --dry            # DB·네트워크 없이 프롬프트 한 건
 * npx tsx scripts/support-golden.ts --check           # 마개와 쓰기만 재고 멈춘다
 * npx tsx scripts/support-golden.ts                   # 전 표본 5회 실행 (기본 안전 확인 절차)
 * npx tsx scripts/support-golden.ts --reps=1 --cap=20 # 값싸게 한 번만 훑어본다
 * ```
 *
 * 인자: `--reps`(반복 횟수, 기본 5) · `--cap`(이 실행의 자기 상한) · `--model` ·
 *       `--out` · `--dry` · `--check` · `--use-cache`
 * 환경: `GEMINI_API_KEY` · `GEMINI_THINKING_LEVEL` · `AI_PROBE_USER_ID`(필요하면)
 *
 * ★ `--conditions=react-server` 가 필요하다(package.json 이 npm script 로 준다).
 *   gemini.ts·flags.ts 가 `server-only` 를 문다 — 여기는 서버 하니스다.
 */
import './load-env'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { judgeSupportWith, type SupportOutcome } from '../lib/ai/observe'
import { verifySupportJudgment, PROMPT_VERSION_SUPPORT, type SupportVerdict } from '../lib/ai/prompt'
import { callGemini, DEFAULT_MODEL, THINKING_LEVEL } from '../lib/ai/gemini'
import { checkGateBeforeQuota, checkRunBudget } from '../lib/ai/gate'
import { countTodayRows, logPgError, readFlags, sumSpendTodayUsd } from '../lib/ai/flags'
import { createAdminClient } from '../lib/supabase/admin'
import { PRICES, PROMO_ENDS } from '../lib/ai/pricing'

interface Ch10Item {
  id: string
  gold: {
    good_answer: string
    nak_answer: string
    payoff_line: string
    beat_line: string
  }
}

interface RefRow {
  source_key: string
  ord: number
  blank_key: string
  content: string
}

interface Case {
  set: 'A' | 'B'
  itemId: string // ch10 item id 또는 bt- source_key(:ord)
  kind: 'good' | 'nak'
  text: string
}

/**
 * ch10 항목에 합성 problem_id 를 붙인다 — RFC4122 v5(namespace + name 의
 * sha1). uuid 패키지가 저장소에 없어(package.json 확인) 손으로 잰다. 이
 * 값은 DB 행을 안 가리킨다 — 하니스 결과 파일 안에서 항목을 안정적으로
 * 가리키는 이름표일 뿐이다(캐시 키에도 안 쓴다 — 캐시는 기본 우회다).
 */
const NAMESPACE = 'a1b2c3d4-0000-5000-8000-6e6f76656c74' // 고정. 바꾸면 이전 결과 파일과 이름표가 갈린다
function uuidv5(name: string, namespace: string): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex')
  const hash = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')])).digest()
  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function loadCases(): Case[] {
  const root = path.join(__dirname, '..')
  const ch10 = JSON.parse(
    readFileSync(path.join(root, 'data', 'probe', 'ch10_decisive.json'), 'utf8').replace(/^﻿/, '')
  ) as { items: Ch10Item[] }

  const out: Case[] = []
  for (const item of ch10.items) {
    out.push({ set: 'A', itemId: item.id, kind: 'good', text: item.gold.good_answer })
    out.push({ set: 'A', itemId: item.id, kind: 'nak', text: item.gold.nak_answer })
  }

  const answers = JSON.parse(
    readFileSync(path.join(root, 'seed', 'dump', 'answers.json'), 'utf8').replace(/^﻿/, '')
  ) as { reference?: RefRow[] }
  const bt = (answers.reference ?? []).filter((r) => r.source_key.startsWith('bt-'))
  for (const r of bt) {
    out.push({ set: 'B', itemId: `${r.source_key}:${r.ord}`, kind: 'good', text: r.content })
  }
  // set B nak: 자리만 비워 둔다(3-2). bt- 는 아직 nak 짝이 없다 — 다음 턴에
  // 초안 5건이 오면 여기 kind:'nak' 로 채운다. 형식(good/nak)은 이미 맞다.

  return out
}

const arg = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const flag = (name: string) => process.argv.includes(`--${name}`)

/** ai-probe.ts 의 preflightWrite 와 같다 — 돈이 나가기 전에 쓰기 권한을 먼저 잰다. */
async function preflightWrite(): Promise<boolean> {
  const admin = createAdminClient()
  const before = await countTodayRows()
  if (before === null) {
    console.error('★ ai_usage_log 를 못 읽는다. 지출 상한이 설 수 없다.')
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
    return false
  }
  const after = await countTodayRows()
  if (after === null || after !== before + 1) {
    console.error(`★ 넣은 행이 오늘 합계에 안 잡힌다 (${before} → ${after}). 상한이 못 선다.`)
    return false
  }
  console.log(`예비 검사 통과 — 오늘 행 ${before} → ${after}`)
  return true
}

interface RunResult {
  set: 'A' | 'B'
  itemId: string
  kind: 'good' | 'nak'
  rep: number
  verdict: SupportVerdict | 'call_failed' | 'not_json' | 'bad_shape'
  fromCache: boolean
  costUsd: number | null
}

async function main() {
  const dry = flag('dry')
  const check = flag('check')
  const useCache = flag('use-cache')
  const reps = Number(arg('reps', '5'))
  const model = arg('model', DEFAULT_MODEL)
  const out = arg('out', `data/probe/support-golden-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`)

  const cases = loadCases()
  const setA = cases.filter((c) => c.set === 'A')
  const setB = cases.filter((c) => c.set === 'B')
  const totalCalls = cases.length * reps
  const runCap = Number(arg('cap', String(totalCalls)))

  console.log(`set A(ch10) ${setA.length}건 · set B(bt-) ${setB.length}건 · 반복 ${reps}회 · 모델 ${model} · thinking ${THINKING_LEVEL}`)
  console.log(`캐시 ${useCache ? '사용(--use-cache)' : '우회(기본)'} · 이 실행 상한 ${runCap}회`)
  if (!PRICES[model]) console.log('★ 단가표에 없는 모델이다. 비용이 null 로 나간다 — pricing.ts 에 넣어라')
  else console.log(`★ 단가는 프로모다. ${PROMO_ENDS} 이후 두 배 — pricing.ts`)

  if (dry) {
    const c = cases[0]
    console.log(`\n--- 프롬프트 한 건 (${c.set}/${c.itemId}/${c.kind}) ---`)
    const { buildSupportPrompt } = await import('../lib/ai/prompt')
    console.log(buildSupportPrompt(c.text))
    console.log('\n--dry 다. DB 도 Gemini 도 안 탔다. 마개까지 재려면 --check 다.')
    return
  }

  const need = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = need.filter((k) => !process.env[k])
  console.log('\nenv  ' + [...need, 'GEMINI_API_KEY'].map((k) => `${k}=${process.env[k] ? '있음' : '없음'}`).join(' · '))
  if (missing.length > 0) {
    console.error(`★ DB 자격이 없다: ${missing.join(' · ')}. --dry 로 보든가 .env.local 을 채워라.`)
    process.exit(1)
  }
  if (!process.env.GEMINI_API_KEY) {
    console.log('키 없음 — 실행 안 함')
    process.exit(0)
  }

  const flags = await readFlags()
  console.log(`\nflags  kill_switch=${flags.killSwitch} cap=${flags.dailySpendCapUsd}`)
  if (!(await preflightWrite())) process.exit(1)

  const gate = checkGateBeforeQuota({
    hasApiKey: true,
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
  const results: RunResult[] = []
  let calls = 0

  outer: for (const c of cases) {
    for (let rep = 1; rep <= reps; rep++) {
      const spent = await sumSpendTodayUsd()
      const pre = checkGateBeforeQuota({
        hasApiKey: true, killSwitch: flags.killSwitch,
        dailySpendCapUsd: flags.dailySpendCapUsd, spentTodayUsd: spent,
      })
      if (!pre.allow) {
        console.log(`\n막혔다 [${pre.rule}] ${pre.detail} — ${calls}회에서 멈춘다`)
        break outer
      }
      const budget = checkRunBudget(calls, runCap)
      if (!budget.allow) {
        console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`)
        break outer
      }

      const normalized = c.text.trim()
      let fromCache = false
      let outcome: SupportOutcome | null = null
      let cachedVerdict: SupportVerdict | null = null

      if (useCache) {
        const hash = createHash('sha256').update(`${normalized} ${c.itemId} ${PROMPT_VERSION_SUPPORT} ${model}`).digest('hex')
        const { data } = await admin.from('ai_shadow_cache').select('verdict').eq('hash', hash).maybeSingle()
        if (data) {
          fromCache = true
          cachedVerdict = data.verdict as SupportVerdict
        }
      }

      let verdict: RunResult['verdict']
      let costUsd: number | null = null

      if (fromCache && cachedVerdict) {
        verdict = cachedVerdict
      } else {
        outcome = await judgeSupportWith(callGemini, normalized, model)
        calls++
        costUsd = outcome.costUsd

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
            console.error('\n★ ai_usage_log 에 못 적었다 — 멈춘다.')
            logPgError('ai_usage_log insert', error)
            break outer
          }
        }

        if (!outcome.ok || !outcome.observation) {
          verdict = (outcome.error ?? 'call_failed') as RunResult['verdict']
        } else {
          verdict = verifySupportJudgment(normalized, outcome.observation).verdict
        }
      }

      results.push({ set: c.set, itemId: c.itemId, kind: c.kind, rep, verdict, fromCache, costUsd })
      console.log(
        `${String(calls).padStart(3)} ${c.set}/${c.itemId}/${c.kind} rep${rep}  ` +
          `${verdict}${fromCache ? ' (캐시)' : ''}  $${costUsd ?? '-'}`
      )

      if (!fromCache && outcome && outcome.error === 'call_failed' && calls === 1) {
        console.log('\n★ 첫 호출부터 못 나갔다. 설정 문제다 — 뒤를 안 돌린다.')
        break outer
      }
    }
  }

  // ── 집계. set A · set B 분리(3-2) ──────────────────────────────────
  function summarize(set: 'A' | 'B') {
    const rows = results.filter((r) => r.set === set)
    const good = rows.filter((r) => r.kind === 'good')
    const nak = rows.filter((r) => r.kind === 'nak')
    const falsePos = good.filter((r) => r.verdict !== 'buildup').length // 오탐: good인데 buildup 아님
    const missed = nak.filter((r) => r.verdict === 'buildup').length // 미검출: nak인데 buildup
    const mismatch = rows.filter((r) => r.verdict === 'beat_mismatch' || r.verdict === 'quote_mismatch').length
    const cost = rows.reduce((s, r) => s + (r.costUsd ?? 0), 0)

    // 뒤집힘: 같은 itemId+kind 의 reps 결과가 다 같지 않으면 1건
    const byItem = new Map<string, RunResult[]>()
    for (const r of rows) {
      const k = `${r.itemId}:${r.kind}`
      const list = byItem.get(k) ?? []
      list.push(r)
      byItem.set(k, list)
    }
    let flips = 0
    for (const list of byItem.values()) {
      const verdicts = new Set(list.map((r) => r.verdict))
      if (verdicts.size > 1) flips++
    }

    console.log(`\n[set ${set}] good ${good.length}건 오탐 ${falsePos} · nak ${nak.length}건 미검출 ${missed} · ` +
      `beat/quote 불일치 ${mismatch} · 뒤집힘(항목) ${flips}/${byItem.size} · 비용 $${cost.toFixed(6)}`)
    return { set, good: good.length, falsePos, nak: nak.length, missed, mismatch, flips, itemCount: byItem.size, cost }
  }
  const summaryA = summarize('A')
  const summaryB = summarize('B')

  writeFileSync(out, JSON.stringify({ model, reps, promptVersion: PROMPT_VERSION_SUPPORT, results, summaryA, summaryB }, null, 2))
  console.log(`\n결과를 ${out} 에 적었다.`)
  console.log('판정선(STATUS): set A·B 오탐 0 이고 set A 미검출이 낮으면 → 다음 세션 16(ca-) 확장.')
  console.log('두 집합이 갈리면 문체를 재는 것 — 프롬프트 재검토(3-4).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
