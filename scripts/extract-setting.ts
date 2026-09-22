/**
 * 설정검사 추출 하니스 — 원고 회차 → LLM → ExtractionRaw → locate → Extraction (설계 v1 §5-1, 1단계).
 *
 * ai-probe.ts 와 같은 경로 C 를 탄다: 마개(api_key → kill_switch → spend_cap → run_cap) 를 **호출마다**
 * 재고, 돈을 태웠으면 ai_usage_log 에 **먼저** 적는다. 게이트를 안 타면 그게 세션 11 §8-1 의 B 다.
 *
 * ```bash
 * npm run setting:extract -- --dry            # DB 도 네트워크도 안 탄다. 프롬프트·스키마 조립만
 * npm run setting:extract -- --check          # 마개와 쓰기를 재고 멈춘다. Gemini 는 안 부른다
 * npm run setting:extract -- --step=schema    # ★ 1회 호출. 1화만. 스키마가 받아들여지는지 본다
 * npm run setting:extract -- --step=run       # 4회 호출. (1화 → 2화) × 2 → llm/llm2 → verify 4인자
 * ```
 *
 * ★ 반복 실행 금지 — step 하나가 낼 수 있는 호출 수가 곧 이 실행의 상한(run_cap)이다.
 * ★ 원응답은 lib/setting/fixtures/raw/ 에 그대로 남긴다. verify 를 고칠 때 다시 부르지 않기 위해.
 * ★ 이 픽스처의 {{branches}} 는 작품 설정으로 main / pre_regression 을 넘긴다(골든 _comment) —
 *   모델이 갈래 id 를 짓지 않는다. 첫 회차의 {{lexicon}} 은 "없음", 2화는 1화에서 locate 를 살아남은 개체 목록.
 * ★ `--conditions=react-server` 가 필요하다(package.json 이 준다). gemini.ts 와 flags.ts 가 `server-only` 를 문다.
 */
// ★ 이 import 가 맨 앞이어야 한다. gemini.ts 는 로드 시점에 env 를 읽는다.
import './load-env'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { z } from 'zod'
import { ExtractionRaw, ExtractionRawForModel, type Extraction } from '../lib/setting/schema'
import { locateAll } from '../lib/setting/locate'
import { callGemini, DEFAULT_MODEL, THINKING_LEVEL } from '../lib/ai/gemini'
import { checkGateBeforeQuota, checkRunBudget } from '../lib/ai/gate'
import { countTodayRows, logPgError, readFlags, sumSpendTodayUsd } from '../lib/ai/flags'
import { createAdminClient } from '../lib/supabase/admin'
import { costUsd, PRICES, PROMO_ENDS, type TokenUsage } from '../lib/ai/pricing'

const arg = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const flag = (name: string) => process.argv.includes(`--${name}`)

const SETTING = new URL('../lib/setting/', import.meta.url)
const FIX = new URL('fixtures/', SETTING)
const RAW = new URL('fixtures/raw/', SETTING)
const p = (u: URL) => decodeURIComponent(u.pathname)

/** 이 픽스처의 작품 설정. 골든 _comment 가 정한 것 — 모델이 짓지 않는다. */
const WORK_BRANCHES = [
  { id: 'main', label: '현재' },
  { id: 'pre_regression', label: '회귀 전' },
]

// ── 프롬프트 조립 ─────────────────────────────────────────────────────
/** extract.ko.md 의 `---` 뒤(시스템 + 사용자)를 한 덩이로. callGemini 는 문자열 하나만 받는다. */
function loadTemplate(): string {
  const md = readFileSync(new URL('prompts/extract.ko.md', SETTING), 'utf8')
  const cut = md.indexOf('\n---\n')
  if (cut < 0) throw new Error('extract.ko.md 에 --- 구분선이 없다')
  return md.slice(cut + 5).trim()
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl
  for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(v)
  const left = out.match(/\{\{\w+\}\}/g)
  if (left) throw new Error(`채우지 못한 자리: ${left.join(' ')}`)
  return out
}

const branchesLine = () => WORK_BRANCHES.map((b) => `${b.id} (${b.label})`).join(', ')

/** 1화에서 살아남은 개체 → 2화 {{lexicon}}. 이름·별칭·kind. 최대 300. */
function lexiconOf(ex: Extraction): string {
  const rows = ex.entities.slice(0, 300).map((e) => `${e.name}${e.aliases.length ? ' (별칭: ' + e.aliases.join(', ') + ')' : ''} — ${e.kind}`)
  return rows.length ? rows.join('\n') : '없음'
}

/**
 * z.toJSONSchema 결과에서 `$schema` 만 뗀다 — 메타 키라 스키마 뜻이 아니고, provider 가 모르는 최상위 키로
 * 거부할 수 있다. `default` · `additionalProperties` · `anyOf` 는 **그대로 둔다.** 이번 호출이 재는 것이 그것이다.
 * ★ 모델용은 ExtractionRawForModel(first_mention 60자). 파싱은 ExtractionRaw(300자) — 필드 하나 때문에 회차 전체를 버리지 않는다.
 */
function buildJsonSchema(): Record<string, unknown> {
  const j = z.toJSONSchema(ExtractionRawForModel) as Record<string, unknown>
  delete j.$schema
  return j
}

// ── 호출 한 번 ────────────────────────────────────────────────────────
interface CallResult {
  name: string
  model: string
  usage: TokenUsage
  costUsd: number | null
  text: string
  parsed: Extraction | null
  parseError: string | null
}

async function extractOnce(name: string, episode: number, text: string, lexicon: string, model: string, tpl: string, schema: Record<string, unknown>, maxOut: number): Promise<CallResult> {
  const prompt = fillTemplate(tpl, { episode: String(episode), lexicon, branches: branchesLine(), text })
  const reply = await callGemini(prompt, model, { responseJsonSchema: schema, maxOutputTokens: maxOut })
  const cost = costUsd(reply.model, reply.usage)

  // ★ 원응답을 먼저 남긴다 — 파싱이 깨져도 돈은 나갔고 그 본문이 증거다.
  mkdirSync(p(RAW), { recursive: true })
  writeFileSync(new URL(`${name}.raw.json`, RAW), JSON.stringify({ name, episode, model: reply.model, usage: reply.usage, cost_usd: cost, thinking: THINKING_LEVEL, prompt_chars: prompt.length, text: reply.text }, null, 1))

  let parsed: Extraction | null = null
  let parseError: string | null = null
  try {
    const json = JSON.parse(reply.text)
    const raw = ExtractionRaw.safeParse({ ...json, episode })   // 회차 번호는 서버가 정한다
    if (!raw.success) parseError = 'ExtractionRaw 불일치: ' + raw.error.issues.slice(0, 8).map((i) => `${i.path.join('.')} ${i.message}`).join(' | ')
    else parsed = locateAll(text, raw.data)
  } catch (e) {
    parseError = `JSON 파싱 실패: ${(e as Error).message}  (앞 200자) ${reply.text.slice(0, 200)}`
  }
  return { name, model: reply.model, usage: reply.usage, costUsd: cost, text: reply.text, parsed, parseError }
}

function report(r: CallResult) {
  const u = r.usage
  console.log(`\n[${r.name}] 모델 ${r.model} · in=${u.inputTokens} cache=${u.cachedTokens} out=${u.outputTokens}(생각 포함) · $${r.costUsd ?? 'null(단가표 없음)'}`)
  if (r.parseError) { console.log(`  ★ ${r.parseError}`); return }
  const ex = r.parsed!
  const n = (k: keyof Extraction) => (ex[k] as unknown[]).length
  console.log(`  entities ${n('entities')} · states ${n('states')} · events ${n('events')} · relations ${n('relations')} · rules ${n('rules')} · scenes ${n('scenes')} · timeline ${n('timeline')} · unclassified ${n('unclassified')} · excluded ${n('excluded')}`)
  const amb = [...ex.states, ...ex.events, ...ex.relations, ...ex.rules].filter((x) => x.evidence.occurrences > 1).length
  console.log(`  coverage: dropped(surface_not_found) ${ex.dropped.filter((d) => d.reason === 'surface_not_found').length} · orphan_ref ${ex.dropped.filter((d) => d.reason === 'orphan_ref').length} · ambiguous_surface ${amb} · scenes_unanchored ${ex.scenes.filter((s) => s.anchor === null).length}/${ex.scenes.length} · states_inferred ${ex.states.filter((s) => s.certainty === 'inferred').length} · claimed_in_dialogue ${ex.states.filter((s) => s.claimed_in_dialogue).length}`)
  if (ex.dropped.length) {
    console.log('  dropped 전문:')
    for (const d of ex.dropped) console.log(`    - [${d.table}] ${d.reason}  ${JSON.stringify(d.surface)}`)
  }
}

// ── 마개 (ai-probe 와 같은 절차) ──────────────────────────────────────
async function preflightWrite(): Promise<boolean> {
  const admin = createAdminClient()
  const before = await countTodayRows()
  if (before === null) { console.error('★ ai_usage_log 를 못 읽는다. 지출 상한이 설 수 없다.'); return false }
  const { error } = await admin.from('ai_usage_log').insert({ user_id: process.env.AI_PROBE_USER_ID ?? null, submission_id: null, model: 'preflight', input_tokens: 0, cached_tokens: 0, output_tokens: 0, cost_usd: 0 })
  if (error) { console.error('★ ai_usage_log 에 못 적는다. 호출하기 전에 멈춘다.'); logPgError('ai_usage_log insert', error); return false }
  const after = await countTodayRows()
  if (after === null || after !== before + 1) { console.error(`★ 넣은 행이 오늘 합계에 안 잡힌다 (${before} → ${after}).`); return false }
  console.log(`예비 검사 통과 — 오늘 행 ${before} → ${after}`)
  return true
}

async function main() {
  const dry = flag('dry')
  const check = flag('check')
  const step = arg('step', '')
  const model = arg('model', DEFAULT_MODEL)
  const maxOut = Number(arg('max-out', '32768'))
  const rescore = flag('rescore')
  const dump = flag('dump')
  if (!dry && !check && !rescore && !dump && step !== 'schema' && step !== 'run') {
    console.error('★ --dry · --check · --rescore · --dump · --step=schema · --step=run 중 하나. --step=schema 가 첫 호출(1회)이다.')
    process.exit(1)
  }
  const plannedCalls = step === 'run' ? 4 : 1
  const runCap = Number(arg('cap', String(plannedCalls)))

  const t1 = readFileSync(new URL('prelim_ep1.txt', FIX), 'utf8')
  const t2 = readFileSync(new URL('prelim_ep2.txt', FIX), 'utf8')
  const tpl = loadTemplate()
  const schema = buildJsonSchema()
  const schemaStr = JSON.stringify(schema)
  const probePrompt = fillTemplate(tpl, { episode: '1', lexicon: '없음', branches: branchesLine(), text: t1 })

  console.log(`모델 ${model} · thinking ${THINKING_LEVEL} · maxOutputTokens ${maxOut} · 이 실행 상한 ${runCap}회 (계획 ${plannedCalls}회)`)
  console.log(`원고 1화 ${t1.length}자 · 2화 ${t2.length}자 · 프롬프트(1화) ${probePrompt.length}자 · JSON 스키마 ${schemaStr.length}바이트`)
  console.log(`스키마 모양: anyOf ${(schemaStr.match(/"anyOf"/g) ?? []).length} · default ${(schemaStr.match(/"default"/g) ?? []).length} · additionalProperties ${(schemaStr.match(/"additionalProperties"/g) ?? []).length} · description ${(schemaStr.match(/"description"/g) ?? []).length} · $schema 뗌`)
  if (!PRICES[model]) console.log('★ 단가표에 없는 모델이다. 비용이 null 로 나간다 — pricing.ts 에 넣어라')
  else console.log(`★ 단가는 프로모다. ${PROMO_ENDS} 이후 두 배 — pricing.ts`)

  if (dry) {
    console.log('\n--- 프롬프트 앞 1200자 ---\n' + probePrompt.slice(0, 1200))
    console.log('\n--- 프롬프트 끝 300자 ---\n' + probePrompt.slice(-300))
    console.log('\n--dry 다. DB 도 Gemini 도 안 탔다. 마개까지 재려면 --check 다.')
    return
  }

  // ── --rescore : raw → locate → verify. 호출 0회. 코드·골든을 고친 뒤 같은 응답으로 다시 채점한다 ──
  if (rescore) {
    const names: [string, number, string][] = [['prelim_ep1.llm', 1, t1], ['prelim_ep2.llm', 2, t2], ['prelim_ep1.llm2', 1, t1], ['prelim_ep2.llm2', 2, t2]]
    let made = 0
    for (const [name, episode, text] of names) {
      let rawFile: { text: string; model?: string; usage?: TokenUsage; cost_usd?: number | null }
      try { rawFile = JSON.parse(readFileSync(new URL(`${name}.raw.json`, RAW), 'utf8')) } catch { console.log(`\n[${name}] raw 없음 — 건너뜀`); continue }
      const r: CallResult = { name, model: rawFile.model ?? '?', usage: rawFile.usage ?? { inputTokens: 0, cachedTokens: 0, outputTokens: 0 }, costUsd: rawFile.cost_usd ?? null, text: rawFile.text, parsed: null, parseError: null }
      try {
        const json = JSON.parse(rawFile.text)
        const parsedRaw = ExtractionRaw.safeParse({ ...json, episode })
        if (!parsedRaw.success) r.parseError = 'ExtractionRaw 불일치: ' + parsedRaw.error.issues.slice(0, 8).map((i) => `${i.path.join('.')} ${i.message}`).join(' | ')
        else r.parsed = locateAll(text, parsedRaw.data)
      } catch (e) { r.parseError = `JSON 파싱 실패: ${(e as Error).message}` }
      report(r)
      if (r.parsed) { writeFileSync(new URL(`${name}.json`, FIX), JSON.stringify(r.parsed, null, 1)); made++ }
    }
    if (made === 0) { console.log('\n★ 재채점할 raw 가 하나도 없다 — lib/setting/fixtures/raw/*.raw.json 을 둔다'); process.exit(1) }
    runVerify()
    return
  }

  // ── --dump : llm.json 에서 정해진 자리를 뽑아 보여준다. 호출 0회 ──
  if (dump) {
    dumpSections()
    return
  }

  const need = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = need.filter((k) => !process.env[k])
  console.log('\nenv  ' + [...need, 'GEMINI_API_KEY'].map((k) => `${k}=${process.env[k] ? '있음' : '없음'}`).join(' · '))
  if (missing.length > 0) {
    console.error(`★ DB 자격이 없다: ${missing.join(' · ')}. .env.local 에 넣어라(scripts/load-env.ts 가 읽는다). 자격 없이 볼 것은 --dry 다.`)
    process.exit(1)
  }

  const flags = await readFlags()
  console.log(`flags  kill_switch=${flags.killSwitch} cap=${flags.dailySpendCapUsd}`)
  if (!(await preflightWrite())) process.exit(1)
  const gateFacts = async () => ({ hasApiKey: !!process.env.GEMINI_API_KEY, killSwitch: flags.killSwitch, dailySpendCapUsd: flags.dailySpendCapUsd, spentTodayUsd: await sumSpendTodayUsd() })
  const gate = checkGateBeforeQuota(await gateFacts())
  console.log(gate.allow ? '마개 통과 — 부를 수 있다' : `막혔다 [${gate.rule}] ${gate.detail}`)
  if (check) { console.log('\n--check 다. Gemini 는 안 불렀다.'); return }
  if (!gate.allow) process.exit(1)

  const admin = createAdminClient()
  let calls = 0
  const results: CallResult[] = []

  /** 마개 → 호출 → 기록. 막히면 null. */
  const guarded = async (name: string, episode: number, text: string, lexicon: string): Promise<CallResult | null> => {
    const pre = checkGateBeforeQuota(await gateFacts())
    if (!pre.allow) { console.log(`\n막혔다 [${pre.rule}] ${pre.detail}  — ${calls}회에서 멈춘다`); return null }
    const budget = checkRunBudget(calls, runCap)
    if (!budget.allow) { console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`); return null }
    let r: CallResult
    try {
      r = await extractOnce(name, episode, text, lexicon, model, tpl, schema, maxOut)
    } catch (e) {
      calls++
      console.error(`\n★ [${name}] 호출 자체가 실패했다 — 스키마 거부인지 다른 문제인지 아래 메시지로 가른다`)
      console.error((e as Error).message ?? e)
      return null
    }
    calls++
    // ★ 돈을 태웠으면 먼저 적는다. 못 적으면 다음 호출 앞의 상한이 틀린다.
    const { error } = await admin.from('ai_usage_log').insert({ user_id: process.env.AI_PROBE_USER_ID ?? null, submission_id: null, model: r.model, input_tokens: r.usage.inputTokens, cached_tokens: r.usage.cachedTokens, output_tokens: r.usage.outputTokens, cost_usd: r.costUsd })
    if (error) { console.error('\n★ ai_usage_log 에 못 적었다. 지출을 못 세면 상한이 아니다 — 멈춘다.'); logPgError('ai_usage_log insert', error); report(r); return null }
    results.push(r)
    report(r)
    return r
  }

  // ── step=schema : 1화 1회. 스키마가 받아들여지는지만 본다 ──
  if (step === 'schema') {
    const r = await guarded('prelim_ep1.schema-probe', 1, t1, '없음')
    console.log(`\n호출 ${calls}회 · 실비 $${results.reduce((s, x) => s + (x.costUsd ?? 0), 0).toFixed(6)}`)
    if (!r) { console.log('★ 스키마 시험 실패 — 멈춘다. 위 메시지와 fixtures/raw/ 를 본다.'); process.exit(1) }
    console.log(r.parseError ? '★ 응답은 왔으나 ExtractionRaw 로 안 읽힌다 — 위 사유' : 'ExtractionRaw 통과 · locate 통과. 다음은 --step=run (4회).')
    return
  }

  // ── step=run : (1화 → 2화) × 2 ──
  const suffixes = ['llm', 'llm2']
  for (const sfx of suffixes) {
    const r1 = await guarded(`prelim_ep1.${sfx}`, 1, t1, '없음')
    if (!r1) break
    if (!r1.parsed) { console.log(`★ 1화(${sfx})가 안 읽혀 2화의 {{lexicon}} 을 만들 수 없다 — 이 회차는 여기서 멈춘다`); continue }
    writeFileSync(new URL(`prelim_ep1.${sfx}.json`, FIX), JSON.stringify(r1.parsed, null, 1))
    const r2 = await guarded(`prelim_ep2.${sfx}`, 2, t2, lexiconOf(r1.parsed))
    if (!r2) break
    if (r2.parsed) writeFileSync(new URL(`prelim_ep2.${sfx}.json`, FIX), JSON.stringify(r2.parsed, null, 1))
  }
  console.log(`\n호출 ${calls}회 · 실비 $${results.reduce((s, x) => s + (x.costUsd ?? 0), 0).toFixed(6)} · 토큰 in ${results.reduce((s, x) => s + x.usage.inputTokens, 0)} / out ${results.reduce((s, x) => s + x.usage.outputTokens, 0)}`)

  runVerify()
}

/** llm/llm2 네 파일이 다 있으면 4인자(결정성 포함), 둘만 있으면 2인자. verify 의 종료 코드를 그대로 낸다. */
function runVerify(): never {
  const files = ['prelim_ep1.llm.json', 'prelim_ep2.llm.json', 'prelim_ep1.llm2.json', 'prelim_ep2.llm2.json'].map((f) => p(new URL(f, FIX)))
  const have = files.filter((f) => { try { readFileSync(f); return true } catch { return false } })
  if (have.length < 2 || !have.includes(files[0]) || !have.includes(files[1])) { console.log('★ verify 를 돌릴 파일이 모자란다(llm 1·2화가 필요) — 멈춘다'); process.exit(1) }
  const args = have.length === 4 ? files : files.slice(0, 2)
  console.log(`\n=== verify ${have.length === 4 ? '4인자(결정성 포함)' : '2인자 — run2 가 없어 결정성은 못 잰다'} ===`)
  const v = spawnSync('npx', ['tsx', p(new URL('verify.ts', SETTING)), ...args], { stdio: 'inherit' })
  process.exit(v.status ?? 1)
}

/**
 * 0번 덤프 (세션 55 ①-0). llm.json(run1)에서 정해진 자리만 뽑는다 — 고치기 전의 모습.
 *   2화 유진혁 스킬/능력 계열 상태 전부 · 2화 마강혁 전부 · 2화 유진혁 소속 · 1화 김수정 관련 전부(dropped 포함)
 *   1화 excluded 전문 · 1화 events 전부 · 2화 relations 전부
 */
function dumpSections() {
  const loadEx = (f: string): Extraction | null => { try { return JSON.parse(readFileSync(new URL(f, FIX), 'utf8')) } catch { return null } }
  const e1 = loadEx('prelim_ep1.llm.json'), e2 = loadEx('prelim_ep2.llm.json')
  if (!e1 || !e2) { console.log('★ prelim_ep1.llm.json / prelim_ep2.llm.json 이 없다 — --rescore 나 --step=run 이 먼저다'); process.exit(1) }
  const j = (x: unknown) => JSON.stringify(x)
  const nameOf = (ex: Extraction, ref: string | null) => ref == null ? null : (ex.entities.find((e) => e.ref === ref)?.name ?? `?${ref}`)
  const refsOf = (ex: Extraction, names: string[]) => ex.entities.filter((e) => names.includes(e.name) || e.aliases.some((a) => names.includes(a))).map((e) => e.ref)
  const stateLine = (ex: Extraction, s: Extraction['states'][number]) => `    ${nameOf(ex, s.entity)}.${s.attribute} = ${j(s.value)}  [${s.branch}${s.certainty === 'inferred' ? ' inferred' : ''}${s.claimed_in_dialogue ? ' 대사:' + nameOf(ex, s.speaker) : ''}${s.exclusive ? ' ★exclusive' : ''}]  surface=${j(s.evidence.surface)}`
  const eventLine = (ex: Extraction, e: Extraction['events'][number]) => `    ${e.kind} "${e.description}" [${e.branch}]${e.subject ? ` ${nameOf(ex, e.subject)}.${e.attribute} ${j(e.before)}→${j(e.after)}` : ''}${e.elapsed_years != null ? ` elapsed=${e.elapsed_years}` : ''}  surface=${j(e.evidence.surface)}`
  const relLine = (ex: Extraction, r: Extraction['relations'][number]) => `    ${nameOf(ex, r.subject)} -${r.predicate}-> ${nameOf(ex, r.object)} [${r.branch}${r.claimed_in_dialogue ? ' 대사' : ''}]  surface=${j(r.evidence.surface)}`
  const entLine = (e: Extraction['entities'][number]) => `    ${e.name} (${e.kind})${e.aliases.length ? ' 별칭 ' + e.aliases.join('/') : ''}${e.summary ? ' — ' + e.summary : ''}  first_mention=${j(e.first_mention.surface)}`

  const jh = refsOf(e2, ['유진혁', '진혁'])
  console.log('\n[2화 유진혁 스킬/능력 계열 상태]')
  for (const s of e2.states) if (jh.includes(s.entity) && /스킬|능력|기술|특성|마법/.test(s.attribute)) console.log(stateLine(e2, s))
  console.log('\n[2화 마강혁 전부]')
  const mg = refsOf(e2, ['마강혁'])
  for (const e of e2.entities) if (mg.includes(e.ref)) console.log(entLine(e))
  for (const s of e2.states) if (mg.includes(s.entity)) console.log(stateLine(e2, s))
  for (const r of e2.relations) if (mg.includes(r.subject) || mg.includes(r.object)) console.log(relLine(e2, r))
  for (const e of e2.events) if (e.subject && mg.includes(e.subject)) console.log(eventLine(e2, e))
  if (mg.length === 0) console.log('    (개체 없음)')
  console.log('\n[2화 유진혁 소속]')
  for (const s of e2.states) if (jh.includes(s.entity) && /소속|팀|조직/.test(s.attribute)) console.log(stateLine(e2, s))
  console.log('\n[1화 김수정 관련 전부 (dropped 포함)]')
  const sj = refsOf(e1, ['김수정', '수정'])
  for (const e of e1.entities) if (sj.includes(e.ref)) console.log(entLine(e))
  for (const s of e1.states) if (sj.includes(s.entity)) console.log(stateLine(e1, s))
  for (const r of e1.relations) if (sj.includes(r.subject) || sj.includes(r.object)) console.log(relLine(e1, r))
  for (const e of e1.events) if ((e.subject && sj.includes(e.subject)) || /수정/.test(e.description)) console.log(eventLine(e1, e))
  for (const d of e1.dropped) if (/수정/.test(d.surface)) console.log(`    dropped [${d.table}] ${d.reason} ${j(d.surface)}`)
  if (sj.length === 0) console.log('    (개체 없음 — 이름/별칭으로 못 찾음)')
  console.log('\n[1화 excluded 전문]')
  for (const x of e1.excluded) console.log(`    ${x.reason}  ${j(x.surface)}`)
  console.log('\n[1화 events 전부]')
  for (const e of e1.events) console.log(eventLine(e1, e))
  console.log('\n[2화 relations 전부]')
  for (const r of e2.relations) console.log(relLine(e2, r))
  console.log(`\n[1화 dropped 전부 ${e1.dropped.length}건]`)
  for (const d of e1.dropped) console.log(`    [${d.table}] ${d.reason} ${j(d.surface)}`)
  console.log(`\n[2화 dropped 전부 ${e2.dropped.length}건]`)
  for (const d of e2.dropped) console.log(`    [${d.table}] ${d.reason} ${j(d.surface)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
