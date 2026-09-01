// combine을 index.ts에서 그대로 가져온다.
// 사본을 만들지 않는다 — 검증한 코드와 출하하는 코드가 갈라지면 안 된다.
// remote.ts(server-only)는 index.ts가 import하지 않으므로 순수 Node에서 돌아간다.
//
// 검사는 두 방향이다. 오탐(좋은 답안이 걸리는가)과 미검출(나쁜 답안이
// 통과하는가). 세션 4까지는 오탐만 봤다.
//
// 실행: npm run test:scoring

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { combine, countChars, countLetters, countOccurrences, countSentences, deriveFillParts, fillMarkerMismatch, findForbidden, mergeForbidChecks, mergeRepeatChecks, gradeLocal, pendingMorphChecks, summarizeConfig } from './index'
import { sqlStr, countRawNewlinesInStrings } from '../seed-sql'
import { nextProblemKey, nextStageId, stageProgress } from '../train-nav'
import type { Answer, Check, CheckStatus, MorphResult, Problem, ProblemType, ScoringConfig, ScoringMode } from './types'
import { buildMarks } from '../../components/train/marks'
import { CONVERT_SEEDS } from './fixtures/convert-seeds'
import {
  SENSORY_BYPASS,
  SENSORY_CLEAN,
  SENSORY_FORBID_WORDS,
  SENSORY_FORBID_LEMMAS,
} from './fixtures/sensory-bypass'
import {
  RHYTHM_CFG,
  RHYTHM_ITEMS,
  cleanCases,
  bypassCases,
  knownGapCase,
} from './fixtures/rhythm-breaks'
import {
  MONOLOGUE_CFG,
  MONOLOGUE_ITEMS,
  MONOLOGUE_SWAP,
  MONOLOGUE_NARRATION_FILLER,
  MONOLOGUE_LONG,
  MONOLOGUE_REAL,
  MONOLOGUE_REAL_SECOND,
  MONOLOGUE_EMPHASIS,
  MONOLOGUE_SIGH,
  MONOLOGUE_INSTRUCTION,
  MONOLOGUE_INSTRUCTION_EXAMPLE,
  dialogueLinesOf,
  validateMonologueItem,
  type MonologueItem,
} from './fixtures/monologue-insert'
import {
  POV_CFG,
  DEICTIC_REVIEWED_COLLISIONS,
  POV_INSTRUCTION,
  POV_INSTRUCTION_BEFORE,
  POV_INSTRUCTION_EXAMPLE,
  POV_ITEMS,
  DEICTIC,
  MAX_ECHO,
  echoLen,
  passageOf,
  povCleanCases,
  povBypassCases,
  povKnownGapCase,
  validatePovItem,
  crossCheckPovItems,
  type PovItem,
} from './fixtures/pov-lock'
import {
  AT_ITEMS,
  AT_CFG,
  EXAMPLE_ELEMENT,
  EXAMPLE_ANSWER_1,
  EXAMPLE_ANSWER_2,
  AT_INSTRUCTION_1,
  AT_INSTRUCTION_2,
  instructionOf,
  AT_D2_EXTRA,
  AT_TONE,
  BYPASS_KINDS,
  PASSAGE_TAGS,
  goodsCollidingWithCue,
  actionCfgOf,
  passageOf as atPassageOf,
  validateActionItem,
  type ActionItem,
} from './fixtures/action-turn'
import {
  checkPassageRules,
  checkPassageSetRules,
  type PassageRuleInput,
} from './fixtures/passage-rules'
// ── AI 마개. lib/ai 의 순수한 쪽만 가져온다 ─────────────────────────────
// gemini.ts(server-only)와 flags.ts(server-only)는 여기서 안 부른다 —
// remote.ts 를 안 부르는 것과 같은 이유다. 그 둘을 뺀 전 구간을 아래에서 문다.
import {
  checkGateBeforeQuota,
  checkQuota,
  checkRunBudget,
  type GateDecision,
} from '../ai/gate'
import { buildPoint2Prompt, buildPointPrompt, buildPrompt, elementOf, fourLines, looksLikeC4, parseObservation, parsePointObservation, passesAt, PROMPT_FRAME, PROMPT_FRAME_CHARS, PROMPT_FRAME_POINT, PROMPT_FRAME_POINT2, PROMPT_FRAME_POINT2_CHARS, PROMPT_FRAME_POINT_CHARS } from '../ai/prompt'
import { costUsd } from '../ai/pricing'
import { observeWith } from '../ai/observe'
import { backoffMs, isRetryable, statusOf } from '../ai/retry'

let pass = 0
let fail = 0
/**
 * 형태소 서버가 없어 건너뛴 검사 수. 조용히 넘기지 않는다 — 최종 줄에 세어
 * 나온다(세션 5 교훈: 조용한 스킵을 다음 세션이 '다 잰 것'으로 읽는다).
 */
let morphSkipped = 0
/**
 * 최종 줄을 찍은 뒤인가. `t` 가 이 뒤에 불리면 그 단언은 세어지지 못한 것이다.
 *
 * ★★ `Promise.all(aiChainChecks)` 만으로는 반만 막힌다 — **명단에 넣는 것이
 *   opt-in 이라 빠뜨려도 조용하다.** `aiChainChecks.push(...)` 를 안 쓴 async
 *   단언은 그대로 새고, 그게 `1649 가 1649 로` 나와서 안 보인다. 세션 12 §6 의
 *   `감시를 기존 검사 안에 접기`(수가 안 는다)와 같은 모양이다.
 *
 *   그래서 명단을 믿지 않고 **`t` 쪽에서 잡는다.** 수를 안 박는다 —
 *   `늦게 왔다` 는 사실 하나만 잰다.
 *
 * ★★ **이 그물은 완전하지 않다.** 잡는 것은 최종 줄보다 **늦게 도착한 것뿐**이고,
 *   같은 틱에 도착한 미아는 그냥 세어진다(그건 해가 없다 — 수에 들어갔다).
 *   실제로 `push` 를 지운 미아가 마이크로태스크 한 틱 차이로 먼저 도착해서
 *   이 그물을 그대로 통과했다. 20ms 를 물려야 잡혔다.
 *   **그러니 `sealed` 를 믿고 `tAsync` 를 건너뛰지 마라.** 근본은 `tAsync` 이고
 *   이건 그 뒤에 치는 그물이다.
 */
let sealed = false
function t(name: string, cond: boolean, extra = '') {
  if (sealed) {
    // 최종 줄이 이미 찍혔다. 이 단언은 어디에도 안 세어졌다.
    console.log(`  ✗ 최종 줄 뒤에 단언이 왔다: ${name}`)
    console.log(`    ★ aiChainChecks 에 push 를 빠뜨렸는가? 비동기 단언은 명단에 넣어야 기다린다.`)
    process.exit(1)
  }
  if (cond) pass++
  else {
    fail++
    console.log(`  ✗ ${name} ${extra}`)
  }
}

/**
 * 비동기로만 잴 수 있는 단언. `observeWith` 가 async 라 그렇다.
 * ★ 끝에서 반드시 await 한다 — 안 하면 이 단언들이 세어지기 전에 최종 줄이
 *   찍히고, 실패해도 0 실패로 보인다.
 */
const aiChainChecks: Promise<void>[] = []

/**
 * 비동기 단언은 **이걸로만 적어라.** 명단 등록이 자동이라 빠뜨릴 수 없다.
 *
 * ★ `sealed` 와 둘이 한 쌍이다. 이쪽은 `push 를 잊는 것` 을 막고, `sealed` 는
 *   그래도 새어 나온 것을 잡는다. 다만 `sealed` 가 잡는 것은 **최종 줄보다
 *   늦게 도착한 것뿐**이다 — 같은 틱에 도착한 미아는 그냥 세어진다(그건 해가
 *   없다. 수에 들어갔으니까). 둘 다 필요한 이유가 그것이다.
 */
function tAsync(name: string, run: () => Promise<boolean>) {
  aiChainChecks.push(run().then((v) => t(name, v)))
}

const emptyMorph = (o: Partial<MorphResult> = {}): MorphResult => ({
  adverbs: [], modifiers: [], verbs: [], propers: [], repeats: [], lemmas: [], sentences: 1, ...o,
})

// ── 형태소 서버(로컬) 짝. remote.ts 는 server-only 라 여기서 import 못 한다
//    (파일 첫 주석). 1·2단계 모범답안 대조가 부사·동사·반복 규칙을 서버 있을
//    때만 재는 데 쓴다. 없으면 morphSkipped 로 세어 최종 줄에 남긴다(세션 5).
function scoringServer(): { url: string; secret: string } {
  let url = process.env.SCORING_SERVER_URL
  let secret = process.env.SCORING_SERVER_SECRET
  if (!url || !secret) {
    try {
      const raw = readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf8')
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
        if (!m) continue
        const val = m[2].replace(/^["']|["']$/g, '')
        if (m[1] === 'SCORING_SERVER_URL') url = url || val
        if (m[1] === 'SCORING_SERVER_SECRET') secret = secret || val
      }
    } catch {
      /* .env.local 이 없다 — 기본값으로 간다 */
    }
  }
  return { url: url || 'http://localhost:8000', secret: secret || 'dev' }
}
async function morphAnalyze(text: string): Promise<MorphResult | null> {
  const { url, secret } = scoringServer()
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 4000)
  try {
    const res = await fetch(`${url}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-scoring-secret': secret },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    })
    if (!res.ok) return null
    const raw = (await res.json()) as Partial<MorphResult>
    if (!Array.isArray(raw.adverbs) || !Array.isArray(raw.verbs)) return null
    return {
      adverbs: raw.adverbs,
      modifiers: Array.isArray(raw.modifiers) ? raw.modifiers : [],
      verbs: raw.verbs,
      propers: raw.propers ?? [],
      repeats: Array.isArray(raw.repeats) ? raw.repeats : [],
      lemmas: raw.lemmas ?? [],
      sentences: raw.sentences ?? 0,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface RefRow {
  source_key: string
  ord: number
  blank_key: string
  content: string
}

// 모범답안이 자기 문항 규칙을 형태소까지 지키는지 — 서버 있을 때만 도는 선택
// 검사. combine 을 그대로 써서 출하 코드와 갈리지 않는다. aiChainChecks 에
// 실어 최종 줄 전에 기다리게 한다.
function pushRefMorphCheck(
  label: string,
  refs: RefRow[],
  ptype: ProblemType,
  cfgOf: Map<string, ScoringConfig>
): void {
  aiChainChecks.push(
    (async () => {
      const probe = refs.length > 0 ? await morphAnalyze(refs[0].content) : null
      if (!probe) {
        morphSkipped += refs.length
        console.log(`  – 형태소 서버 없음: ${label} 모범답안 ${refs.length}건의 형태소 규칙 검사를 건너뜀`)
        return
      }
      for (const r of refs) {
        const morph = r === refs[0] ? probe : await morphAnalyze(r.content)
        if (!morph) {
          morphSkipped++
          console.log(`  – '${r.source_key}' ord${r.ord}: 형태소 응답 없음, 건너뜀`)
          continue
        }
        const res = combine(
          { id: r.source_key, type: ptype, scoring_mode: 'auto', scoring_config: cfgOf.get(r.source_key)! },
          { text: r.content },
          undefined,
          morph
        )
        t(
          `${label} '${r.source_key}' ord${r.ord}: 형태소 규칙 전부 통과`,
          res.status === 'pass',
          JSON.stringify(res.checks.filter((c) => c.status !== 'pass').map((c) => `${c.key}:${c.status} ${c.detail ?? ''}`))
        )
      }
    })()
  )
}

// ── 1단계 remove ────────────────────────────────────────────────
const p1: Problem = {
  id: 'p1', type: 'remove', scoring_mode: 'auto',
  scoring_config: { maxChars: 34, maxAdverbs: 1, maxModifiers: 2, minVerbs: 2, maxRepeat: 2 },
}

console.log('\n[1단계 remove · 형태소 서버 없음]')
{
  const r = combine(p1, { text: '흥부는 제비의 다리를 감쌌다. 부러진 뼈에 헝겊을 둘렀다.' }, undefined, null)
  console.log('  ', r.checks.map((c) => `${c.key}:${c.status}`).join('  '))
  t('maxChars 통과', r.checks.find((c) => c.key === 'maxChars')?.status === 'pass')
  t('maxAdverbs pending', r.checks.find((c) => c.key === 'maxAdverbs')?.status === 'pending')
  t('maxModifiers pending', r.checks.find((c) => c.key === 'maxModifiers')?.status === 'pending')
  t('maxRepeat pending', r.checks.find((c) => c.key === 'maxRepeat')?.status === 'pending')
  t('전체 pending', r.status === 'pending', `실제=${r.status}`)
  t('AI 호출 안 함', r.needsAi === false)
}

console.log('\n[1단계 remove · 모범답안 + 형태소 결과]')
{
  const m = emptyMorph({ modifiers: ['부러진'], verbs: ['감싸', '부러지', '두르'], sentences: 2 })
  const r = combine(p1, { text: '흥부는 제비의 다리를 감쌌다. 부러진 뼈에 헝겊을 둘렀다.' }, undefined, m)
  t('전부 통과', r.status === 'pass', JSON.stringify(r.checks.filter((c) => c.status !== 'pass')))
}

console.log('\n[1단계 remove · 원문 그대로 붙여넣기]')
{
  const orig = '흥부는 몹시 조심스럽게 제비의 다리를 아주 천천히 감쌌다. 그는 정말 간절하게 제비가 얼른 낫기를 바랐다.'
  const r = combine(p1, { text: orig }, undefined, null)
  t('분량 초과로 미달', r.checks.find((c) => c.key === 'maxChars')?.status === 'fail')
  t('gating으로 blocked', r.blocked === true)
}

console.log('\n[관형형은 부사 예산을 쓰지 않는다]')
{
  // "깨진 독"을 쓰라고 지시문이 요구하는 문항. 관형형 1개가 부사 상한을 잡아먹으면 안 된다.
  const p: Problem = {
    id: 'k', type: 'remove', scoring_mode: 'auto',
    scoring_config: { maxChars: 39, maxAdverbs: 1, maxModifiers: 2, minVerbs: 4, maxRepeat: 2 },
  }
  const m = emptyMorph({
    modifiers: ['깨진'], verbs: ['깨지', '붓', '새', '나가', '주저앉'], sentences: 3,
  })
  const r = combine(p, { text: '콩쥐는 깨진 독에 물을 부었다. 물이 새어 나갔다. 그녀는 주저앉았다.' }, undefined, m)
  t('통과', r.status === 'pass', JSON.stringify(r.checks.filter((c) => c.status !== 'pass')))
}

// ── maxProperNouns ──────────────────────────────────────────────
console.log('\n[maxProperNouns]')
{
  const p: Problem = {
    id: 'pn', type: 'remove', scoring_mode: 'auto',
    scoring_config: { maxProperNouns: 3 },
  }
  const m4 = emptyMorph({ propers: ['흥부', '놀부', '제비', '콩쥐'] })
  const m3 = emptyMorph({ propers: ['흥부', '놀부', '제비'] })
  const r4 = combine(p, { text: '아무 내용' }, undefined, m4)
  const r3 = combine(p, { text: '아무 내용' }, undefined, m3)
  const c4 = r4.checks.find((c) => c.key === 'maxProperNouns')
  const c3 = r3.checks.find((c) => c.key === 'maxProperNouns')
  t('4개면 fail', c4?.status === 'fail', `실제=${c4?.status}`)
  t('3개면 pass', c3?.status === 'pass', `실제=${c3?.status}`)
  t('evidence에 4개 그대로', JSON.stringify(c4?.evidence) === JSON.stringify(['흥부', '놀부', '제비', '콩쥐']), JSON.stringify(c4?.evidence))

  const pNoCfg: Problem = {
    id: 'pn-none', type: 'remove', scoring_mode: 'auto',
    scoring_config: {},
  }
  const rNone = combine(pNoCfg, { text: '아무 내용' }, undefined, m4)
  t('설정 없으면 Check 자체가 없음', rNone.checks.find((c) => c.key === 'maxProperNouns') === undefined)
}

// ── forbidLemmas ────────────────────────────────────────────────
console.log('\n[forbidLemmas]')
{
  const p: Problem = {
    id: 'fl', type: 'remove', scoring_mode: 'auto',
    scoring_config: { forbidLemmas: ['보/VV'] },
  }
  {
    const m = emptyMorph({ lemmas: [{ lemma: '보', tag: 'VV', surface: '봤다' }] })
    const r = combine(p, { text: '창밖을 봤다.' }, undefined, m)
    const c = r.checks.find((c) => c.key === 'forbidLemmas')
    t(
      '활용형 검출 → fail, evidence에 봤다',
      c?.status === 'fail' && c?.evidence?.includes('봤다') === true,
      `status=${c?.status} evidence=${JSON.stringify(c?.evidence)}`
    )
  }
  {
    const m = emptyMorph({ lemmas: [{ lemma: '보', tag: 'VX', surface: '보았다' }] })
    const r = combine(p, { text: '먹어 보았다.' }, undefined, m)
    const c = r.checks.find((c) => c.key === 'forbidLemmas')
    t('보조용언 VX는 통과', c?.status === 'pass', `실제=${c?.status}`)
  }
  {
    const pAdj: Problem = {
      id: 'fl-adj', type: 'remove', scoring_mode: 'auto',
      scoring_config: { forbidLemmas: ['하얗/VA'] },
    }
    const m = emptyMorph({ lemmas: [{ lemma: '하얗', tag: 'VA-I', surface: '하얀' }] })
    const r = combine(pAdj, { text: '하얀 눈이 내렸다.' }, undefined, m)
    const c = r.checks.find((c) => c.key === 'forbidLemmas')
    t('VA-I 접두 비교로 검출', c?.status === 'fail', `실제=${c?.status}`)
  }
  {
    const m = emptyMorph({ lemmas: [{ lemma: '바라보', tag: 'VV', surface: '바라보았다' }] })
    const r = combine(p, { text: '멀리 바라보았다.' }, undefined, m)
    const c = r.checks.find((c) => c.key === 'forbidLemmas')
    t("'보'가 '바라보'에 걸리지 않음 → pass", c?.status === 'pass', `실제=${c?.status}`)
  }
  {
    const m = emptyMorph({
      lemmas: [
        { lemma: '보', tag: 'VV', surface: '봤다' },
        { lemma: '보', tag: 'VV', surface: '봤다' },
      ],
    })
    const r = combine(p, { text: '봤다. 또 봤다.' }, undefined, m)
    const c = r.checks.find((c) => c.key === 'forbidLemmas')
    t('중복 evidence 제거', c?.evidence?.length === 1, JSON.stringify(c?.evidence))
  }
  {
    const pBoth: Problem = {
      id: 'fl-both', type: 'remove', scoring_mode: 'auto',
      scoring_config: { forbidWords: ['두려'], forbidLemmas: ['보/VV'] },
    }
    const m = emptyMorph({ lemmas: [{ lemma: '보', tag: 'VV', surface: '봤다' }] })
    const r = combine(pBoth, { text: '두려운 마음으로 봤다.' }, undefined, m)
    const keys = r.checks.map((c) => c.key)
    t('두 Check가 각각 생성됨', keys.includes('forbidWords') && keys.includes('forbidLemmas'), JSON.stringify(keys))
  }
  {
    const pNone: Problem = {
      id: 'fl-none', type: 'remove', scoring_mode: 'auto',
      scoring_config: {},
    }
    const m = emptyMorph({ lemmas: [{ lemma: '보', tag: 'VV', surface: '봤다' }] })
    const r = combine(pNone, { text: '봤다.' }, undefined, m)
    t('forbidLemmas 설정 없으면 Check 자체가 없음', r.checks.find((c) => c.key === 'forbidLemmas') === undefined)
  }
}

// ── mergeForbidChecks · 화면 병합 전용 (combine() 출력은 그대로) ──
console.log('\n[mergeForbidChecks]')
{
  // 1) forbidWords fail(2건) + forbidLemmas fail(1건) → Check 1개, evidence 3개, fail
  const m1 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '2개', rule: '쓰지 않음: 눈앞, 모습', evidence: ['눈앞에', '모습이'], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'fail', detail: '1개', rule: '쓰지 않음: 내려다보다', evidence: ['내려다보았다'], gating: true },
  ])
  t(
    '2건+1건 → Check 1개, evidence 3개, fail',
    m1.length === 1 && m1[0].evidence?.length === 3 && m1[0].status === 'fail',
    JSON.stringify(m1)
  )

  // 2) forbidWords pass + forbidLemmas fail → fail
  const m2 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'pass', detail: '없음', rule: '쓰지 않음: 눈앞, 모습', evidence: [], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'fail', detail: '1개', rule: '쓰지 않음: 내려다보다', evidence: ['내려다보았다'], gating: true },
  ])
  t('pass + fail → fail', m2[0].status === 'fail', `실제=${m2[0].status}`)

  // 3) forbidWords fail + forbidLemmas pending → fail (pending이 fail을 덮지 않음)
  const m3 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '1개', rule: '쓰지 않음: 눈앞', evidence: ['눈앞에'], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'pending', detail: '형태소 분석 대기', rule: '쓰지 않음: 내려다보다' },
  ])
  t('fail + pending → fail (pending이 덮지 않음)', m3[0].status === 'fail', `실제=${m3[0].status}`)

  // 4) forbidWords pass + forbidLemmas pending → pending
  const m4 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'pass', detail: '없음', rule: '쓰지 않음: 눈앞', evidence: [], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'pending', detail: '형태소 분석 대기', rule: '쓰지 않음: 내려다보다' },
  ])
  t('pass + pending → pending', m4[0].status === 'pending', `실제=${m4[0].status}`)

  // 5) forbidWords만 있고 forbidLemmas 없음 → 입력과 같은 배열 내용, key 유지
  const only: Check[] = [
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '1개', rule: '쓰지 않음: 눈앞', evidence: ['눈앞에'], gating: true },
  ]
  const m5 = mergeForbidChecks(only)
  t(
    'forbidLemmas 없으면 입력과 동일, key는 forbidWords',
    JSON.stringify(m5) === JSON.stringify(only) && m5[0].key === 'forbidWords',
    JSON.stringify(m5)
  )

  // 6) 두 evidence에 같은 어절이 있으면 합친 evidence에 1개만
  const m6 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '1개', rule: '쓰지 않음: 눈앞', evidence: ['눈앞에'], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'fail', detail: '1개', rule: '쓰지 않음: 눈앞', evidence: ['눈앞에'], gating: true },
  ])
  t('중복 어절 evidence 1개로 합쳐짐', m6[0].evidence?.length === 1, JSON.stringify(m6[0].evidence))
}

// ── 2단계 hybrid ────────────────────────────────────────────────
const p2: Problem = {
  id: 'p2', type: 'convert', scoring_mode: 'hybrid',
  scoring_config: {
    maxChars: 60, maxAdverbs: 1, maxModifiers: 2, minVerbs: 1,
    forbidWords: ['두려', '두렵', '무서', '겁먹', '떨렸', '공포', '질렸'],
  },
}
const morphOk = emptyMorph({ verbs: ['붙잡', '밀리'], sentences: 2 })

console.log('\n[2단계 골든셋 통과 3건]')
for (const [text, note] of [
  ['심청은 뱃전을 붙잡은 손을 놓지 못했다. 발끝이 자꾸 뒤로 밀렸다.', '동작 둘'],
  ['심청은 숨을 삼켰다. 부름이 한 번 더 들렸고, 그녀는 뒤를 돌아보았다.', '동작 중심'],
  ['심청의 손끝이 뱃전을 긁었다. 가시가 손톱 밑으로 파고들었다.', '감각 대체'],
] as [string, string][]) {
  const r = combine(p2, { text }, undefined, morphOk)
  t(`통과: ${note}`, r.status === 'pass' && r.needsAi === true, `status=${r.status}`)
}

console.log('\n[2단계 골든셋 미달 — AI 호출 금지]')
{
  const r = combine(p2, { text: '심청은 두렵게 뱃전을 붙잡았다.' }, undefined, morphOk)
  const fw = r.checks.find((c) => c.key === 'forbidWords')
  t('ㅂ불규칙 잡음', fw?.status === 'fail')
  t('근거가 어절 단위', fw?.evidence?.includes('두렵게') === true, JSON.stringify(fw?.evidence))
  t('AI 차단', r.needsAi === false && r.blocked === true)
}
{
  const r = combine(p2, { text: '심청은 겁먹은 얼굴로 뱃전을 붙잡았다.' }, undefined, morphOk)
  t('우회 시도 잡음', r.status === 'fail' && r.needsAi === false)
}

console.log('\n[pending에서는 AI를 부르지 않는다 — ai / hybrid 둘 다]')
{
  const r = combine(p2, { text: '심청은 뱃전을 붙잡았다.' }, undefined, null)
  t('hybrid pending → needsAi false', r.status === 'pending' && r.needsAi === false)
}
{
  // 예전 버그: ai 모드가 status !== 'fail' 이라 pending에서도 호출됐다
  const pAi: Problem = {
    id: 'ai', type: 'continue', scoring_mode: 'ai',
    scoring_config: { maxChars: 150, maxAdverbs: 3, minVerbs: 2 },
  }
  const r = combine(pAi, { text: '칼날이 어깨를 스치고 지나갔다.' }, undefined, null)
  t('ai 모드 pending → needsAi false', r.needsAi === false, `status=${r.status} needsAi=${r.needsAi}`)
  const r2 = combine(pAi, { text: '칼날이 어깨를 스치고 지나갔다.' }, undefined,
    emptyMorph({ verbs: ['스치', '지나가'] }))
  t('ai 모드 pass → needsAi true', r2.needsAi === true, `status=${r2.status}`)
}

// ── 형태소 불필요 유형 (3주차 검증용) ────────────────────────────
console.log('\n[choice]')
{
  const p: Problem = { id: 'c', type: 'choice', scoring_mode: 'auto', scoring_config: {} }
  const a: Answer = { kind: 'choice', index: 1 }
  t('정답', combine(p, { choiceIndex: 1 }, a, null).status === 'pass')
  t('오답', combine(p, { choiceIndex: 0 }, a, null).status === 'fail')
  t('정답 미제공 → pending', combine(p, { choiceIndex: 1 }, undefined, null).status === 'pending')
  t('형태소 없이도 확정 판정', combine(p, { choiceIndex: 1 }, a, null).status !== 'pending')
}

console.log('\n[requireAll — 구성 12 대비 캐릭터 (세션 32)]')
{
  const p: Problem = {
    id: 'ra', type: 'convert', scoring_mode: 'auto',
    scoring_config: { requireAll: ['김하준', '서담'] },
  }
  const key = (t: string) => combine(p, { text: t }, undefined, emptyMorph({ verbs: ['하'] }))
    .checks.find((c) => c.key === 'requireAll')!
  const both = key('김하준은 웃었고 서담은 고개를 숙였다.')
  t('requireAll: 전부 포함 → pass', both.status === 'pass' && both.detail === '김하준, 서담')
  const one = key('김하준은 혼자 웃었다.')
  t('requireAll: 하나 누락 → fail · detail 에 빠진 이름만',
    one.status === 'fail' && one.detail === '없음: 서담', one.detail)
  const none = key('둘은 말없이 헤어졌다.')
  t('requireAll: 전부 누락 → fail · detail 에 둘 다',
    none.status === 'fail' && none.detail === '없음: 김하준, 서담', none.detail)
  t('requireAll: gating', both.gating === true && one.gating === true)
  t('요약: requireAll → 모두 넣기',
    summarizeConfig({ maxChars: 60, minVerbs: 2, requireAll: ['김하준', '서담'] }) ===
      "60자 이하 · 움직이는 말 2개 이상 · '김하준' · '서담' 모두 넣기")
}

console.log('\n[order]')
{
  const p: Problem = { id: 'o', type: 'order', scoring_mode: 'auto', scoring_config: {} }
  const a: Answer = { kind: 'order', sequence: [0, 1, 2, 3] }
  t('정답', combine(p, { order: [0, 1, 2, 3] }, a, null).status === 'pass')
  const r = combine(p, { order: [0, 2, 1, 3] }, a, null)
  t('오답', r.status === 'fail')
  t('어긋난 위치 안내', r.checks[0].detail.includes('2번째'), r.checks[0].detail)
}

console.log('\n[count · 분기점 역산]')
{
  const p: Problem = {
    id: 'n', type: 'count', scoring_mode: 'auto',
    scoring_config: {
      inputs: [
        { key: 'branchCount', label: '분기점 개수', min: 3, max: 15 },
        { key: 'chaptersToFirst', label: '첫 분기점까지 화수', min: 5, max: 40 },
      ],
      op: 'multiply',
    },
  }
  const a: Answer = { kind: 'count', expected: 70, tolerance: 0.15 }
  t('5×14=70', combine(p, { values: { branchCount: 5, chaptersToFirst: 14 } }, a, null).status === 'pass')
  t('4×20=80 허용', combine(p, { values: { branchCount: 4, chaptersToFirst: 20 } }, a, null).status === 'pass')
  t('3×10=30 미달', combine(p, { values: { branchCount: 3, chaptersToFirst: 10 } }, a, null).status === 'fail')
  t('범위 초과 거부', combine(p, { values: { branchCount: 99, chaptersToFirst: 10 } }, a, null).status === 'fail')
  t('빈 입력 거부', combine(p, { values: { branchCount: 5 } }, a, null).status === 'fail')
}

console.log('\n[coinage]')
{
  const p: Problem = {
    id: 'g', type: 'coinage', scoring_mode: 'auto',
    scoring_config: { count: 3, minLen: 2, maxLen: 4, distinctInitial: true },
  }
  t('정상', combine(p, { text: '뇌천류\n풍참격\n염화섬' }, undefined, null).status === 'pass')
  t('개수 부족', combine(p, { text: '뇌천류\n풍참격' }, undefined, null).status === 'fail')
  const dup = combine(p, { text: '뇌천류\n뇌화섬\n풍참격' }, undefined, null)
  t('첫 글자 중복', dup.checks.find((c) => c.key === 'initial')?.status === 'fail')
  const lenBad = combine(p, { text: '뇌\n풍참격\n염화섬룡파' }, undefined, null)
  t('글자수 근거 표시', (lenBad.checks.find((c) => c.key === 'length')?.evidence?.length ?? 0) === 2)
}

// ── forbidWords 오탐 회귀 방지 ───────────────────────────────────
// 이 버그 유형이 두 번 반복됐다. 어간이 흔한 단어의 접두사가 되면 좋은 답안을 막는다.
console.log('\n[forbidWords 오탐 감시]')
{
  // 어절 목록이 아니라 짧은 문장 목록이다.
  //
  // 공백으로 쪼갠 어절 목록을 쓰면 항목에 공백이 없으므로,
  // '화가 났' · '보고 싶' 같이 공백이 든 어간은 어떤 충돌도 검출되지 않는다.
  // 공백 없는 문자열이 공백 든 문자열을 포함할 수 없기 때문이다.
  // 문장으로 두면 공백 어간도 같은 방식으로 검사된다.
  const COMMON = [
    // 붙여쓴 어절 충돌
    '그리고 그림을 그리다',
    '서울 울타리 울창한 숲',
    '겨울 거울 노을 가을 마을',
    '겁나게 빠르다',
    '변화 문화 화면',
    '좋아하다 낯설다 낯익다',
    '얼굴 사랑스럽다 자랑 소나기',
    '치밀한 계획 정밀 조밀',
    '질리다 지겹다',
    '성실 완성 구성',
    '노랗다 노을',
    '수치심 측정수치 수치 데이터',
    '그립감 그립톡',
    // 띄어쓴 어간 충돌 — 어절 목록으로는 볼 수 없던 것들
    '화가 나무를 그렸다',
    '그 화가 나에게 인사했다',
    '보고 싶은 서류를 찾았다',
    '보고 싶다고 상사가 말했다',
    '결재를 보고 싶어 한다',
  ]

  // 픽스처에서 뽑는다. 문항을 추가하면 자동으로 검사 대상이 된다.
  const STEMS = [...new Set(CONVERT_SEEDS.flatMap((s) => s.forbidWords))]
  // 검토를 마친 충돌 목록. 여기 없는 충돌은 실패시킨다.
  const reviewed = new Set(
    CONVERT_SEEDS.flatMap((s) =>
      (s.reviewedCollisions ?? []).map((c) => `${c.stem}|${c.word}`)
    )
  )
  for (const stem of STEMS) {
    const collisions = COMMON
      .filter((w) => w.includes(stem))
      .filter((w) => !reviewed.has(`${stem}|${w}`))
    t(`'${stem}' 미검토 오탐 없음`, collisions.length === 0, `→ ${collisions.join(', ')}`)
  }
  // 잡아야 하는 것은 잡는지
  t('두렵게 잡힘', findForbidden('두렵게 붙잡았다', ['두려', '두렵']).includes('두렵게'))
  t('치밀어 잡힘', findForbidden('화가 치밀어 올랐다', ['치밀어']).length > 0)
  t('치밀한 안 잡힘', findForbidden('치밀한 계획을 세웠다', ['치밀어', '치밀었']).length === 0)
}

// ── 불변식: 지문의 감정어가 자기 forbidWords에 걸려야 한다 ─────────
//
// 이게 깨지면 사용자가 지문을 그대로 복사해 제출해도 통과하고,
// hybrid니까 AI까지 호출된다. 1단계에서 잡았던 "원문 붙여넣기 통과"와 같은 구멍이다.
//
// 문항을 추가할 때마다 자동으로 검사된다. 어떤 활용형을 빠뜨려도 여기서 걸린다.
console.log('\n[불변식: 지문 자신이 걸리는가]')
for (const seed of CONVERT_SEEDS) {
  const hits = findForbidden(seed.passage, seed.forbidWords)
  t(
    `'${seed.key}' 지문이 걸림`,
    hits.length > 0,
    `→ forbidWords가 지문의 감정어를 놓쳤다. 활용형 확인 필요`
  )
}

// 지문을 그대로 제출하면 실제로 AI 호출까지 막히는지
console.log('\n[불변식: 지문 복사 제출 → AI 차단]')
for (const seed of CONVERT_SEEDS) {
  const p: Problem = {
    id: seed.key,
    type: 'convert',
    scoring_mode: 'hybrid',
    scoring_config: {
      maxChars: seed.maxChars,
      maxAdverbs: seed.maxAdverbs,
      maxModifiers: seed.maxModifiers,
      minVerbs: seed.minVerbs,
      forbidWords: seed.forbidWords,
    },
  }
  const r = combine(p, { text: seed.passage }, undefined, emptyMorph({ verbs: ['하', '되'] }))
  t(`'${seed.key}' 차단`, r.blocked === true && r.needsAi === false, `status=${r.status}`)
}

// ── 미검출 감시: 뚫기 표본이 실제로 검출되는가 ──────────────────────
//
// SENSORY_BYPASS는 forbidWords/forbidLemmas를 실제로 뚫어 봤던 표현의
// 모음이다(형태소 분석기로 실측한 lemmas를 그대로 쓴다 — 여기서 손대지
// 않는다). 지금까지의 검사는 "좋은 답안이 억울하게 걸리는가"만 봤다.
// 이 검사는 반대다 — "나쁜 답안이 통과하는가"를 본다.
console.log('\n[미검출 감시: 뚫기 표본]')
{
  const sensoryCfg = {
    forbidWords: SENSORY_FORBID_WORDS,
    forbidLemmas: SENSORY_FORBID_LEMMAS,
  }
  for (const item of SENSORY_BYPASS) {
    const p: Problem = {
      id: item.key,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: sensoryCfg,
    }
    const r = combine(p, { text: item.text }, undefined, emptyMorph({ lemmas: item.lemmas }))
    const fw = r.checks.find((c) => c.key === 'forbidWords')
    const fl = r.checks.find((c) => c.key === 'forbidLemmas')
    const detected = fw?.status === 'fail' || fl?.status === 'fail'
    t(
      `'${item.key}' 검출 여부 = 기대값`,
      detected === item.expectDetected,
      `category=${item.category} expectDetected=${item.expectDetected} 실제=${detected}`
    )
  }
}

// ── 좋은 답안이 걸리지 않는가 ────────────────────────────────────────
console.log('\n[오탐 감시: 감각 묘사 좋은 답안]')
{
  const sensoryCfg = {
    forbidWords: SENSORY_FORBID_WORDS,
    forbidLemmas: SENSORY_FORBID_LEMMAS,
  }
  SENSORY_CLEAN.forEach((item, i) => {
    const p: Problem = {
      id: `sensory-clean-${i}`,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: sensoryCfg,
    }
    const r = combine(p, { text: item.text }, undefined, emptyMorph({ lemmas: item.lemmas }))
    const fw = r.checks.find((c) => c.key === 'forbidWords')
    const fl = r.checks.find((c) => c.key === 'forbidLemmas')
    const ok = fw?.status !== 'fail' && fl?.status !== 'fail'
    t(
      `'${item.category}' 좋은 답안이 안 걸림`,
      ok,
      `text="${item.text}" forbidWords evidence=${JSON.stringify(fw?.evidence)} forbidLemmas evidence=${JSON.stringify(fl?.evidence)}`
    )
  })
}

// ── 불변식: forbidWords 있는 덤프 문항이 자기 목록에 걸리는가 (lack 제외) ──
//
// seed_verify.sql의 불변식 2와 같은 것을 TS 쪽에서도 본다. DB에 실제로
// 적용해 보지 않고도(DB 명령은 여기서 금지되어 있다) 여기서 먼저 잡을 수
// 있다. CONVERT_SEEDS의 6문항과 대상이 겹치지만, 지금은 그대로 둔다 —
// 중복 제거는 다음 작업의 몫이다.
//
// ★ 예외: 구성 11 lack(세션 31) · 구성 12 contrast_char 갭 문항(세션 32 후기).
//   이 단계들의 원문은 결함이 없는 무난한 장면이라 자기 forbidWords 를 일부러
//   안 담는다 — 결핍/속마음은 학습자가 얹는다. 각 단계 블록이 '원문에
//   forbidWords 없음'을 따로 문다.
console.log('\n[불변식: forbidWords 있는 덤프 문항이 자기 목록에 걸림 (lack·contrast_char 제외)]')
{
  interface DumpProblem {
    passage: string | null
    source_key: string
    skill_key: string
    scoring_config: { forbidWords?: string[]; forbidLemmas?: string[] }
  }

  const dumpPath = path.join(__dirname, '..', '..', 'seed', 'dump', 'problems.json')
  // Node는 BOM을 자동으로 벗기지 않는다. scripts/gen-seed.ts의 readJson과 같은 처리.
  const raw = readFileSync(dumpPath, 'utf8').replace(/^\uFEFF/, '')
  const dumpProblems: DumpProblem[] = JSON.parse(raw)

  const skipped: string[] = []
  for (const dp of dumpProblems) {
    if (dp.skill_key === 'lack' || dp.skill_key === 'contrast_char') continue // 무난한 장면이 원문
    const forbidWords = dp.scoring_config?.forbidWords
    if (!forbidWords || forbidWords.length === 0) continue

    const hits = findForbidden(dp.passage ?? '', forbidWords)
    if (hits.length === 0 && (dp.scoring_config?.forbidLemmas?.length ?? 0) > 0) {
      // forbidWords로는 안 걸리지만 forbidLemmas가 있다 — 표제어 매칭은
      // 형태소 분석 없이는 TS/SQL 어느 쪽에서도 확인할 수 없다. 실패시키지
      // 않고 건너뛴다.
      skipped.push(dp.source_key)
      continue
    }
    t(
      `'${dp.source_key}' 지문이 자기 forbidWords에 걸림`,
      hits.length > 0,
      `→ forbidWords가 지문의 표현을 놓쳤다. 활용형 확인 필요`
    )
  }
  if (skipped.length > 0) {
    console.log(`  건너뜀 (forbidLemmas로만 걸림): ${skipped.join(', ')}`)
  }
}

// ── 픽스처와 덤프의 6단계(sensory) 금지 목록이 같은가 ──────────────────
//
// SENSORY_FORBID_WORDS/SENSORY_FORBID_LEMMAS는 이 파일의 미검출·오탐
// 감시(뚫기 표본, 좋은 답안)가 실제로 검증하는 목록이다. seed/dump의
// 6단계 문항이 이것과 다른 목록을 들고 있으면, 여기서 확인한 결과가
// 배포된 채점 설정과 어긋난다.
//
// 지금은 반드시 실패한다 — 픽스처 쪽 목록은 넓혔는데 DB(=덤프)는 아직
// 그 값으로 갱신하지 않았기 때문이다. DB 갱신은 SQL로 직접 한다. 이
// 실패를 없애려고 픽스처나 덤프를 고치지 않는다.
console.log('\n[픽스처와 덤프의 6단계 금지 목록이 같은가 — 한쪽만 고치면 여기서 걸린다]')
{
  interface DumpProblem {
    skill_key: string
    source_key: string
    scoring_config: { forbidWords?: string[]; forbidLemmas?: string[] }
  }

  const dumpPath = path.join(__dirname, '..', '..', 'seed', 'dump', 'problems.json')
  const raw = readFileSync(dumpPath, 'utf8').replace(/^\uFEFF/, '')
  const dumpProblems: DumpProblem[] = JSON.parse(raw)

  const sortedJson = (xs: string[] | undefined) => JSON.stringify([...(xs ?? [])].sort())
  // a에는 있고 b에는 없는 항목
  const onlyIn = (a: string[] | undefined, b: string[] | undefined) => {
    const setB = new Set(b ?? [])
    return (a ?? []).filter((x) => !setB.has(x))
  }

  const wantWords = sortedJson(SENSORY_FORBID_WORDS)
  const wantLemmas = sortedJson(SENSORY_FORBID_LEMMAS)

  for (const dp of dumpProblems) {
    if (dp.skill_key !== 'sensory') continue
    const gotWords = dp.scoring_config?.forbidWords
    const gotLemmas = dp.scoring_config?.forbidLemmas

    t(
      `'${dp.source_key}' forbidWords가 픽스처와 같음`,
      sortedJson(gotWords) === wantWords,
      `픽스처에만 있음=${JSON.stringify(onlyIn(SENSORY_FORBID_WORDS, gotWords))} ` +
        `덤프에만 있음=${JSON.stringify(onlyIn(gotWords, SENSORY_FORBID_WORDS))}`
    )
    t(
      `'${dp.source_key}' forbidLemmas가 픽스처와 같음`,
      sortedJson(gotLemmas) === wantLemmas,
      `픽스처에만 있음=${JSON.stringify(onlyIn(SENSORY_FORBID_LEMMAS, gotLemmas))} ` +
        `덤프에만 있음=${JSON.stringify(onlyIn(gotLemmas, SENSORY_FORBID_LEMMAS))}`
    )
  }
}

// ── 7단계 rhythm: 개행 판정 (형태소 없이 완전 판정) ────────────────────
//
// morph에 null을 넘긴다 — 이 단계는 형태소가 필요 없다. status가 'pending'
// 이 아니라 'pass'/'fail'로 떨어지는 것 자체가 완전 판정의 증거다.
console.log('\n[7단계 rhythm: 오탐 감시 · 뚫기 표본 · 알려진 한계 — 8문항 전수]')
{
  const run = (item: (typeof RHYTHM_ITEMS)[number], text: string) => {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...RHYTHM_CFG, requireAny: [item.keyword] },
    }
    return combine(p, { text }, undefined, null)
  }
  const extra = (item: (typeof RHYTHM_ITEMS)[number], caseKey: string, r: ReturnType<typeof run>) =>
    `${item.sourceKey}/${caseKey} 실제=${r.status} fail=${JSON.stringify(r.checks.filter((c) => c.status === 'fail').map((c) => c.key))}`

  for (const item of RHYTHM_ITEMS) {
    for (const c of cleanCases(item)) {
      const r = run(item, c.text)
      t(`'${item.sourceKey}' clean '${c.key}' → pass`, r.status === 'pass', extra(item, c.key, r))
    }
    for (const c of bypassCases(item)) {
      const r = run(item, c.text)
      t(`'${item.sourceKey}' bypass '${c.key}' → fail`, r.status === 'fail', extra(item, c.key, r))
    }
    // 알려진 한계: 어절 중간 개행은 순수 문자열로 못 잡는다. 지금은 pass가 맞다.
    // knownGapCase의 note를 본다 — 형태소 서버가 서면 이 검사가 실패하고
    // 알려준다. 실패가 좋은 소식인 검사다.
    const g = knownGapCase(item)
    const r = run(item, g.text)
    t(`'${item.sourceKey}' 알려진 한계 '${g.key}' → pass`, r.status === 'pass', extra(item, g.key, r))
  }
}

console.log('\n[7단계 rhythm: 키 가드]')
{
  const item = RHYTHM_ITEMS[0]
  const { maxLineChars, minLines, maxLines, ...rest } = RHYTHM_CFG
  void maxLineChars
  void minLines
  void maxLines
  const pNoLineCfg: Problem = {
    id: 'rh-no-line-cfg', type: 'convert', scoring_mode: 'auto',
    scoring_config: { ...rest, requireAny: [item.keyword] },
  }
  const r = combine(pNoLineCfg, { text: item.passage }, undefined, null)
  const keys = r.checks.map((c) => c.key)
  t(
    '줄 설정을 빼면 minLines/maxLines/maxLineChars Check 자체가 안 생김',
    !keys.includes('minLines') && !keys.includes('maxLines') && !keys.includes('maxLineChars'),
    JSON.stringify(keys)
  )
}
{
  const item = RHYTHM_ITEMS[0]
  const { maxDuplicateLines, ...rest } = RHYTHM_CFG
  void maxDuplicateLines
  const pNoDup: Problem = {
    id: 'rh-no-dup-cfg', type: 'convert', scoring_mode: 'auto',
    scoring_config: { ...rest, requireAny: [item.keyword] },
  }
  const r = combine(pNoDup, { text: item.passage }, undefined, null)
  t(
    'maxDuplicateLines 설정을 빼면 그 Check가 안 생김',
    r.checks.find((c) => c.key === 'maxDuplicateLines') === undefined,
    JSON.stringify(r.checks.map((c) => c.key))
  )
}
{
  const item = RHYTHM_ITEMS[0]
  const p: Problem = {
    id: 'rh-linebreak-chars', type: 'convert', scoring_mode: 'auto',
    scoring_config: { ...RHYTHM_CFG, requireAny: [item.keyword] },
  }
  // 지문과, 같은 지문에 개행만 넣은 뚫기 표본(every-word)을 비교한다.
  const everyWord = bypassCases(item).find((c) => c.key === 'every-word')!
  const r1 = combine(p, { text: item.passage }, undefined, null)
  const r2 = combine(p, { text: everyWord.text }, undefined, null)
  const c1 = r1.checks.find((c) => c.key === 'maxChars')
  const c2 = r2.checks.find((c) => c.key === 'maxChars')
  t(
    '지문과 개행만 넣은 문자열의 maxChars 판정이 같음 (countChars가 공백을 버림)',
    c1?.status === c2?.status && c1?.detail === c2?.detail,
    `원문=${JSON.stringify(c1)} 개행판=${JSON.stringify(c2)}`
  )
}

// ── 8단계 monologue: 대사 사이 독백 끼워넣기 (형태소 없이 완전 판정) ─────
//
// [SE-02] 953~959행: 큰따옴표 대사 사이에 작은따옴표 독백을 한 번씩 끼워
// 넣는 기법. skill_key는 dialogue_ratio지만 비율은 재지 않는다 —
// 웹소설_작법_정리.md:156이 비율의 기계적 분석을 직접 지목했다.
//
// 좋은 답안·뚫기 표본은 지문에서 생성한다. 손으로 적으면 지문이 바뀔 때
// 조용히 낡는다. morph에는 null을 넘긴다 — 이 단계도 형태소가 필요 없다.

const monoLines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean)
const monoNoSpace = (t: string) => t.replace(/\s/g, '')

/**
 * 오탐 감시용 좋은 답안 20종. 전부 pass여야 한다.
 *
 * +반응서술판이 핵심이다. 좋은 답안이 서술을 한 줄도 안 만들면
 * maxNarrationLines의 오탐을 잴 수 없다 — 규칙을 바꾸면 좋은 답안 집합도
 * 바뀌는데, 생성기가 그 변화를 안 만들면 '오탐 0'은 검증이 아니라 미검증이다.
 *
 * 독백 1개: 짧은(지금 것) · 실제(46자쯤, 화면에서 사용자가 실제로 쓴 길이라
 * 135 상한에 걸렸었다) · 긴(78자쯤, 감정선을 더 살린 경우) · 강조반복(같은
 * 말 서너 번, 줄 안 최대 반복 3) 넷을 자리 2곳 × 반응서술 유무로 돈다.
 * 강조반복이 maxLineWordRepeat: 6의 근거 표본이다 — 이게 없으면 좋은 답안
 * 쪽 최대 반복이 1이 되어 왜 6인지 잴 수 없다.
 *
 * 독백 2개(둘 끼움): minMonologues는 1 이상이라 둘도 통과해야 한다. 짧은
 * 둘 · 실제 둘까지만 넣는다. 둘 다 긴(78자) 독백을 쓰면 233~249자로 200
 * 상한을 넘는다(MONOLOGUE_LONG 주석 참조) — [SE-02] 957은 "한 번씩"이라고
 * 말한다. minMonologues는 하한이지 둘을 권장하는 것이 아니므로 그 조합은
 * 표본에 넣지 않는다. 화면에서 그렇게 쓰는 사람이 나오면 그때 다시 본다.
 */
function monologueCleanCases(item: MonologueItem): { key: string; text: string }[] {
  const [l0, l1, l2, l3] = monoLines(item.passage)
  const out: { key: string; text: string }[] = []

  const singleVariants: { key: string; m: string }[] = [
    { key: '짧은독백', m: item.monologues[0] },
    { key: '실제독백', m: MONOLOGUE_REAL },
    { key: '긴독백', m: MONOLOGUE_LONG },
    { key: '강조반복', m: MONOLOGUE_EMPHASIS },
  ]
  const positions: { key: string; lines: (m: string) => string[] }[] = [
    { key: '2번자리', lines: (m) => [l0, l1, m, l2, l3] },
    { key: '3번자리', lines: (m) => [l0, l1, l2, m, l3] },
  ]
  for (const v of singleVariants) {
    for (const p of positions) {
      const lines = p.lines(v.m)
      out.push({ key: `${v.key}/${p.key}`, text: lines.join('\n') })
      out.push({ key: `${v.key}/${p.key}+반응서술`, text: [...lines, item.reaction].join('\n') })
    }
  }

  const doubleVariants: { key: string; a: string; b: string }[] = [
    { key: '짧은독백둘', a: item.monologues[0], b: item.monologues[1] },
    { key: '실제독백둘', a: MONOLOGUE_REAL, b: MONOLOGUE_REAL_SECOND },
  ]
  for (const v of doubleVariants) {
    const lines = [l0, l1, v.a, l2, v.b, l3]
    out.push({ key: v.key, text: lines.join('\n') })
    out.push({ key: `${v.key}+반응서술`, text: [...lines, item.reaction].join('\n') })
  }

  // 한숨 줄. maxNarrationLines: 3의 근거 표본이다. 지문 서술 1 + 한숨 1 +
  // 반응 서술 1 = 서술 3줄, 경계값이다. 화면에서 실제로 이 꼴(따옴표 없는
  // "하...")이 걸렸다.
  out.push({
    key: '한숨줄',
    text: [l0, l1, MONOLOGUE_SIGH, item.monologues[0], l2, l3, item.reaction].join('\n'),
  })

  return out
}

/**
 * 뚫기 20종. 대부분 지문에서 생성하므로 지문을 고치면 함께 따라온다.
 * '내용 통째 교체'·'지시문 예시 그대로' 둘은 지문과 무관한 것이 정의라
 * 예외다 — 상수 하나를 여덟이 함께 쓴다. 전부 fail이어야 한다.
 */
function monologueBypassCases(item: MonologueItem): { key: string; text: string }[] {
  const ls = monoLines(item.passage)
  const [l0, l1, l2, l3] = ls
  const m = item.monologues[0]
  const bare = (l: string) => (l.startsWith('"') ? l.slice(1, -1) : l)
  // "2번 자리"에 끼워 넣는다 — 나머지 검사는 전부 통과하는 정상적인 좋은
  // 답안 모양으로 만들어야, maxLineWordRepeat 하나만 걸리는지 볼 수 있다.
  const insertAt2 = (m2: string) => [l0, l1, m2, l2, l3].join('\n')
  const repeat = (word: string, n: number) => Array(n).fill(word).join(' ')
  return [
    { key: '원문 그대로', text: item.passage },
    { key: '독백 맨 앞', text: `${m}\n${item.passage}` },
    { key: '독백 맨 뒤', text: `${item.passage}\n${m}` },
    { key: '빈 독백', text: [l0, l1, "'…'", l2, l3].join('\n') },
    { key: '짧은 독백', text: [l0, l1, "'그런가.'", l2, l3].join('\n') },
    { key: '전부 독백으로', text: ls.map((l) => `'${bare(l)}'`).join('\n') },
    { key: '독백을 큰따옴표로', text: [l0, l1, `"${m.slice(1, -1)}"`, l2, l3].join('\n') },
    { key: '대사 하나만', text: `${l0}\n${l1}\n${m}` },
    { key: '서술만 더 붙임', text: `${item.passage}\n${MONOLOGUE_NARRATION_FILLER}` },
    { key: '아무 글자 한 줄', text: `${item.passage}\nㅁ` },
    { key: '같은 독백 되풀이', text: [l0, l1, m, m, l2, m, l3].join('\n') },
    { key: '개행만 함', text: (monoNoSpace(item.passage).match(/.{1,16}/g) ?? []).join('\n') },
    { key: '내용 통째 교체', text: MONOLOGUE_SWAP },
    // 지문에서 생성할 수 없다 — 예시가 지문과 무관한 것이 이 뚫기가
    // 성립하는 조건이다. 예시를 제 지문으로 되돌리면 이 뚫기는 모범 답안이
    // 되어 아홉 검사를 전부 통과한다(미검출 8/8, 실측값).
    { key: '지시문 예시 그대로', text: MONOLOGUE_INSTRUCTION_EXAMPLE },
    {
      key: '서술로 채움',
      text: [l0, MONOLOGUE_NARRATION_FILLER, l1, '부인은 말이 없었다.', m, '바람이 마당을 지났다.', l2, l3].join(
        '\n'
      ),
    },
    // 상한(200)을 넓히며 새로 생긴 구멍: 한 줄 안에서 같은 어절을 몰아
    // 쓰면 분량만 채운 것도 통과했다. maxLineWordRepeat가 이걸 잡는다.
    { key: '같은 어절 30회', text: insertAt2(`'${repeat('그러하다', 30)}'`) },
    { key: '두 어절 20회', text: insertAt2(`'${repeat('아이들 먹일', 20)}'`) },
    { key: '한 글자 어절 20회', text: insertAt2(`'${repeat('음', 20)}'`) },
    { key: '두 어절 15회', text: insertAt2(`'${repeat('정말', 15)}'`) },
    // maxNarrationLines: 3의 경계 확인. 한숨줄(서술 3줄, 경계값) 위에
    // 서술을 하나 더 얹어 대사 3줄을 넘어서게 만든다 — 서술 4줄은 걸려야
    // 한다.
    {
      key: '서술 4줄',
      text: [l0, l1, MONOLOGUE_SIGH, m, l2, l3, item.reaction, '바람이 마당을 지났다.'].join('\n'),
    },
  ]
}

console.log('\n[8단계 monologue: 오탐 감시 · 뚫기 표본 — 8문항 전수]')
{
  const run = (item: MonologueItem, text: string) => {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...MONOLOGUE_CFG, requireAny: [item.keyword] },
    }
    return combine(p, { text }, undefined, null)
  }
  const extra = (item: MonologueItem, caseKey: string, r: ReturnType<typeof run>) =>
    `${item.sourceKey}/${caseKey} 실제=${r.status} fail=${JSON.stringify(r.checks.filter((c) => c.status === 'fail').map((c) => c.key))}`

  for (const item of MONOLOGUE_ITEMS) {
    for (const c of monologueCleanCases(item)) {
      const r = run(item, c.text)
      t(`'${item.sourceKey}' clean '${c.key}' → pass`, r.status === 'pass', extra(item, c.key, r))
    }
    for (const c of monologueBypassCases(item)) {
      const r = run(item, c.text)
      t(`'${item.sourceKey}' bypass '${c.key}' → fail`, r.status === 'fail', extra(item, c.key, r))
    }
  }
}

console.log('\n[8단계 monologue: 밴드 의존 감시]')
{
  // 뚫기가 걸렸다는 사실만으로는 설계가 막았다는 뜻이 아니다. 분량 밴드에
  // 우연히 걸렸을 수 있다. minChars·maxChars를 뺀 설정으로 뚫기 전부를
  // 다시 돌려서 전부 여전히 fail인지 본다. 이번 변경의 핵심이다 — 상한을
  // 135→200으로 넓히며 "같은 어절 30회" 같은 뚫기 넷이 새로 생겼는데,
  // 이 감시가 0을 유지해야 maxLineWordRepeat가 밴드 없이도 그 넷을 스스로
  // 잡는다는 뜻이 된다. 이 검사가 깨지면 표본을 늘린 것이 아니라 설계가
  // 헐거워진 것이다.
  const { minChars, maxChars, ...rest } = MONOLOGUE_CFG
  void minChars
  void maxChars
  for (const item of MONOLOGUE_ITEMS) {
    for (const c of monologueBypassCases(item)) {
      const p: Problem = {
        id: item.sourceKey,
        type: 'convert',
        scoring_mode: 'auto',
        scoring_config: { ...rest, requireAny: [item.keyword] },
      }
      const r = combine(p, { text: c.text }, undefined, null)
      t(
        `'${item.sourceKey}' bypass '${c.key}' → 밴드 없이도 fail`,
        r.status === 'fail',
        `${item.sourceKey}/${c.key} 실제=${r.status} fail=${JSON.stringify(r.checks.filter((cc) => cc.status === 'fail').map((cc) => cc.key))}`
      )
    }
  }
}

console.log('\n[8단계 monologue: requireAny 의존 감시]')
{
  // 뚫기 20종 중 열여덟은 지문에서 생성되므로 keyword가 늘 살아 있다 —
  // requireAny는 그중 아무것도 잡지 않는다. 지문과 무관한 것은 이제
  // 둘이다('내용 통째 교체'·'지시문 예시 그대로'). requireAny를 빼면
  // 정확히 16건(둘 × 8문항)이 새야 한다. 8이면 지시문 예시 뚫기가
  // requireAny에 안 걸리고 있다는 뜻이고, 16보다 크면 표본이 바뀐 것이다.
  let leaked = 0
  const leakedKeys: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    for (const c of monologueBypassCases(item)) {
      const p: Problem = {
        id: item.sourceKey,
        type: 'convert',
        scoring_mode: 'auto',
        scoring_config: MONOLOGUE_CFG, // requireAny 없음
      }
      const r = combine(p, { text: c.text }, undefined, null)
      if (r.status === 'pass') {
        leaked++
        leakedKeys.push(`${item.sourceKey}/${c.key}`)
      }
    }
  }
  t(
    'requireAny를 빼면 정확히 16건(내용 통째 교체 · 지시문 예시)이 샘',
    leaked === 16,
    `실제=${leaked} ${JSON.stringify(leakedKeys)}`
  )
}

console.log('\n[8단계 monologue: 좋은 답안 최대반복 분포]')
{
  // maxLineWordRepeat: 6의 근거가 이 분포다. 강조반복(줄 안 최대 반복 3)이
  // 없으면 최대가 1이 되어 왜 6인지 잴 표본이 없어진다.
  const dist = new Map<number, number>()
  for (const item of MONOLOGUE_ITEMS) {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...MONOLOGUE_CFG, requireAny: [item.keyword] },
    }
    for (const c of monologueCleanCases(item)) {
      const r = combine(p, { text: c.text }, undefined, null)
      const check = r.checks.find((cc) => cc.key === 'maxLineWordRepeat')
      const n = check ? Number(check.detail.split('회')[0]) : NaN
      dist.set(n, (dist.get(n) ?? 0) + 1)
    }
  }
  console.log('  분포:', Object.fromEntries([...dist.entries()].sort((a, b) => a[0] - b[0])))
}

console.log('\n[8단계 monologue: maxLineWordRepeat 감도 감시]')
{
  // 1) 6을 3으로 낮춰도 좋은 답안은 안 걸려야 한다 — 강조반복의 줄 안 최대
  //    반복이 3이라(3 <= 3) 3이 경계값이다. 여기서 걸리면 표본이 바뀐 것이다.
  let brokenByThree = 0
  const brokenKeys: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...MONOLOGUE_CFG, maxLineWordRepeat: 3, requireAny: [item.keyword] },
    }
    for (const c of monologueCleanCases(item)) {
      const r = combine(p, { text: c.text }, undefined, null)
      if (r.status !== 'pass') {
        brokenByThree++
        brokenKeys.push(`${item.sourceKey}/${c.key}`)
      }
    }
  }
  t(
    'maxLineWordRepeat를 3으로 낮춰도 좋은 답안은 그대로 통과함',
    brokenByThree === 0,
    `걸린 건수=${brokenByThree} ${JSON.stringify(brokenKeys)}`
  )

  // 1b) 2로 낮추면 강조반복(최대 반복 3 > 2)은 걸려야 한다. 안 걸리면
  //     표본이 경계에 안 붙어 있다는 뜻이다 — 강조반복 외에는 안 걸려야
  //     한다(최대 반복이 1이므로).
  let brokenByTwo = 0
  const brokenByTwoKeys: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...MONOLOGUE_CFG, maxLineWordRepeat: 2, requireAny: [item.keyword] },
    }
    for (const c of monologueCleanCases(item)) {
      const r = combine(p, { text: c.text }, undefined, null)
      if (r.status !== 'pass') {
        brokenByTwo++
        brokenByTwoKeys.push(`${item.sourceKey}/${c.key}`)
      }
    }
  }
  const onlyEmphasisBroken = brokenByTwoKeys.every((k) => k.includes('강조반복'))
  t(
    'maxLineWordRepeat를 2로 낮추면 강조반복만 걸림(표본이 경계에 붙어 있음)',
    brokenByTwo > 0 && onlyEmphasisBroken,
    `걸린 건수=${brokenByTwo} ${JSON.stringify(brokenByTwoKeys)}`
  )

  // 2) maxLineWordRepeat를 빼면 뚫기 중 정확히 4종×8문항=32건이 새야
  //    한다(같은 어절 30회 · 두 어절 20회 · 한 글자 어절 20회 · 두 어절
  //    15회). 0이면 검사가 안 걸리는 것이고, 32보다 크면 다른 뚫기까지
  //    이 검사에 기대고 있었다는 뜻이다.
  const { maxLineWordRepeat, ...withoutRepeatCap } = MONOLOGUE_CFG
  void maxLineWordRepeat
  let leakedByNoCap = 0
  const leakedByNoCapKeys: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...withoutRepeatCap, requireAny: [item.keyword] },
    }
    for (const c of monologueBypassCases(item)) {
      const r = combine(p, { text: c.text }, undefined, null)
      if (r.status === 'pass') {
        leakedByNoCap++
        leakedByNoCapKeys.push(`${item.sourceKey}/${c.key}`)
      }
    }
  }
  t(
    'maxLineWordRepeat를 빼면 정확히 32건(줄 안 반복 뚫기 4종×8문항)이 샘',
    leakedByNoCap === 32,
    `실제=${leakedByNoCap} ${JSON.stringify(leakedByNoCapKeys)}`
  )
}

console.log('\n[8단계 monologue: 좋은 답안 서술 줄 분포]')
{
  // maxNarrationLines: 3의 근거가 이 분포다. 한숨줄(서술 3줄)이 없으면
  // 최대가 2가 되어 왜 3인지 잴 표본이 없어진다.
  const dist = new Map<number, number>()
  for (const item of MONOLOGUE_ITEMS) {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...MONOLOGUE_CFG, requireAny: [item.keyword] },
    }
    for (const c of monologueCleanCases(item)) {
      const r = combine(p, { text: c.text }, undefined, null)
      const check = r.checks.find((cc) => cc.key === 'maxNarrationLines')
      const n = check ? Number(check.detail.split('줄')[0]) : NaN
      dist.set(n, (dist.get(n) ?? 0) + 1)
    }
  }
  console.log('  분포:', Object.fromEntries([...dist.entries()].sort((a, b) => a[0] - b[0])))
}

console.log('\n[8단계 monologue: maxNarrationLines 감도 감시]')
{
  // 1) 3을 2로 낮추면 한숨줄(서술 3줄)만 걸려야 한다. 안 걸리면 표본이
  //    경계에 안 붙어 있다는 뜻이다.
  let brokenByTwoNarr = 0
  const brokenByTwoNarrKeys: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...MONOLOGUE_CFG, maxNarrationLines: 2, requireAny: [item.keyword] },
    }
    for (const c of monologueCleanCases(item)) {
      const r = combine(p, { text: c.text }, undefined, null)
      if (r.status !== 'pass') {
        brokenByTwoNarr++
        brokenByTwoNarrKeys.push(`${item.sourceKey}/${c.key}`)
      }
    }
  }
  const onlySighBroken = brokenByTwoNarrKeys.every((k) => k.endsWith('/한숨줄'))
  t(
    'maxNarrationLines를 2로 낮추면 한숨줄만 걸림(표본이 경계에 붙어 있음)',
    brokenByTwoNarr > 0 && onlySighBroken,
    `걸린 건수=${brokenByTwoNarr} ${JSON.stringify(brokenByTwoNarrKeys)}`
  )

  // 2) 3을 4로 올리면 뚫기 중 '서술 4줄'이 새야 한다. 재보니 '서술로 채움'도
  //    서술 줄이 정확히 4(지문 1 + MONOLOGUE_NARRATION_FILLER + '부인은
  //    말이 없었다.' + '바람이 마당을 지났다.')라 3에서 이미 걸리고 있었고,
  //    4로 올리면 같이 샌다. 8건이라고 억지로 맞추지 않고 실제 16건(둘 다
  //    서술 4줄)을 그대로 단정한다.
  const { maxNarrationLines, ...withoutNarrationCap } = MONOLOGUE_CFG
  void maxNarrationLines
  let leakedByFour = 0
  const leakedByFourKeys: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    const p: Problem = {
      id: item.sourceKey,
      type: 'convert',
      scoring_mode: 'auto',
      scoring_config: { ...withoutNarrationCap, maxNarrationLines: 4, requireAny: [item.keyword] },
    }
    for (const c of monologueBypassCases(item)) {
      const r = combine(p, { text: c.text }, undefined, null)
      if (r.status === 'pass') {
        leakedByFour++
        leakedByFourKeys.push(`${item.sourceKey}/${c.key}`)
      }
    }
  }
  const onlyFourLineNarrLeaked = leakedByFourKeys.every(
    (k) => k.endsWith('/서술 4줄') || k.endsWith('/서술로 채움')
  )
  t(
    'maxNarrationLines를 4로 올리면 서술 줄 4개짜리 뚫기만 샘(서술 4줄·서술로 채움 각 8건)',
    leakedByFour === 16 && onlyFourLineNarrLeaked,
    `실제=${leakedByFour} ${JSON.stringify(leakedByFourKeys)}`
  )
}

// 지문 규칙(passage-rules.ts)이 실제로 붙어 있는지. tone은 scoring_config에
// 안 들어가 MonologueItem에도 없다 — 여기서만 쓰는 검증용 데이터다.
const MONOLOGUE_TONE: Record<string, string> = {
  'mo-heungbu-swallow': 'planned',
  'mo-simcheong-rice': 'planned',
  'mo-kongjwi-shoe': 'impulsive',
  'mo-axe-pond': 'planned',
  'mo-siblings-rope': 'impulsive',
  'mo-rabbit-gate': 'planned',
  'mo-gyeonu-bridge': 'planned',
  'mo-goblin-club': 'impulsive',
}
const passageInputOf = (item: MonologueItem): PassageRuleInput => ({
  sourceKey: item.sourceKey,
  keyword: item.keyword,
  passage: item.passage,
  dialogueLines: dialogueLinesOf(item),
  difficulty: item.difficulty,
  tone: MONOLOGUE_TONE[item.sourceKey],
})

console.log('\n[8단계 monologue: 지문 규칙 — passage-rules.ts 포팅]')
{
  for (const item of MONOLOGUE_ITEMS) {
    const fails = checkPassageRules(passageInputOf(item))
    t(`'${item.sourceKey}' 지문 규칙(공용) 통과`, fails.length === 0, JSON.stringify(fails))
  }

  const setFails = checkPassageSetRules(MONOLOGUE_ITEMS.map(passageInputOf), {
    difficulty: { 1: 4, 2: 4 },
    tone: { planned: 5, impulsive: 3 },
    maxLengthSpread: 20,
  })
  t('문항 집합 규칙(분포·중복) 통과', setFails.length === 0, JSON.stringify(setFails))

  for (const item of MONOLOGUE_ITEMS) {
    const fails = validateMonologueItem(item)
    t(`'${item.sourceKey}' 지문 규칙(8단계 전용) 통과`, fails.length === 0, JSON.stringify(fails))
  }
}

// ── 회귀 조건 3건 — 포팅이 옳았다는 유일한 증거 ────────────────────
//
// 옛 결함을 다시 잡아야 포팅이 뜻을 지킨 것이다. 셋 다 초안 단계에서
// 실제로 났던 결함이고, 지금 이 검사들이 잡아준 것들이다.
console.log('\n[8단계 monologue: 회귀 조건 3건]')
{
  // 1) keyword를 '도끼'로 바꾸면 LEAK_PROBE의 '도끼눈을 떴다'에 샌다고
  //    걸려야 한다. 지금 실제 keyword는 '쇠도끼'라 안 샌다.
  const axe = MONOLOGUE_ITEMS.find((i) => i.sourceKey === 'mo-axe-pond')!
  const leakFails = checkPassageRules({ ...passageInputOf(axe), keyword: '도끼' })
  t(
    "회귀1: keyword를 '도끼'로 바꾸면 흔한 말 누출이 걸림",
    leakFails.some((f) => f.includes('흔한 말에 샌다')),
    JSON.stringify(leakFails)
  )

  // 2) mo-rabbit-gate 셋째 대사를 옛 문장("...혀를 믿을 수 없습니다.")으로
  //    되돌리면 종결어미가 둘째 대사("...왔사옵니다.")와 겹친다고 걸려야
  //    한다 — 둘 다 '니다'로 끝난다.
  const rabbit = MONOLOGUE_ITEMS.find((i) => i.sourceKey === 'mo-rabbit-gate')!
  const rabbitLines = dialogueLinesOf(rabbit)
  const oldDialogueLines = [rabbitLines[0], rabbitLines[1], '"용궁까지 온 놈의 혀를 믿을 수 없습니다."']
  const endingFails = checkPassageRules({ ...passageInputOf(rabbit), dialogueLines: oldDialogueLines })
  t(
    '회귀2: 옛 셋째 대사로 되돌리면 종결어미 충돌이 걸림',
    endingFails.some((f) => f.includes('종결어미가 겹친다')),
    JSON.stringify(endingFails)
  )

  // 3) 서술 줄 정의를 "큰따옴표로 시작 안 함"(옛 버그)으로 되돌리면 좋은
  //    답안의 서술 줄 수가 1이 아니라고(독백 줄까지 서술로 세어짐) 걸려야
  //    한다. local.ts의 실제 구현은 건드리지 않고 옛 정의만 여기서 재현한다.
  const oldCountNarrationLines = (text: string): number =>
    text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !l.startsWith('"')).length
  const heungbu = MONOLOGUE_ITEMS.find((i) => i.sourceKey === 'mo-heungbu-swallow')!
  const sample = monologueCleanCases(heungbu).find((c) => c.key === '짧은독백/2번자리')!.text
  t(
    '회귀3: 서술 정의를 큰따옴표 기준으로 되돌리면 서술 줄 수가 1이 아님',
    oldCountNarrationLines(sample) !== 1,
    `실제=${oldCountNarrationLines(sample)}`
  )
}

// ── 설정 일치 · 키 가드 ──────────────────────────────────────────
//
// 문항 SQL은 여덟 중 일부만 먼저 들어올 수 있다(지금은 mo-heungbu-swallow
// 하나). 비교할 대상이 없을 때 통과로 세면 이 검사가 아무것도 안 지키면서
// 숫자만 채운다. 6단계 forbidWords 검사가 쓰는 "건너뜀"과 같은 자리다.
//
// 설정 일치는 "전부 갖췄을 때 전부 맞는가"를 보는 완결성 검사라 8개가
// 다 있어야 의미가 있다 — 7개가 없는데 1개만 비교하고 통과라고 하면
// 나머지 7개의 부재를 숨기는 꼴이다. 그래서 8개 미만이면 통째로 건너뛴다.
//
// 키 가드는 반대로 항목마다 독립된 체크리스트다. 그 항목이 덤프에 없으면
// 그 항목만 건너뛰고, 있으면 그 항목만 잰다 — 다른 일곱이 없다고 해서
// 이미 들어온 하나까지 건너뛸 이유가 없다.
console.log('\n[8단계 monologue: 설정 일치 · 키 가드]')
{
  interface DumpProblem {
    skill_key: string
    source_key: string
    instruction: string
    scoring_config: Record<string, unknown>
  }

  const dumpPath = path.join(__dirname, '..', '..', 'seed', 'dump', 'problems.json')
  const raw = readFileSync(dumpPath, 'utf8').replace(/^\uFEFF/, '')
  const dumpProblems: DumpProblem[] = JSON.parse(raw)
  const dialogueDump = dumpProblems.filter((dp) => dp.skill_key === 'dialogue_ratio')
  const dialogueDumpKeys = new Set(dialogueDump.map((dp) => dp.source_key))

  const canon = (o: Record<string, unknown>) => JSON.stringify(o, Object.keys(o).sort())

  // 설정 일치 검사 1건: 8개가 전부 덤프에 있을 때만 잰다.
  if (dialogueDump.length < MONOLOGUE_ITEMS.length) {
    console.log(
      `  건너뜀 (설정 일치: 덤프에 dialogue_ratio 문항 ${dialogueDump.length}/${MONOLOGUE_ITEMS.length}개 — 전부 갖춰지지 않음)`
    )
  } else {
    const mismatches = dialogueDump.filter((dp) => {
      const item = MONOLOGUE_ITEMS.find((i) => i.sourceKey === dp.source_key)
      if (!item) return true
      const want = { ...MONOLOGUE_CFG, requireAny: [item.keyword] }
      return canon(dp.scoring_config) !== canon(want)
    })
    t(
      'MONOLOGUE_CFG와 덤프 8문항의 scoring_config가 같음',
      mismatches.length === 0,
      `어긋난 source_key=${JSON.stringify(mismatches.map((m) => m.source_key))}`
    )
  }

  // 키 가드 8건: 항목마다 따로 잰다. 그 항목이 덤프에 없으면 그 항목만
  // 건너뛴다.
  const guardSkipped: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    if (!dialogueDumpKeys.has(item.sourceKey)) {
      guardSkipped.push(item.sourceKey)
      continue
    }
    t(
      `'${item.sourceKey}' 가 덤프의 dialogue_ratio 문항과 일치`,
      dialogueDumpKeys.has(item.sourceKey),
      `덤프 dialogue_ratio 키=${JSON.stringify([...dialogueDumpKeys])}`
    )
  }
  if (guardSkipped.length > 0) {
    console.log(`  건너뜀 (키 가드: 덤프에 dialogue_ratio 문항 없음): ${guardSkipped.join(', ')}`)
  }

  // 지시문 일치 가드 8건: 키 가드와 같은 모양이다 — 그 항목이 덤프에
  // 없으면 그 항목만 건너뛴다. 이 가드가 없으면 예시를 제 지문으로
  // 되돌리는 변경이 덤프에서 조용히 일어나고, '지시문 예시 그대로' 뚫기는
  // 상수(MONOLOGUE_INSTRUCTION_EXAMPLE) 쪽만 보고 있어서 계속 통과라고
  // 말한다 — 감시가 실제 배포물을 안 보는 상태가 된다.
  const instructionGuardSkipped: string[] = []
  for (const item of MONOLOGUE_ITEMS) {
    const dp = dialogueDump.find((d) => d.source_key === item.sourceKey)
    if (!dp) {
      instructionGuardSkipped.push(item.sourceKey)
      continue
    }
    t(
      `'${item.sourceKey}' 덤프 instruction이 MONOLOGUE_INSTRUCTION과 같음`,
      dp.instruction === MONOLOGUE_INSTRUCTION,
      `덤프=${JSON.stringify(dp.instruction)}`
    )
  }
  if (instructionGuardSkipped.length > 0) {
    console.log(`  건너뜀 (지시문 일치: 덤프에 dialogue_ratio 문항 없음): ${instructionGuardSkipped.join(', ')}`)
  }
}

// ── rule 누락 감시 — 이 지시서의 핵심 장치 ────────────────────────────
//
// 지금은 이 감시가 없으면 다음에 검사를 추가하는 사람이 rule을 빈
// 문자열로 채우고 넘어가도 타입은 통과하고 화면에서는 빈 줄로 보인다.
// 아무도 안 본다. 덤프 문항 전부에 gradeLocal을 두 번(빈 문자열 한 번,
// 지문으로 한 번) 돌리고, pendingMorphChecks도 함께 본다.

// ── 9단계 pov_lock: 조망→밀착 ─────────────────────────────────────────
//
// morph에 null을 넘긴다 — 이 단계는 형태소가 필요 없다.
//
// 설계서 ch02_pov.json의 require_sense_verb를 requireAny로 그대로 옮기면
// 양쪽으로 틀린다(미검출 5/10 · 오탐 2/8). "보였다"라는 낱말의 유무는
// 밀착의 지표가 아니기 때문이다. 검사를 더하지 않고 재료를 바꿨다 —
// requireAny를 시점 인물 이름으로, forbidWords에 조망 표지를 넣어
// 미검출 1 · 오탐 0으로 내렸다. 남은 미검출 1은 povKnownGapCase다.
const povCfgOf = (item: PovItem) => ({
  ...POV_CFG,
  forbidWords: [...DEICTIC, ...item.relic],
  requireAny: [item.pov],
})
const runPov = (item: PovItem, text: string, cfg: ScoringConfig = povCfgOf(item)) =>
  combine(
    { id: item.sourceKey, type: 'convert', scoring_mode: 'hybrid', scoring_config: cfg } as Problem,
    { text },
    undefined,
    null
  )
const povExtra = (item: PovItem, key: string, r: ReturnType<typeof runPov>) =>
  `${item.sourceKey}/${key} 실제=${r.status} fail=${JSON.stringify(r.checks.filter((c) => c.status === 'fail').map((c) => c.key))}`

console.log('\n[9단계 pov_lock: 오탐 감시 · 뚫기 표본 · 알려진 한계 — 8문항 전수]')
{
  for (const item of POV_ITEMS) {
    for (const c of povCleanCases(item)) {
      const r = runPov(item, c.text)
      t(`'${item.sourceKey}' clean '${c.key}' → pass`, r.status === 'pass', povExtra(item, c.key, r))
    }
    for (const c of povBypassCases(item)) {
      const r = runPov(item, c.text)
      t(`'${item.sourceKey}' bypass '${c.key}' → fail`, r.status === 'fail', povExtra(item, c.key, r))
    }
    // 알려진 한계: 이름을 박고 내용을 통째로 바꾼 답안. 지금은 pass가 맞다.
    // 이것이 fail로 바뀌면 누군가 규칙을 조인 것이다 — 바로 아래
    // 밴드 의존 감시의 오탐 수를 함께 봐라.
    const g = povKnownGapCase(item)
    const r = runPov(item, g.text)
    t(`'${item.sourceKey}' 알려진 한계 '${g.key}' → pass`, r.status === 'pass', povExtra(item, g.key, r))
  }
}

console.log('\n[9단계 pov_lock: 밴드 의존 감시]')
{
  // 뚫기가 걸렸다는 사실만으로는 설계가 막았다는 뜻이 아니다. 분량 밴드에
  // 우연히 걸렸을 수 있다. 8단계는 "밴드 없이도 전부 fail"을 요구했지만
  // 9단계에는 그럴 수 없는 뚫기가 하나 있다 — '이름만 냄'(2자)은 실제로
  // 길이 문제라 minChars가 잡는 것이 맞다. 그래서 0을 요구하는 대신
  // 밴드에 기대는 뚫기가 정확히 그 하나인지를 본다. 다른 것이 여기
  // 끼어들면 설계가 헐거워진 것이다.
  const BAND_ONLY = new Set(['이름만 냄'])
  const { minChars, maxChars, ...rest } = POV_CFG
  void minChars
  void maxChars
  for (const item of POV_ITEMS) {
    for (const c of povBypassCases(item)) {
      const bare = { ...rest, forbidWords: [...DEICTIC, ...item.relic], requireAny: [item.pov] }
      const r = runPov(item, c.text, bare)
      const expected = !BAND_ONLY.has(c.key)
      t(
        `'${item.sourceKey}' bypass '${c.key}' → 밴드 없이 ${expected ? 'fail' : 'pass(길이 문제)'}`,
        (r.status === 'fail') === expected,
        povExtra(item, c.key, r)
      )
    }
  }
}

console.log('\n[9단계 pov_lock: minChars 감도 감시]')
{
  // 미검출을 밴드로 메우려는 시도를 잡는다. 30이면 좋은 답안 셋이 경계에
  // 닿고, 40이면 64건 중 52건이 걸린다. 20이 오탐 0인 마지막 값이 아니라
  // 넓은 빈 구간(2~29) 안쪽이라는 것이 요점이다.
  const fpAt = (m: number) =>
    POV_ITEMS.reduce(
      (n, item) =>
        n + item.goods.filter((g) => runPov(item, g, { ...povCfgOf(item), minChars: m }).status !== 'pass').length,
      0
    )
  t('minChars 20에서 좋은 답안 오탐 0', fpAt(20) === 0, `실제=${fpAt(20)}`)
  t('minChars 30이면 좋은 답안 셋이 걸린다', fpAt(30) === 3, `실제=${fpAt(30)}`)
  t('minChars 40이면 좋은 답안 대부분이 걸린다', fpAt(40) >= 50, `실제=${fpAt(40)}`)
}

console.log('\n[9단계 pov_lock: requireAny 의존 감시]')
{
  // requireAny(시점 인물 이름)를 빼면 어느 뚫기가 새는지. 이름 요구가
  // 실제로 일하고 있다는 증거다 — 특히 '1인칭으로 바꿈'과
  // '조망 유지 · 이름 없음'을 잡는 것이 이름 requireAny다.
  // 그래서 1인칭 검사를 따로 만들지 않는다('나' 80회 · '내' 54회 누출이고
  // 주어를 생략한 1인칭은 원리적으로 못 잡는다).
  const NEEDS_NAME = new Set(['조망 유지 · 이름 없음'])
  for (const item of POV_ITEMS) {
    for (const c of povBypassCases(item)) {
      if (!NEEDS_NAME.has(c.key)) continue
      const noName = { ...POV_CFG, forbidWords: [...DEICTIC, ...item.relic] }
      const r = runPov(item, c.text, noName)
      t(
        `'${item.sourceKey}' bypass '${c.key}' → requireAny 없으면 샌다`,
        r.status === 'pass',
        povExtra(item, c.key, r)
      )
    }
  }
}

console.log('\n[9단계 pov_lock: relic 의존 감시 — 세는 표현이 일한다]')
{
  // relic[0](세는 표현)을 빼면 '지시어만 뺌'이 샌다. 종결 표현 쪽인
  // relic[1]만으로는 못 막는다는 것이 실측이다(미검출 3 대 1).
  for (const item of POV_ITEMS) {
    const onlyTail = { ...POV_CFG, forbidWords: [...DEICTIC, item.relic[1]], requireAny: [item.pov] }
    const c = povBypassCases(item).find((x) => x.key === '세는 표현만 남김')!
    const r = runPov(item, c.text, onlyTail)
    t(
      `'${item.sourceKey}' relic[0]을 빼면 '세는 표현만 남김'이 샌다`,
      r.status === 'pass',
      povExtra(item, c.key, r)
    )
  }
}

console.log('\n[9단계 pov_lock: MAX_ECHO 감도 감시]')
{
  // 겹침 상한을 조이려는 시도를 잡는다.
  //
  // ★ 빈 구간이 8~10 하나뿐이고 폭이 2다. 8단계 maxLineWordRepeat은
  //   3~15 사이에서 6을 골랐다(폭 12). 아래 좋은 답안 64건의 실제 겹침
  //   최대는 4자지만 그 수를 믿고 6으로 내리면 안 된다 — 폭 2는 일부러
  //   재사용을 넣은 표본에서 나온 값이다("여자하나가" 5 · "하늘에별이떠있" 7 ·
  //   "하늘에별이떠있고" 8은 전부 자연스러운 재작성이다).
  const echoes = POV_ITEMS.flatMap((i) => i.goods.map((g) => echoLen(g, i.gaze)))
  const maxEcho = Math.max(...echoes)
  t('좋은 답안 64건이 전부 MAX_ECHO 미만', maxEcho < MAX_ECHO, `실제 최대=${maxEcho}`)
  t('MAX_ECHO가 9다 — 폭 2를 모르고 조이지 마라', MAX_ECHO === 9, `실제=${MAX_ECHO}`)

  // 대조 대상을 지문 전체로 넓히면 안 된다는 것을 박아 둔다.
  // stage까지 넣으면 좋은 답안이 무대 줄을 살렸을 때 걸린다.
  const wide = POV_ITEMS.flatMap((i) => i.goods.map((g) => echoLen(g, passageOf(i))))
  t(
    '대조 대상을 지문 전체로 넓히면 겹침이 커진다 — gaze만 대조하는 이유',
    Math.max(...wide) > maxEcho,
    `gaze=${maxEcho} 지문전체=${Math.max(...wide)}`
  )
}

console.log('\n[9단계 pov_lock: 지문 규칙 — passage-rules.ts 포팅]')
{
  // tone은 scoring_config에 안 들어가 PovItem에도 없다 — 여기서만 쓰는
  // 검증용 데이터다. genre_tag도 코드가 안 쓴다(gen-seed.ts가 DB로 나르기만
  // 한다). 8문항짜리 단계 다섯이 전부 fantasy 4 · modern 2 · martial 1 ·
  // romance 1이라 같은 분포를 따랐다. 설계서 ch02의 3장르 균등은 72문항
  // (8드릴×3장르×3난이도) 카탈로그의 축이라 여기엔 안 맞는다.
  const POV_TONE: Record<string, string> = {
    'pv-star-field': 'planned',
    'pv-guild-desk': 'planned',
    'pv-dawn-market': 'impulsive',
    'pv-drill-yard': 'impulsive',
    'pv-lantern-night': 'planned',
    'pv-banquet-hall': 'planned',
    'pv-broken-gate': 'planned',
    'pv-frozen-lake': 'impulsive',
  }
  // 9단계 지문에는 대사가 없다. dialogueLines를 빈 배열로 넘기면 종결어미
  // 규칙 둘이 조용히 통과한다 — 그 '조용히'는 validatePovItem의 따옴표
  // 검사가 막는다.
  const povPassageInput = (item: PovItem): PassageRuleInput => ({
    sourceKey: item.sourceKey,
    keyword: item.pov,
    passage: passageOf(item),
    dialogueLines: [],
    difficulty: item.difficulty,
    tone: POV_TONE[item.sourceKey],
  })

  for (const item of POV_ITEMS) {
    const fails = checkPassageRules(povPassageInput(item))
    t(`'${item.sourceKey}' 지문 규칙(공용) 통과`, fails.length === 0, JSON.stringify(fails))
  }

  const setFails = checkPassageSetRules(POV_ITEMS.map(povPassageInput), {
    difficulty: { 1: 4, 2: 4 },
    tone: { planned: 5, impulsive: 3 },
    maxLengthSpread: 20,
  })
  t('문항 집합 규칙(분포·중복) 통과', setFails.length === 0, JSON.stringify(setFails))

  for (const item of POV_ITEMS) {
    const fails = validatePovItem(item)
    t(`'${item.sourceKey}' 지문 규칙(9단계 전용) 통과`, fails.length === 0, JSON.stringify(fails))
  }

  // relic을 사람이 문항마다 고른다. 고르는 사람이 자기 지문의 결함을 못 본다 —
  // 교차로 세는 것이 유일한 방법이다.
  const cross = crossCheckPovItems(POV_ITEMS)
  t('문항 사이 교차 검사(relic · 이름) 통과', cross.length === 0, JSON.stringify(cross))
}

console.log('\n[9단계 pov_lock: 설정 일치 · 키 가드]')
{
  t('POV_CFG minChars 20', POV_CFG.minChars === 20, `실제=${POV_CFG.minChars}`)
  t('POV_CFG maxChars 130', POV_CFG.maxChars === 130, `실제=${POV_CFG.maxChars}`)
  t('문항 8건', POV_ITEMS.length === 8, `실제=${POV_ITEMS.length}`)
  t(
    '좋은 답안 64건',
    POV_ITEMS.reduce((n, i) => n + i.goods.length, 0) === 64,
    `실제=${POV_ITEMS.reduce((n, i) => n + i.goods.length, 0)}`
  )
  t(
    "DEICTIC에 '저 '(뒤 공백)가 없다 — 덤프 실측 오탐 2회",
    !DEICTIC.includes('저 '),
    JSON.stringify(DEICTIC)
  )
  // 키 가드: scoring_config에 넣는 키가 ScoringConfig에 있는 것뿐인지.
  // 오타가 나면 그 검사는 조용히 사라진다.
  const KNOWN = new Set(['minChars', 'maxChars', 'forbidWords', 'requireAny'])
  const unknown = Object.keys(povCfgOf(POV_ITEMS[0])).filter((k) => !KNOWN.has(k))
  t('scoring_config에 모르는 키가 없다', unknown.length === 0, JSON.stringify(unknown))
}

// ── requireInLastLine: 검사 자체를 뚫어 본다 ─────────────────────────
//
// 10단계 문항이 아직 0건이라 지문 픽스처가 없다. 그렇다고 검사만 넣고
// 다음 사람에게 넘기면 세션 10 §8-1과 같은 자리가 된다 — 스캐너 주석에
// "이게 틀리면 아래가 전부 거짓 통과"라고 써 놓고 정작 그 스캐너를 표본
// 밖으로 안 밀었던 자리다. 여기서는 검사가 서는 날 바로 민다.
//
// 지문 픽스처가 들어오면 이 블록을 지우지 마라. 이건 검사의 단위 시험이고,
// 그쪽은 문항의 감도 시험이다. 다른 것을 잰다.
console.log('\n[10단계: requireInLastLine 물기 시험]')
{
  const EL = '왼발 페인트'
  const run = (text: string, cfg: ScoringConfig) =>
    gradeLocal({ id: 'act', type: 'convert', scoring_mode: 'auto', scoring_config: cfg } as Problem, { text })
  const lastLineStatus = (text: string) =>
    run(text, { requireInLastLine: [EL] }).find((c) => c.key === 'requireInLastLine')?.status
  const anyStatus = (text: string) => run(text, { requireAny: [EL] }).find((c) => c.key === 'requireAny')?.status

  const BUILD = '숨이 턱까지 찼다.\n상대가 어깨를 틀었다.\n무게가 앞으로 쏠렸다.'
  const cases: { key: string; text: string; want: 'pass' | 'fail' }[] = [
    { key: '요소가 마지막 줄에', text: `${BUILD}\n태윤의 왼발 페인트가 턱을 채갔다.`, want: 'pass' },
    // 이것이 이 검사를 만든 이유다. requireAny는 여기서 pass한다.
    { key: '요소가 첫 줄에만', text: `태윤은 왼발 페인트를 떠올렸다.\n상대가 어깨를 틀었다.\n무게가 앞으로 쏠렸다.\n주먹이 허공을 갈랐다.`, want: 'fail' },
    // 첫 줄만으로는 병 하나가 얇다. '본문 전체를 본다'로 잘못 짜면
    // 이 둘이 함께 물어야 한다 — 첫 줄 하나로는 물림이 1건이었다.
    { key: '요소가 가운데 줄에', text: `숨이 턱까지 찼다.\n태윤의 왼발 페인트가 스쳤다.\n무게가 앞으로 쏠렸다.\n주먹이 허공을 갈랐다.`, want: 'fail' },
    { key: '요소가 아예 없음', text: `${BUILD}\n주먹이 턱을 채갔다.`, want: 'fail' },
    // 답안 끝의 빈 줄·공백 줄이 판정을 뒤집으면 안 된다. lines가 빈 줄을
    // 버리는 것에 이 검사가 기대고 있다는 뜻이라 여기 박아 둔다.
    { key: '끝에 빈 줄이 붙음', text: `${BUILD}\n태윤의 왼발 페인트가 턱을 채갔다.\n\n   \n`, want: 'pass' },
    { key: '답안이 빔', text: '', want: 'fail' },
    // ★ 요소가 줄바꿈에 걸치면 fail이다. 검사의 결함이 아니라 지문이
    //   지켜야 할 요건이다 — 결정타 요소를 한두 어절로 짧게 골라라.
    //   길게 고르면 좋은 답안이 줄을 나눴다는 이유로 죽는다.
    { key: '요소가 줄바꿈에 걸침', text: `상대가 어깨를 틀었다.\n무게가 앞으로 쏠렸다.\n숨이 멎었다.\n태윤의 왼발\n페인트가 턱을 채갔다.`, want: 'fail' },
  ]
  for (const c of cases) {
    t(`requireInLastLine '${c.key}' → ${c.want}`, lastLineStatus(c.text) === c.want, `실제=${lastLineStatus(c.text)}`)
  }

  // 병을 넣어 물린다: 검사를 빼면 '요소가 첫 줄에만'이 새야 한다.
  // 새지 않으면 다른 검사가 대신 잡고 있는 것이고, 그러면 이 검사가
  // 무엇을 하는지 아무도 모르는 상태가 된다.
  const leak = cases.find((c) => c.key === '요소가 첫 줄에만')!
  t(
    'requireInLastLine을 빼면 그 뚫기가 샌다 — 이 검사가 하는 일',
    run(leak.text, { requireAny: [EL] }).every((c) => c.status === 'pass'),
    JSON.stringify(run(leak.text, { requireAny: [EL] }).filter((c) => c.status !== 'pass').map((c) => c.key))
  )

  // 포함 관계. 목록이 같으면 requireAny는 탐지에 0을 더한다 —
  // 마지막 줄은 본문의 부분 문자열이므로 이쪽이 pass면 저쪽도 반드시 pass다.
  // 덤프 지문·지시문 154건 + 9단계 좋은 답안·뚫기 87건에서 길이 2~6의
  // 부분 문자열을 요소로 삼아 26162쌍을 재면 반례 0 · 이쪽만 잡는 자리 4580이다.
  // requireAny를 함께 두는 것은 화면에 두 단계로 알려 주려는 것이지
  // 두 검사가 각각 잡기 때문이 아니다. 여기 여섯 건으로 그 관계를 박아 둔다.
  for (const c of cases) {
    if (lastLineStatus(c.text) !== 'pass') continue
    t(`'${c.key}' 마지막 줄 pass면 requireAny도 pass`, anyStatus(c.text) === 'pass', `requireAny=${anyStatus(c.text)}`)
  }
}


// ── 10단계 fill(동작에 이유 넣기): 빈칸 채점 ──────────────────────────
//
// 재설계안 11-3장. 고정 줄 사이에 뚫린 빈칸을 채운다. 채점은 빈칸마다
// 기존 줄 검사(분량·문장 수·금지어)를 재사용하고, 새 규칙은
// forbidCopyOfFixedLines 하나다.
//
// 시드는 아직 없다(재설계안 11-5 2번). 그래서 여기 재료는 재설계안
// 7-7장 at-broken-gate 를 그대로 옮긴 것이다. 시드가 들어오면 이 블록을
// 지우지 마라 — 이건 검사의 단위 시험이고, 그쪽은 문항의 감도 시험이다.
//
// ★ 물기 시험 넷(재설계안 11-5 1번): 빈칸 하나 비우기 · 고정 줄 베끼기 ·
//   61자 · 대괄호. 넷이 다 물리는 것을 보고 커밋한다.
console.log('\n[10단계 fill: 빈칸 채점 물기 시험]')
{
  const FIXED = [
    '마수의 앞발이 세연을 성문 잔해로 밀어붙였다.',
    '세연은 부러진 창끝을 두 손으로 고쳐 쥐었다.',
    '마수가 몸을 낮추고 머리를 들이밀었다.',
    '창끝이 마수의 목을 찔렀다.',
  ]
  const CFG: ScoringConfig = {
    blanks: [
      { key: '①', label: '세연이 이 순간 무엇을 하는지', minSentences: 1, maxSentences: 2, maxChars: 60, optional: true },
      { key: '②', label: '무엇을 보고 목을 노렸는지', minSentences: 1, maxSentences: 2, maxChars: 60 },
    ],
    fixedLines: FIXED,
    forbidCopyOfFixedLines: true,
    forbidWords: ['[상황]', '[복선]', '[결정타]'],
  }
  const run = (blanks: Record<string, string>, cfg: ScoringConfig = CFG) =>
    gradeLocal({ id: 'bg', type: 'fill', scoring_mode: 'auto', scoring_config: cfg } as Problem, { blanks })
  const statusOfRun = (checks: ReturnType<typeof run>) =>
    checks.some((c) => c.status === 'fail') ? 'fail' : checks.some((c) => c.status === 'pending') ? 'pending' : 'pass'
  const failKeys = (checks: ReturnType<typeof run>) =>
    JSON.stringify(checks.filter((c) => c.status === 'fail').map((c) => c.key))

  // 좋은 답안 둘(7-7장 가·나) — 전부 통과해야 한다.
  const CLEAN: Record<string, string>[] = [
    { '①': '등이 돌무더기에 처박혔다. 숨이 한 번에 빠져나갔다.', '②': '목을 덮은 비늘 사이로 역린이 드러났다.' },
    {
      '①': '세연은 잔해에 손을 짚고 몸을 일으켰다. 팔이 말을 듣지 않았다.',
      '②': '들이미는 머리에 따라 빈틈이 보였다. 목 아래 비늘이 얇은 자리가 거기였다.',
    },
  ]
  CLEAN.forEach((blanks, i) => {
    const r = run(blanks)
    t(`fill clean ${i + 1} → pass`, statusOfRun(r) === 'pass', failKeys(r))
  })

  // ①을 아예 안 채운다 — optional 이라 통과해야 한다(7-10-2 '가').
  {
    const r = run({ '②': '목을 덮은 비늘 사이로 역린이 드러났다.' })
    const c = r.find((x) => x.key === 'fill:①:filled')
    t('fill ① 비움(optional) → pass', c?.status === 'pass' && statusOfRun(r) === 'pass', failKeys(r))
  }

  // ── 물기 병 넷 ──
  const LONG = '가'.repeat(61) // 글자 61자, 1문장 (maxChars 60 초과)
  const bottles: { key: string; blanks: Record<string, string>; failKey: string }[] = [
    {
      key: '빈칸 하나 비움',
      blanks: { '①': '등이 돌무더기에 처박혔다.', '②': '' },
      failKey: 'fill:②:filled',
    },
    {
      key: '고정 줄 베낌',
      blanks: { '①': '등이 돌무더기에 처박혔다.', '②': '마수가 몸을 낮추고 머리를 들이밀었다.' },
      failKey: 'fill:②:copy',
    },
    {
      key: '61자',
      blanks: { '①': '등이 돌무더기에 처박혔다.', '②': LONG },
      failKey: 'fill:②:maxChars',
    },
    {
      key: '대괄호',
      blanks: { '①': '등이 돌무더기에 처박혔다.', '②': '[결정타] 역린이 드러났다.' },
      failKey: 'forbidWords',
    },
  ]
  for (const b of bottles) {
    const r = run(b.blanks)
    const c = r.find((x) => x.key === b.failKey)
    t(`fill 병 '${b.key}' → ${b.failKey} fail`, c?.status === 'fail', `실제=${c?.status} ${failKeys(r)}`)
    t(`fill 병 '${b.key}' → 전체 fail · gating`, statusOfRun(r) === 'fail' && c?.gating === true)
  }

  // 병을 넣어 물린다: 해당 검사/설정을 빼면 그 병이 새야 한다.
  // 새지 않으면 다른 검사가 대신 잡고 있는 것이고, 그러면 이 검사가
  // 무엇을 하는지 아무도 모르는 상태가 된다.
  {
    // ②를 optional 로 바꾸면 '빈칸 비움'이 샌다
    const cfg: ScoringConfig = { ...CFG, blanks: CFG.blanks!.map((b) => (b.key === '②' ? { ...b, optional: true } : b)) }
    const r = run({ '①': '등이 돌무더기에 처박혔다.', '②': '' }, cfg)
    t('②가 필수라서 빈칸 비움을 잡는다 (optional 로 바꾸면 pass)', statusOfRun(r) === 'pass', failKeys(r))
  }
  {
    // forbidCopyOfFixedLines 를 빼면 '고정 줄 베낌'이 샌다
    const { forbidCopyOfFixedLines, ...rest } = CFG
    void forbidCopyOfFixedLines
    const r = run({ '①': '등이 돌무더기에 처박혔다.', '②': '마수가 몸을 낮추고 머리를 들이밀었다.' }, rest)
    t('forbidCopyOfFixedLines 를 빼면 고정 줄 베낌이 샌다 — 이 규칙이 하는 일', statusOfRun(r) === 'pass', failKeys(r))
  }
  {
    // ②의 maxChars 를 빼면 '61자'가 샌다
    const cfg: ScoringConfig = { ...CFG, blanks: CFG.blanks!.map((b) => (b.key === '②' ? { key: b.key, label: b.label, minSentences: 1, maxSentences: 2 } : b)) }
    const r = run({ '①': '등이 돌무더기에 처박혔다.', '②': LONG }, cfg)
    t('②의 maxChars 를 빼면 61자가 샌다', statusOfRun(r) === 'pass', failKeys(r))
  }
  {
    // forbidWords 를 빼면 '대괄호'가 샌다
    const { forbidWords, ...rest } = CFG
    void forbidWords
    const r = run({ '①': '등이 돌무더기에 처박혔다.', '②': '[결정타] 역린이 드러났다.' }, rest)
    t('forbidWords 를 빼면 대괄호가 샌다', statusOfRun(r) === 'pass', failKeys(r))
  }

  // combine() 도 같은 판정을 내는가 — status fail · blocked · AI 안 부름
  {
    const p: Problem = { id: 'bg', type: 'fill', scoring_mode: 'auto', scoring_config: CFG }
    const r = combine(p, { blanks: { '①': '등이 돌무더기에 처박혔다.', '②': '' } }, undefined, null)
    t('combine: 빈칸 비움 → fail · blocked · needsAi false', r.status === 'fail' && r.blocked === true && r.needsAi === false, `status=${r.status} blocked=${r.blocked} needsAi=${r.needsAi}`)
    const ok = combine(p, { blanks: CLEAN[0] }, undefined, null)
    t('combine: 좋은 답안 → pass (fill 은 auto 라 needsAi false)', ok.status === 'pass' && ok.needsAi === false, `status=${ok.status}`)
  }

  // ── 구두점만 넣은 제출 (세션 18 후기 — 빠졌던 다섯째 병) ──
  // countSentences 가 '.' 을 1문장으로 세고, minChars 가 없어 '.' 이 통과했다.
  t("countSentences('.') === 0", countSentences('.') === 0, `실제=${countSentences('.')}`)
  t("countSentences('...') === 0", countSentences('...') === 0, `실제=${countSentences('...')}`)
  t("countSentences('?!') === 0", countSentences('?!') === 0, `실제=${countSentences('?!')}`)
  t("countSentences('…') === 0", countSentences('…') === 0, `실제=${countSentences('…')}`)
  t('countSentences 꼬리 규칙 — 종결부호 없는 조각도 글자 있으면 1문장',
    countSentences('역린이 드러났다') === 1, `실제=${countSentences('역린이 드러났다')}`)
  t('countSentences 두 문장', countSentences('동생이 죽었다. 손이 떨렸다.') === 2)

  {
    // {①:'.', ②:'.'} → 문장 수 0 · 최소 분량 0 으로 둘 다 fail
    const r = run({ '①': '.', '②': '.' })
    const s1 = r.find((c) => c.key === 'fill:①:sentences')
    const m1 = r.find((c) => c.key === 'fill:①:minChars')
    const s2 = r.find((c) => c.key === 'fill:②:sentences')
    const m2 = r.find((c) => c.key === 'fill:②:minChars')
    t("fill 병 '구두점만' → 전체 fail", statusOfRun(r) === 'fail', failKeys(r))
    t("fill 병 '구두점만' → sentences·minChars 넷 다 fail",
      s1?.status === 'fail' && m1?.status === 'fail' && s2?.status === 'fail' && m2?.status === 'fail',
      failKeys(r))
    t("최소 분량 rule 에 '8자 이상' · detail 0자", m2?.rule === '②: 8자 이상' && m2?.detail === '0자 / 8자 이상', `rule=${m2?.rule} detail=${m2?.detail}`)
    // 한 칸에 글자 수는 하나다 — maxChars 도 countLetters 로 센다.
    t("fill 병 '구두점만' → ① 분량(maxChars) 도 0자", r.find((c) => c.key === 'fill:①:maxChars')?.detail === '0자 / 60자 이하',
      r.find((c) => c.key === 'fill:①:maxChars')?.detail)
  }
  {
    // {②:'...'} (① 생략) → ② 가 fail
    const r = run({ '②': '...' })
    t("fill 병 '점점점' → 전체 fail", statusOfRun(r) === 'fail', failKeys(r))
    t("fill 병 '점점점' → ② 문장 수 fail", r.find((c) => c.key === 'fill:②:sentences')?.status === 'fail')
  }
  {
    // ② 에 종결부호 없이 8자 이상 — 꼬리 규칙이 살아 있어 통과해야 한다
    const r = run({ '②': '목을 덮은 비늘 사이로 역린이 드러났다' })
    t('fill 종결부호 없는 8자 이상 → pass (꼬리 문장 규칙이 안 깨졌다)', statusOfRun(r) === 'pass', failKeys(r))
  }
}


// ── 10단계 action_turn(전투 서사화) ──────────────────────────────────
//
// 난이도를 검사가 아니라 재료로 가른다. 9단계 povCfgOf 가 difficulty 를 안
// 쓰는 것과 같다 — 8문항 단계 넷이 예외 없이 그렇다. foreshadow 유무가
// 9단계 groups 자리다.
//
// 신설 검사는 requireInLastLine 하나뿐이다. requireAny 는 본문 어디든 보므로
// 빌드업에 요소를 흘리고 끝을 다른 말로 맺은 답안을 통과시킨다.
const runAt = (item: ActionItem, text: string, cfg: ScoringConfig = actionCfgOf(item)) =>
  combine(
    { id: item.sourceKey, type: 'convert', scoring_mode: 'hybrid', scoring_config: cfg } as Problem,
    { text },
    undefined,
    null
  )
const atPasses = (item: ActionItem, text: string, cfg?: ScoringConfig) => runAt(item, text, cfg).status === 'pass'
const atExtra = (item: ActionItem, key: string, r: ReturnType<typeof runAt>) =>
  `${item.sourceKey}/${key} 실제=${r.status} fail=${JSON.stringify(r.checks.filter((c) => c.status === 'fail').map((c) => c.key))}`

console.log('\n[10단계 action_turn: 오탐 감시 · 뚫기 · 알려진 한계 — 8문항 전수]')
{
  for (const item of AT_ITEMS) {
    for (const [i, g] of item.goods.entries()) {
      const r = runAt(item, g)
      t(`'${item.sourceKey}' 좋은 답안 ${i + 1} → pass`, r.status === 'pass', atExtra(item, `good${i + 1}`, r))
    }
    // known 셋은 pass 가 정상이다. 요소도 자리도 줄 수도 맞고 빌드업이 없을 뿐인데,
    // 그것은 내용이라 규칙이 원리적으로 못 잡는다. fail 로 바뀌면 누가 조인 것이다.
    for (const b of item.bypasses) {
      const r = runAt(item, b.text)
      const want = b.known ? 'pass' : 'fail'
      t(`'${item.sourceKey}' 뚫기 '${b.key}' → ${want}`, r.status === want, atExtra(item, b.key, r))
    }
    // 난이도 2 전용 뚫기. ★ 위 11건과 따로 센다 — 섞으면 난이도 2가 미검출
    // 4/13 이 되어 난이도 1의 3/12 와 비교가 깨진다.
    // ★ 건너뛰지 않는다. 난이도 2인데 전용 뚫기가 없으면 실패시킨다 —
    //   if (ex) 로 두었더니 at-left-draw 가 빠진 것을 아무도 못 봤다.
    const ex = AT_D2_EXTRA[item.sourceKey]
    if (item.foreshadow !== undefined || ex) {
      if (!ex) {
        t(`'${item.sourceKey}' 전용 뚫기가 있다`, false, '난이도 2인데 AT_D2_EXTRA 에 없다')
      } else {
        const r = runAt(item, ex.text)
        t(`'${item.sourceKey}' 전용 뚫기 '${ex.key}' → pass (알려진 한계 넷째)`, r.status === 'pass', atExtra(item, ex.key, r))
      }
    }
  }
}

console.log('\n[10단계 action_turn: requireAny 의 탐지 기여는 0이다]')
{
  // 마지막 줄은 본문의 부분 문자열이므로 requireInLastLine 이 pass 면 같은 목록의
  // requireAny 도 반드시 pass 한다. 원리적으로 반례가 없다 — 텍스트 241개에서
  // 부분 문자열 26162쌍을 재서 반례 0을 확인했다.
  // 남기는 이유는 화면에서 두 실패를 가르기 위해서다(요소가 없다 / 끝이 아니다).
  // 세션 10 §7-1(5) 표는 둘이 각각 잡는 것처럼 읽히게 적혀 있었다. 아니다.
  for (const item of AT_ITEMS) {
    // ★ requireAny 하나만 뺀다. forbidWords 까지 빼면 두 개를 뺀 실험이 된다.
    const bare: ScoringConfig = {
      ...AT_CFG,
      requireInLastLine: [item.element],
      forbidWords: PASSAGE_TAGS,
    }
    const withAny = item.bypasses.filter((b) => atPasses(item, b.text)).length
    const without = item.bypasses.filter((b) => atPasses(item, b.text, bare)).length
    t(`'${item.sourceKey}' requireAny 를 빼도 미검출이 같다`, withAny === without, `있을때=${withAny} 뺐을때=${without}`)
  }
}

console.log('\n[10단계 action_turn: 마지막 줄 하한 · 겹침을 만들지 않은 근거]')
{
  // ★ 이 두 값은 지문 1건에서 재면 뒤집힌다. 이번 세션에서 실제로 두 번 뒤집혔다.
  //   세션 10 §7-1(5)(7) 이 지문 1건에서 '하한 10 · 폭 2' 를 낸 것이 그 자리다.
  const noSpace = (x: string) => x.replace(/\s/g, '').length
  const lastLine = (x: string) => {
    const ls = x.split('\n').map((l) => l.trim()).filter(Boolean)
    return ls.length ? ls[ls.length - 1] : ''
  }

  // 1) 마지막 줄 하한. 미검출은 실제로 준다(8건에서 24 → 16). 만들지 않는 이유는
  //    줄어드는 것이 전부 known 이라는 것이다 — 길이로 잡는 것이라 마지막 줄을
  //    한 어절만 늘리면 빠져나간다. 값은 좋아지고 아무것도 안 막는다.
  //    그리고 하한 8 에서 이미 좋은 답안 오탐이 10건이다. 빈 구간이 없다.
  const caughtByBand = AT_ITEMS.flatMap((i) =>
    i.bypasses.filter((b) => atPasses(i, b.text) && noSpace(lastLine(b.text)) < 10)
  )
  t(
    '마지막 줄 하한 10 이 줄이는 미검출은 전부 known 이다 — 길이로 잡는 것이라 뜻이 없다',
    caughtByBand.length > 0 && caughtByBand.every((b) => b.known === true),
    JSON.stringify(caughtByBand.map((b) => b.key))
  )
  const fpAt8 = AT_ITEMS.reduce(
    (n, i) => n + i.goods.filter((g) => !atPasses(i, g) || noSpace(lastLine(g)) < 8).length,
    0
  )
  t('마지막 줄 하한은 8 에서 이미 좋은 답안 오탐을 낸다 — 빈 구간이 없다', fpAt8 > 0, `오탐=${fpAt8}/144`)

  // 2) 답안 ↔ 지문 겹침. 9단계 echoLen 을 지문 전체에 댔다.
  //    지문 1건에서는 베끼기 14 · 좋은 답안 5 로 떨어져 보였다. 8건에서 재니
  //    좋은 답안 최대 9 · 베끼기 최소 7 로 겹친다 — at-pit-prop 은 8 대 9 로
  //    방향이 거꾸로고 at-bell-rope 는 7 대 7 이다.
  //
  //    ★ 값을 박지 않는다. 지문을 하나만 고쳐도 흔들려서, 감시가 지문 수정을
  //      막는 족쇄가 된다. 겹치는가만 잰다. 어느 날 이것이 fail 로 바뀌면
  //      빈 구간이 생겼다는 뜻이고, 그때가 겹침을 다시 판단할 자리다.
  const goodMax = Math.max(...AT_ITEMS.flatMap((i) => i.goods.map((g) => echoLen(g, atPassageOf(i)))))
  const copyMin = Math.min(
    ...AT_ITEMS.map((i) =>
      echoLen(i.bypasses.find((b) => b.key === '지문의 결정타 줄을 그대로 마지막 줄에')!.text, atPassageOf(i))
    )
  )
  t(
    '답안↔지문 겹침에 빈 구간이 없다 — 좋은 답안 최대 >= 베끼기 최소',
    goodMax >= copyMin,
    `좋은답안최대=${goodMax} 베끼기최소=${copyMin}`
  )
}

console.log('\n[10단계 action_turn: 지문 규칙 · 교차 검사]')
{
  // 10단계 지문에는 대사가 없다. dialogueLines 를 빈 배열로 넘기면 종결어미
  // 규칙 둘이 조용히 통과한다 — validateActionItem 의 따옴표 검사가 그것을 막는다.
  const input = (i: ActionItem): PassageRuleInput => ({
    sourceKey: i.sourceKey,
    keyword: i.element,
    passage: atPassageOf(i),
    dialogueLines: [],
    difficulty: i.difficulty,
    tone: AT_TONE[i.sourceKey],
  })
  for (const item of AT_ITEMS) {
    t(`'${item.sourceKey}' 지문 규칙(공용) 통과`, checkPassageRules(input(item)).length === 0, JSON.stringify(checkPassageRules(input(item))))
  }
  for (const item of AT_ITEMS) {
    t(`'${item.sourceKey}' 지문 규칙(10단계 전용) 통과`, validateActionItem(item).length === 0, JSON.stringify(validateActionItem(item)))
  }
  // 지문마다 따로 센다 — 합쳐서 하나로 두면 붙었는지를 수로 확인할 수 없다.
  for (const item of AT_ITEMS) {
    const hits = goodsCollidingWithCue(item)
    t(`'${item.sourceKey}' 좋은 답안 마지막 줄이 elementCue 와 안 겹친다`, hits.length === 0, JSON.stringify(hits))
  }
  t(
    '문항 집합 규칙(분포·중복) 통과',
    checkPassageSetRules(AT_ITEMS.map(input), {
      difficulty: { 1: 4, 2: 4 },
      tone: { planned: 5, impulsive: 3 },
      maxLengthSpread: 20,
    }).length === 0,
    JSON.stringify(
      checkPassageSetRules(AT_ITEMS.map(input), {
        difficulty: { 1: 4, 2: 4 },
        tone: { planned: 5, impulsive: 3 },
        maxLengthSpread: 20,
      })
    )
  )
  // 9단계 crossCheckPovItems 자리. 재는 것은 '측정을 깨뜨리는 겹침'이다 —
  // 한 지문의 element·foreshadow 가 다른 지문 표본에 나타나면 그 지문의 뚫기가
  // 엉뚱한 이유로 잡히거나 샌다. 같은 무대·같은 인물의 겹침은 다양성 문제라
  // 여기서 안 잰다(at-left-feeler 와 at-pit-prop 이 연희를 함께 쓴다).
  const cross: string[] = []
  for (const a of AT_ITEMS)
    for (const b of AT_ITEMS) {
      if (a.sourceKey === b.sourceKey) continue
      const texts = [...b.goods, ...b.bypasses.map((x) => x.text)]
      if (texts.some((x) => x.includes(a.element))) cross.push(`${a.element} → ${b.sourceKey}`)
      if (a.foreshadow && texts.some((x) => x.includes(a.foreshadow!))) cross.push(`${a.foreshadow} → ${b.sourceKey}`)
    }
  t('지문 사이 교차 오염 0 — element·foreshadow 가 남의 표본에 없다', cross.length === 0, JSON.stringify(cross))
}

console.log('\n[10단계 action_turn: 지문 꼴 검사는 아직 안 문다 — 설 자리가 오면 뒤집힌다]')
{
  // validateActionItem 의 꼴 정규식은 passageOf 가 만든 문자열을 잰다. 만드는
  // 쪽과 재는 쪽이 같은 조건(foreshadow 유무)을 보므로 원리적으로 늘 통과한다 —
  // 자기가 만든 것을 자기가 검사한다. 병을 넣어도 안 문다.
  //
  // 지우지 마라. 정규식 자체는 맞다(아래 다섯이 그것을 보인다). 덤프 대조가
  // 붙는 날 덤프 passage 를 재게 되면서 처음 일한다. 그때 첫 감시가 fail 로
  // 바뀌고, 그것이 '이제 일하기 시작했다'는 신호다.
  //
  // 9단계 knownGapCase 와 같은 자리다. 저기는 숨기면 나중에 조인 것을 못
  // 알아채고, 여기는 숨기면 나중에 일하기 시작한 것을 못 알아챈다.
  const shapeOf = (i: ActionItem) =>
    i.foreshadow === undefined
      ? /^\[상황\] .+\n\[결정타\] .+$/
      : /^\[상황\] .+\n\[복선\] .+\n\[결정타\] .+$/
  t('passageOf 출력은 지문 전수에서 꼴 정규식을 통과한다', AT_ITEMS.every((i) => shapeOf(i).test(atPassageOf(i))))
  const d2 = AT_ITEMS.find((i) => i.foreshadow !== undefined)!
  t('난이도 2 지문은 passageOf 로는 [복선] 줄을 뺄 수 없다', atPassageOf(d2).includes('\n[복선] '))
  const handWritten: [string, string][] = [
    ['[복선] 줄이 빠짐', '[상황] 가.\n[결정타] 나.'],
    ['[상황] 대신 [장면]', '[장면] 가.\n[복선] 나.\n[결정타] 다.'],
    ['줄 순서가 뒤바뀜', '[상황] 가.\n[결정타] 나.\n[복선] 다.'],
    ['대괄호가 없음', '상황 가.\n복선 나.\n결정타 다.'],
    ['줄이 하나로 붙음', '[상황] 가. [복선] 나. [결정타] 다.'],
  ]
  for (const [name, str] of handWritten) {
    t(`손으로 쓴 '${name}' 은 난이도 2 꼴 정규식이 문다`, !shapeOf(d2).test(str))
  }
}

console.log('\n[10단계 action_turn: 설정 일치 · 수 가드]')
{
  t('AT_CFG minLines 4', AT_CFG.minLines === 4, `실제=${AT_CFG.minLines}`)
  t('AT_CFG maxLines 4 — 좋은 답안 144건이 전부 4줄로 들어갔다', AT_CFG.maxLines === 4, `실제=${AT_CFG.maxLines}`)
  t('AT_CFG maxLineChars 30', AT_CFG.maxLineChars === 30, `실제=${AT_CFG.maxLineChars}`)
  t('문항 8건', AT_ITEMS.length === 8, `실제=${AT_ITEMS.length}`)
  const goods = AT_ITEMS.reduce((n, i) => n + i.goods.length, 0)
  t('좋은 답안 144건', goods === 144, `실제=${goods}`)
  t('뚫기 갈래 12종', BYPASS_KINDS.length === 12, `실제=${BYPASS_KINDS.length}`)
  // 난이도가 설정을 안 가른다. 8문항 단계 넷이 예외 없이 그렇다.
  const shapes = new Set(AT_ITEMS.map((i) => JSON.stringify(Object.keys(actionCfgOf(i)).sort())))
  t('난이도 1과 2의 scoring_config 키가 같다', shapes.size === 1, JSON.stringify([...shapes]))
  const KNOWN = new Set([
    'minLines', 'maxLines', 'maxLineChars', 'requireAny', 'requireInLastLine', 'forbidWords',
  ])
  const unknown = Object.keys(actionCfgOf(AT_ITEMS[0])).filter((k) => !KNOWN.has(k))
  t('scoring_config 에 모르는 키가 없다', unknown.length === 0, JSON.stringify(unknown))
}

console.log('\n[10단계 action_turn: 지시문 예시가 자기 규칙을 지키는가]')
{
  // 지시문을 고치면 예시가 규칙을 깨도 아무도 모른다. 9단계가 같은 이유로
  // 지시문 가드를 뒀다. 예시를 상수로 빼서 지시문이 그것으로 조립되므로
  // 여기서 재는 것이 곧 화면에 나가는 것이다.
  const exCfg: ScoringConfig = {
    ...AT_CFG,
    requireAny: [EXAMPLE_ELEMENT],
    requireInLastLine: [EXAMPLE_ELEMENT],
    forbidWords: PASSAGE_TAGS,
  }
  const run = (text: string) =>
    combine({ id: 'ex', type: 'convert', scoring_mode: 'auto', scoring_config: exCfg } as Problem, { text }, undefined, null)
  for (const [name, ans] of [['난이도 1', EXAMPLE_ANSWER_1], ['난이도 2', EXAMPLE_ANSWER_2]] as [string, string][]) {
    const r = run(ans)
    t(`지시문 ${name} 예시 답안이 그 설정으로 pass`, r.status === 'pass', JSON.stringify(r.checks.filter((c) => c.status !== 'pass').map((c) => c.key)))
  }
  // 예시가 여덟 문항의 재료를 쓰면 답을 흘린다.
  const leaks: string[] = []
  for (const i of AT_ITEMS) {
    for (const w of [i.element, i.foreshadow].filter(Boolean) as string[]) {
      for (const [n, a] of [['1', EXAMPLE_ANSWER_1], ['2', EXAMPLE_ANSWER_2]] as [string, string][]) {
        if (a.includes(w)) leaks.push(`예시${n} ← ${i.sourceKey}/${w}`)
      }
    }
    if (AT_INSTRUCTION_1.includes(i.situation) || AT_INSTRUCTION_2.includes(i.situation)) {
      leaks.push(`지시문 ← ${i.sourceKey} situation`)
    }
  }
  t('지시문 예시가 여덟 문항의 재료를 안 쓴다', leaks.length === 0, JSON.stringify(leaks))
  // 예시가 대괄호 표기를 노출하면 학습자에게 '지문을 통째로 베끼는 길'을 알려 준다.
  // 난이도 2는 그것이 정확히 네 줄이라 forbidWords 가 서기 전에는 통과했다.
  for (const [n, ins] of [['1', AT_INSTRUCTION_1], ['2', AT_INSTRUCTION_2]] as [string, string][]) {
    const inExample = ins.split('↓')[0]
    t(`지시문 ${n} 의 예시 지문에 대괄호 표기가 없다`, !PASSAGE_TAGS.some((g) => inExample.includes(g)), inExample)
  }
}

console.log('\n[10단계 action_turn: 덤프 대조]')
{
  // 픽스처와 덤프가 갈리면 위의 감시 전부가 실제 배포물을 안 보는 상태가 된다.
  // 8·9단계가 같은 가드를 두고 있다. 문항이 덤프에 없으면 건너뛰지 않고 실패시킨다.
  //
  // ★ 이 블록이 서면서 [지문 꼴 검사는 아직 안 문다] 의 전제가 바뀐다.
  //   저 블록은 passageOf 출력을 재서 늘 통과했는데, 여기서는 덤프 passage 를
  //   잰다 — 자기가 만든 것을 자기가 검사하는 구조가 여기서 풀린다.
  interface DumpProblem {
    source_key: string
    skill_key: string
    type: string
    passage: string | null
    instruction: string
    difficulty: number
    tone_tag: string | null
    genre_tag: string | null
    scoring_mode: string
    order_no: number
    source_tag: string | null
    scoring_config: Record<string, unknown>
  }
  const dump = JSON.parse(readFileSync('seed/dump/problems.json', 'utf8')) as DumpProblem[]
  const canon = (o: Record<string, unknown>) => JSON.stringify(o, Object.keys(o).sort())
  const at = dump.filter((d) => d.skill_key === 'action_turn')
  t('덤프에 action_turn 8문항이 있다', at.length === 8, `실제=${at.length}`)
  for (const item of AT_ITEMS) {
    const dp = at.find((d) => d.source_key === item.sourceKey)
    if (!dp) {
      t(`'${item.sourceKey}' 가 덤프에 있다`, false, '없다')
      continue
    }
    const bad: string[] = []
    if (dp.passage !== atPassageOf(item)) bad.push('passage 가 다르다')
    if (dp.instruction !== instructionOf(item)) bad.push('instruction 이 다르다')
    if (dp.difficulty !== item.difficulty) bad.push('difficulty 가 다르다')
    if (dp.tone_tag !== AT_TONE[item.sourceKey]) bad.push('tone_tag 가 다르다')
    if (dp.type !== 'convert') bad.push(`type 이 ${dp.type} 이다`)
    if (dp.scoring_mode !== 'auto') bad.push(`scoring_mode 가 ${dp.scoring_mode} 이다`)
    if (dp.order_no !== 10) bad.push(`order_no 가 ${dp.order_no} 이다`)
    if (canon(dp.scoring_config) !== canon(actionCfgOf(item) as unknown as Record<string, unknown>)) {
      bad.push('scoring_config 가 다르다')
    }
    t(`'${item.sourceKey}' 덤프 ↔ 픽스처 일치`, bad.length === 0, bad.join(' · '))
  }
  // 지시문은 두 종뿐이다. 여덟 개가 그것을 나눠 쓴다(8·9단계와 같은 꼴).
  const kinds = new Set(at.map((d) => d.instruction))
  t('덤프 지시문이 두 종이다', kinds.size === 2, `실제=${kinds.size}`)
  t(
    '덤프 지시문 두 종이 AT_INSTRUCTION_1·2 다',
    [...kinds].every((k) => k === AT_INSTRUCTION_1 || k === AT_INSTRUCTION_2)
  )
}

// ── 10단계 action_reason(동작에 이유 넣기): fill 시드 대조 ──────────────
//
// 재설계안 11-2·11-3·세션 18. 새 skill_key `action_reason` 에 fill 문항
// 여덟(재설계안 7-6·7-7·7-10-2). 옛 action_turn 여덟은 그대로 두고
// is_active=false 로 내려간다(deactivate.json).
//
// seed_check.sql 이 DB 쪽에서 빈칸↔표식을 보지만 여기서는 못 돌린다 —
// 이 블록이 그 TS 짝이다. fixedLines 를 손으로 안 적었는지, gen-seed 의
// 파생이 서는지, 모범답안이 제 규칙을 지키는지를 잰다.
console.log('\n[10단계 action_reason: fill 시드 대조]')
{
  interface DumpBlank {
    key: string
    label: string
    minSentences?: number
    maxSentences?: number
    minChars?: number
    maxChars?: number
    optional?: boolean
  }
  interface DumpFillProblem {
    source_key: string
    skill_key: string
    type: string
    passage: string | null
    instruction: string
    order_no: number
    scoring_mode: string
    scoring_config: {
      blanks?: DumpBlank[]
      forbidWords?: string[]
      forbidCopyOfFixedLines?: boolean
      fixedLines?: unknown
    }
  }
  interface DumpRef {
    source_key: string
    ord: number
    blank_key: string
    content: string
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const allProblems = readDump<DumpFillProblem[]>('problems.json')
  const fill = allProblems.filter((d) => d.skill_key === 'action_reason')
  const answersDump = readDump<{ reference?: DumpRef[] }>('answers.json')
  // answers.json 의 reference[] 는 이제 여러 단계의 모범답안을 담는다(비-fill
  // 포함). 이 블록은 action_reason 것만 본다 — 1단계 reduce_adverb 는 아래
  // 자기 블록이 잰다.
  const arKeys = new Set(fill.map((d) => d.source_key))
  const refs = (answersDump.reference ?? []).filter((r) => arKeys.has(r.source_key))
  const deactivate = readDump<{ source_keys: string[] }>('deactivate.json')

  t('덤프에 action_reason 8문항', fill.length === 8, `실제=${fill.length}`)
  t('전부 fill 유형', fill.every((d) => d.type === 'fill'), JSON.stringify(fill.map((d) => `${d.source_key}:${d.type}`)))
  t('전부 order_no 10', fill.every((d) => d.order_no === 10))
  t('전부 scoring_mode auto (stage2 는 자기점검)', fill.every((d) => d.scoring_mode === 'auto'))

  const keysOf = (d: DumpFillProblem) => (d.scoring_config.blanks ?? []).map((b) => b.key)

  for (const d of fill) {
    const cfg = d.scoring_config
    const blanks = cfg.blanks ?? []
    const keys = keysOf(d)

    // fixedLines 를 JSON 에 손으로 안 적었다 — gen-seed 가 passage 에서 만든다
    t(`'${d.source_key}': fixedLines 를 JSON 에 안 적었다`, cfg.fixedLines === undefined, JSON.stringify(cfg.fixedLines))
    // 대괄호 금지어 · 고정 줄 베낌 금지
    t(`'${d.source_key}': forbidWords 가 대괄호 셋`, JSON.stringify(cfg.forbidWords) === JSON.stringify(['[상황]', '[복선]', '[결정타]']))
    t(`'${d.source_key}': forbidCopyOfFixedLines true`, cfg.forbidCopyOfFixedLines === true)

    // 빈칸 ↔ 지문 표식이 순서까지 같다
    const mismatch = fillMarkerMismatch(d.passage ?? '', keys)
    t(`'${d.source_key}': 빈칸 ↔ 지문 표식 일치`, mismatch === null, mismatch ?? '')

    // 파생된 고정 줄이 둘 이상이고 힌트 줄이 안 섞였다
    const { fixedLines } = deriveFillParts(d.passage ?? '')
    t(`'${d.source_key}': 고정 줄 ≥ 2`, fixedLines.length >= 2, `${fixedLines.length}`)
    t(`'${d.source_key}': 고정 줄에 대괄호 힌트가 없다`, fixedLines.every((l) => !l.startsWith('[')), JSON.stringify(fixedLines))

    // 빈칸 규칙
    for (const b of blanks) {
      t(`'${d.source_key}/${b.key}': maxChars 60`, b.maxChars === 60)
      t(`'${d.source_key}/${b.key}': minSentences 1`, b.minSentences === 1)
      t(`'${d.source_key}/${b.key}': maxSentences 2~3`, b.maxSentences === 2 || b.maxSentences === 3, `${b.maxSentences}`)
      t(`'${d.source_key}/${b.key}': label 이 있다`, typeof b.label === 'string' && b.label.length > 0)
    }
  }

  // 지시문은 한 종으로 공유하되, 여덟 지문의 재료(고정 줄·모범답안)를 안 흘린다
  const instrs = new Set(fill.map((d) => d.instruction))
  t('지시문이 한 종이다', instrs.size === 1, `실제=${instrs.size}`)
  const theInstr = [...instrs][0] ?? ''
  const leaks: string[] = []
  for (const d of fill) {
    for (const l of deriveFillParts(d.passage ?? '').fixedLines) {
      if (theInstr.includes(l)) leaks.push(`${d.source_key}: 고정 줄`)
    }
  }
  for (const r of refs) if (theInstr.includes(r.content)) leaks.push(`${r.source_key} ord${r.ord}: 모범답안`)
  t('지시문이 여덟 지문의 재료를 안 쓴다', leaks.length === 0, JSON.stringify(leaks))

  // gen-seed 가 seed_data.sql 에 fixedLines 를 주입했다
  const seedSql = readFileSync(path.join(__dirname, '..', '..', 'seed_data.sql'), 'utf8')
  t('seed_data.sql 에 fill 8건의 fixedLines 가 주입됐다', (seedSql.match(/"fixedLines":\[/g) ?? []).length === 8, `${(seedSql.match(/"fixedLines":\[/g) ?? []).length}`)
  // 비활성으로 내려가는 것 — deactivate.json 이 단일 출처. 빠뜨리면 화면에
  // 유령이 남는다. 지금은 두 묶음이다:
  //   옛 action_turn 8건 (재설계안 11-4·세션 18)
  //   구성 12 재설계로 밀려난 대비형 cc- 4건 (세션 32 후기 — '입체 캐릭터'로 교체)
  const atKeys = allProblems.filter((d) => d.skill_key === 'action_turn').map((d) => d.source_key)
  const deadCcKeys = ['cc-report-credit', 'cc-street-night', 'cc-raid-reward', 'cc-relic-box']
  t('deactivate.json = action_turn 8 + 대비형 cc- 4 (정확히)',
    JSON.stringify([...deactivate.source_keys].sort()) ===
      JSON.stringify([...atKeys, ...deadCcKeys].sort()),
    `deactivate=${JSON.stringify([...deactivate.source_keys].sort())}`)
  t('비활성 대비형 cc- 4건이 덤프에 여전히 존재한다 (행 삭제 금지 — 제출 이력 보존)',
    deadCcKeys.every((k) => allProblems.some((d) => d.source_key === k)))
  t('seed_data.sql 이 그 12건을 is_active=false 로 내린다',
    deactivate.source_keys.every((k) => seedSql.includes(`'${k}'`)) &&
      /update problems set is_active = false/.test(seedSql))
  // update-contrast-v2.sql 이 대비형 cc- 4건만 비활성으로 내린다 (박 님 델타)
  {
    const v2 = readFileSync(path.join(__dirname, '..', '..', 'seed', 'update-contrast-v2.sql'), 'utf8')
    t('update-contrast-v2.sql 이 cc- 4건을 is_active=false 로 내린다',
      /update problems set is_active = false/.test(v2) &&
        deadCcKeys.every((k) => v2.includes(`'${k}'`)) &&
        !/at-left-feint/.test(v2))
  }

  // ── 모범답안(reference_answers) 무결성 ──
  const bySource = new Map<string, DumpRef[]>()
  for (const r of refs) {
    if (!bySource.has(r.source_key)) bySource.set(r.source_key, [])
    bySource.get(r.source_key)!.push(r)
  }
  for (const [sk, rs] of bySource) {
    const d = fill.find((x) => x.source_key === sk)
    t(`모범답안 '${sk}' 이 fill 문항을 가리킨다`, !!d, '가리키는 문항이 없다')
    if (!d) continue
    const blanks = d.scoring_config.blanks ?? []
    const keySet = new Set(blanks.map((b) => b.key))
    const required = blanks.filter((b) => !b.optional).map((b) => b.key)
    for (const r of rs) {
      t(`모범답안 '${sk}' ord${r.ord} ${r.blank_key} 의 blank_key 가 실재`, keySet.has(r.blank_key), r.blank_key)
      const b = blanks.find((x) => x.key === r.blank_key)
      if (!b) continue
      const s = countSentences(r.content)
      const letters = countLetters(r.content) // fill 의 분량 검사는 글자만 센다
      const minChars = b.minChars ?? 8
      t(
        `모범답안 '${sk}' ord${r.ord} ${r.blank_key} 이 제 빈칸 규칙을 지킨다`,
        s >= (b.minSentences ?? 1) &&
          s <= (b.maxSentences ?? 99) &&
          letters <= (b.maxChars ?? 9999) &&
          letters >= minChars,
        `${s}문장 ${letters}자 / ${b.minSentences}~${b.maxSentences}문장 ${minChars}~${b.maxChars}자: "${r.content}"`
      )
      // 모범답안이 고정 줄을 그대로 베끼지 않는다(forbidCopyOfFixedLines 의 취지)
      const fixed = new Set(deriveFillParts(d.passage ?? '').fixedLines)
      t(`모범답안 '${sk}' ord${r.ord} ${r.blank_key} 이 고정 줄을 안 베낀다`,
        r.content.split('\n').map((l) => l.trim()).every((l) => !fixed.has(l)))
    }
    const ords = [...new Set(rs.map((r) => r.ord))]
    for (const o of ords) {
      const filledKeys = new Set(rs.filter((r) => r.ord === o).map((r) => r.blank_key))
      t(`모범답안 '${sk}' ord${o} 가 필수 빈칸을 다 채운다`, required.every((k) => filledKeys.has(k)), `필수=${required} 채움=${[...filledKeys]}`)
    }
  }
  // 모범답안이 없는 문항은 그것대로 둔다 — 다만 목록으로 남긴다(재설계안 7-7 feeler)
  const noRef = fill.filter((d) => !bySource.has(d.source_key)).map((d) => d.source_key)
  console.log(`  모범답안 없는 fill 문항: ${noRef.length > 0 ? noRef.join(', ') : '없음'}`)

  // ── 물기: 빈칸↔표식 대조가 실제로 문다 ──
  t('물기: 표식 하나가 빠진 지문은 불일치로 잡힌다',
    fillMarkerMismatch('[상황] x\n\n첫 줄\n①\n둘째 줄\n셋째 줄', ['①', '②']) !== null)
  t('물기: 순서가 뒤바뀐 표식은 불일치로 잡힌다',
    fillMarkerMismatch('첫 줄\n②\n둘째 줄\n①\n셋째 줄', ['①', '②']) !== null)
  t('물기: 표식이 남아도는 지문은 불일치로 잡힌다',
    fillMarkerMismatch('첫 줄\n①\n둘째 줄\n②\n셋째 줄\n③\n넷째 줄', ['①', '②']) !== null)
  t('물기: 맞는 지문은 통과한다',
    fillMarkerMismatch('첫 줄\n①\n둘째 줄\n②\n셋째 줄', ['①', '②']) === null)
  t('물기: deriveFillParts 가 힌트 줄을 고정 줄에서 뺀다',
    deriveFillParts('[상황] 배경\n[복선] 힌트\n\n동작 줄\n①\n결정타 줄').fixedLines.join('|') === '동작 줄|결정타 줄')
}

// ── 1단계 reduce_adverb(부사 줄이기): 모범답안 대조 (세션 19) ────────────
//
// answers.json 의 reference[] 에 rm-* 8문항 × ord 1(가)/2(나) = 16행.
// blank_key 는 ''(비-fill). 화면은 규칙 통과 시 SelfCheck 로 이 16건을
// 보여준다(비-fill 도 모범답안 + 자기점검, 재설계안 11-2). 여기서는 16건이
// 제 문항 규칙을 지키는지 잰다.
//   · 자수(maxChars)는 순수 검사 — 늘 돈다.
//   · 부사·관형·동사·반복은 형태소가 필요하다 — 로컬 형태소 서버가 떠 있을
//     때만 도는 선택 검사다. 서버가 없으면 조용히 넘기지 않고 morphSkipped 로
//     세어 최종 줄에 남긴다(세션 5 교훈).
console.log('\n[1단계 reduce_adverb: 모범답안 대조]')
{
  interface RaProblem {
    source_key: string
    skill_key: string
    type: string
    passage: string | null
    scoring_config: ScoringConfig
  }
  interface RaRef {
    source_key: string
    ord: number
    blank_key: string
    content: string
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const problems = readDump<RaProblem[]>('problems.json')
  const ra = problems.filter((d) => d.skill_key === 'reduce_adverb')
  const raKeys = new Set(ra.map((d) => d.source_key))
  const refs = (readDump<{ reference?: RaRef[] }>('answers.json').reference ?? []).filter((r) =>
    raKeys.has(r.source_key)
  )
  const cfgOf = new Map(ra.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(ra.map((d) => [d.source_key, d.passage ?? '']))

  t('덤프에 reduce_adverb 8문항', ra.length === 8, `실제=${ra.length}`)
  t('전부 remove 유형', ra.every((d) => d.type === 'remove'))
  t('모범답안 16행', refs.length === 16, `실제=${refs.length}`)
  t(
    '모범답안 전부 blank_key 가 빈 문자열(비-fill)',
    refs.every((r) => r.blank_key === ''),
    JSON.stringify(refs.filter((r) => r.blank_key !== '').map((r) => r.source_key))
  )
  t('모범답안 전부 ord 1 또는 2', refs.every((r) => r.ord === 1 || r.ord === 2))

  for (const d of ra) {
    const ords = refs
      .filter((r) => r.source_key === d.source_key)
      .map((r) => r.ord)
      .sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }

  // ── 순수 검사: 자수 · 비어 있지 않음 · 지문 베낌 아님 ──
  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const max = (cfg.maxChars as number | undefined) ?? 9999
    const n = countChars(r.content)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ ${max}`, n <= max, `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(
      `'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`,
      r.content.trim() !== passageOf.get(r.source_key)!.trim()
    )
  }

  // 원문 여덟은 자기 maxChars 를 넘어야 한다 — 안 넘으면 원문을 그대로 붙여
  // 넣어도 통과해 걷어내기 훈련이 성립하지 않는다(seed_verify (1) 의 TS 짝).
  // 세션 20: 원문을 박 님 판(희화화 완화)으로 갈았다. 부사는 줄었지만 자수
  // 초과는 유지된다 — 여기서 여덟 건 다 잰다.
  for (const d of ra) {
    const cfg = cfgOf.get(d.source_key)!
    const max = cfg.maxChars as number
    const n = countChars(d.passage ?? '')
    t(`'${d.source_key}': 원문 ${n}자 > 상한 ${max}`, n > max, `"${d.passage}"`)
    const res = combine(
      { id: d.source_key, type: 'remove', scoring_mode: 'auto', scoring_config: cfg },
      { text: d.passage ?? '' },
      undefined,
      null
    )
    t(
      `'${d.source_key}': 원문 그대로 제출은 maxChars 로 미달`,
      res.checks.find((c) => c.key === 'maxChars')?.status === 'fail'
    )
  }

  // DB update SQL 이 덤프와 갈리지 않았는지. seed_data.sql 은 기존 행의 passage
  // 를 안 고쳐서 seed/update-reduce-adverb-passages.sql 을 손으로 낸다 — 그
  // 파일의 여덟 update 가 problems.json 과 글자까지 같아야 한다.
  {
    const updSql = readFileSync(
      path.join(__dirname, '..', '..', 'seed', 'update-reduce-adverb-passages.sql'), 'utf8')
    const pairs = [...updSql.matchAll(
      /update problems set passage = '([^']*)'\s*\n\s*where source_key = '([^']*)';/g
    )].map((m) => ({ passage: m[1], source_key: m[2] }))
    t('update SQL 에 8건이 있다', pairs.length === 8, `실제=${pairs.length}`)
    for (const d of ra) {
      const row = pairs.find((p) => p.source_key === d.source_key)
      t(`update SQL '${d.source_key}' 의 passage 가 덤프와 같다`, row?.passage === d.passage,
        `SQL=${JSON.stringify(row?.passage)} 덤프=${JSON.stringify(d.passage)}`)
    }
  }

  // ── 선택 검사: 형태소 규칙(부사·관형·동사·반복) — 서버 있을 때만 ──
  pushRefMorphCheck('1단계', refs, 'remove', cfgOf)
}

// ── 2단계 emotion_action(감정을 동작으로): 모범답안 대조 (세션 21) ────────
//
// answers.json 의 reference[] 에 6문항 × ord 1(가)/2(나) = 12행. blank_key ''.
// 1단계와 같은 결 — 다만 emotion_action 은 convert 유형이라 forbidWords(감정어)
// 검사가 핵심이다. forbidWords 는 형태소 없이 문자열로 재므로 서버가 없어도
// 돈다 — 모범답안이 제 금지 목록에 걸리면 그 자리에서 실패다.
console.log('\n[2단계 emotion_action: 모범답안 대조]')
{
  interface EaProblem {
    source_key: string
    skill_key: string
    type: string
    passage: string | null
    scoring_config: ScoringConfig
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const ea = readDump<EaProblem[]>('problems.json').filter((d) => d.skill_key === 'emotion_action')
  const eaKeys = new Set(ea.map((d) => d.source_key))
  const refs = (readDump<{ reference?: RefRow[] }>('answers.json').reference ?? []).filter((r) =>
    eaKeys.has(r.source_key)
  )
  const cfgOf = new Map(ea.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(ea.map((d) => [d.source_key, d.passage ?? '']))

  t('덤프에 emotion_action 6문항', ea.length === 6, `실제=${ea.length}`)
  t('전부 convert 유형', ea.every((d) => d.type === 'convert'))
  t('모범답안 12행', refs.length === 12, `실제=${refs.length}`)
  t('모범답안 전부 blank_key 가 빈 문자열', refs.every((r) => r.blank_key === ''),
    JSON.stringify(refs.filter((r) => r.blank_key !== '').map((r) => r.source_key)))

  for (const d of ea) {
    const ords = refs.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }

  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const max = (cfg.maxChars as number | undefined) ?? 9999
    const n = countChars(r.content)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ ${max}`, n <= max, `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(`'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`,
      r.content.trim() !== passageOf.get(r.source_key)!.trim())
    // 금지어(감정어) — 형태소 없이 문자열로. 모범답안이 자기 목록에 걸리면 실패다.
    const hits = findForbidden(r.content, (cfg.forbidWords as string[] | undefined) ?? [])
    t(`'${r.source_key}' ord${r.ord}: 금지 감정어가 없다`, hits.length === 0, JSON.stringify(hits))
  }

  // 물기: 지문은 감정어를 품고 있어 forbidWords 에 걸린다(그래서 훈련이 성립한다)
  for (const d of ea) {
    const hits = findForbidden(d.passage ?? '', (d.scoring_config.forbidWords as string[] | undefined) ?? [])
    t(`물기: '${d.source_key}' 지문은 감정어에 걸린다`, hits.length > 0, `"${d.passage}"`)
  }

  // 형태소 규칙(동사·부사·관형·반복) — 서버 있을 때만
  pushRefMorphCheck('2단계', refs, 'convert', cfgOf)
}

// ── 3단계 trim_padding(군더더기 빼기): 모범답안 대조 (세션 23) ───────────
//
// answers.json 의 reference[] 에 8문항 × ord 1(가)/2(나) = 16행. blank_key ''.
// 2단계와 같은 결 — 다만 '지우는' 단계라 모범답안의 문장 수가 원문보다 반드시
// 적어야 한다(추가 단언).
console.log('\n[3단계 trim_padding: 모범답안 대조]')
{
  interface TpProblem {
    source_key: string
    skill_key: string
    type: string
    passage: string | null
    instruction: string
    scoring_config: ScoringConfig
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const tp = readDump<TpProblem[]>('problems.json').filter((d) => d.skill_key === 'trim_padding')
  const tpKeys = new Set(tp.map((d) => d.source_key))
  const refs = (readDump<{ reference?: RefRow[] }>('answers.json').reference ?? []).filter((r) =>
    tpKeys.has(r.source_key)
  )
  const cfgOf = new Map(tp.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(tp.map((d) => [d.source_key, d.passage ?? '']))

  t('덤프에 trim_padding 8문항', tp.length === 8, `실제=${tp.length}`)
  t('전부 remove 유형', tp.every((d) => d.type === 'remove'))
  t('모범답안 16행', refs.length === 16, `실제=${refs.length}`)
  t('모범답안 전부 blank_key 가 빈 문자열', refs.every((r) => r.blank_key === ''),
    JSON.stringify(refs.filter((r) => r.blank_key !== '').map((r) => r.source_key)))

  for (const d of tp) {
    const ords = refs.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }

  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const max = (cfg.maxChars as number | undefined) ?? 9999
    const n = countChars(r.content)
    const passage = passageOf.get(r.source_key)!
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ ${max}`, n <= max, `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(`'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`, r.content.trim() !== passage.trim())
    // 지우는 단계 — 모범답안의 문장 수가 원문보다 적어야 한다.
    const sModel = countSentences(r.content)
    const sPassage = countSentences(passage)
    t(`'${r.source_key}' ord${r.ord}: 문장 수 ${sModel} < 원문 ${sPassage}`,
      sModel < sPassage, `"${r.content}"`)
  }

  // ── maxChars 재조정 (세션 23) ──
  // 상한 = '필수 문장을 원문 그대로 남긴' 정직한 답의 자수 + 2. 지우기 단계가
  // 고쳐쓰기를 강요하면 안 된다(실사용에서 40자 정직한 답이 상한 38 에 걸렸다).
  const OLD_MAX: Record<string, number> = {
    'tp-axe-water': 38, 'tp-heungbu-yard': 35, 'tp-simcheong-rail': 35, 'tp-gyeonu-river': 35,
    'tp-kongjwi-crack': 35, 'tp-rabbit-gate': 33, 'tp-siblings-floor': 38, 'tp-goblin-mark': 37,
  }
  const HONEST: Record<string, string> = {
    'tp-axe-water': '나무꾼은 연못가에 앉았다. 도끼는 물속에 보이지 않았다. 그는 소매를 걷고 물에 손을 넣었다.',
    'tp-heungbu-yard': '흥부는 마당에 나갔다. 제비 한 마리가 떨어져 있었다. 흥부는 제비를 두 손으로 들어 올렸다.',
    'tp-simcheong-rail': '심청은 뱃전에 섰다. 공양미 삼백 석이 이 배에 실려 있었다. 심청은 치마를 걷어쥐었다.',
    'tp-gyeonu-river': '견우는 강가에 나왔다. 까치들이 하늘을 덮었다. 견우는 강물에 발을 담갔다.',
    'tp-kongjwi-crack': '콩쥐는 독 앞에 앉았다. 바닥에 금이 가 있었다. 콩쥐는 손바닥으로 그 자리를 눌렀다.',
    'tp-rabbit-gate': '토끼는 용궁 문 앞에 섰다. 문지기가 창을 내렸다. 토끼는 웃으며 한 걸음 나섰다.',
    'tp-siblings-floor': '오누이는 마루 밑에 숨었다. 문밖에서 발소리가 났다. 오라비가 동생의 입을 막았다.',
    'tp-goblin-mark': '나무꾼은 방망이를 상 위에 올렸다. 방망이에 검은 자국이 남아 있었다. 그는 그것을 다시 집어 들었다.',
  }
  let oldLeak = 0
  for (const d of tp) {
    const max = d.scoring_config.maxChars as number
    const honest = HONEST[d.source_key]
    const hn = countChars(honest)
    t(`'${d.source_key}': 정직한 답 ${hn}자 ≤ 상한 ${max}`, hn <= max, `"${honest}"`)
    t(`'${d.source_key}': 상한 = 필수 문장 자수 + 2`, max === hn + 2, `${max} vs ${hn}+2`)
    if (hn > OLD_MAX[d.source_key]) oldLeak++
    // 조임: 정직한 답 + 원문 군더더기 한 문장(가장 짧은 것)은 상한을 넘는다
    const sents = (passageOf.get(d.source_key)!.match(/[^.!?]+[.!?]/g) ?? []).map((s) => s.trim())
    const padding = sents.filter((s) => !honest.includes(s))
    const shortest = padding.reduce((a, b) => (countChars(a) <= countChars(b) ? a : b))
    t(`'${d.source_key}': 정직한 답 + 군더더기 한 문장 > 상한 (조임 살아 있음)`,
      countChars(`${honest} ${shortest}`) > max, `+"${shortest}"`)
  }
  t('물기: 상한을 옛 값으로 되돌리면 정직한 답 6건이 샌다', oldLeak === 6, `실제=${oldLeak}`)

  // 지시문 규격(세션 24): 공통부에 '남길 것 / 지울 것 / 문장째 지우기만'.
  const COMMON = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.'
  for (const d of tp) {
    t(`'${d.source_key}': 지시문이 공통부로 시작한다`, d.instruction.startsWith(COMMON))
    t(`'${d.source_key}': 지시문에 '문장째' 가 있다`, d.instruction.includes('문장째'))
  }
  // 문항별 조항 넷 · 공통부만 넷
  const withClause = ['tp-axe-water', 'tp-heungbu-yard', 'tp-kongjwi-crack', 'tp-goblin-mark']
  for (const d of tp) {
    const extra = d.instruction.slice(COMMON.length).trim()
    t(`'${d.source_key}': 조항 ${withClause.includes(d.source_key) ? '있음' : '없음(공통부만)'}`,
      withClause.includes(d.source_key) ? extra.length > 0 : extra.length === 0, `"${extra}"`)
  }

  // update SQL 이 덤프와 갈리지 않았는지 (scoring_config jsonb · instruction 글자까지)
  {
    const updSql = readFileSync(
      path.join(__dirname, '..', '..', 'seed', 'update-trim-padding.sql'), 'utf8')
    const rows = [...updSql.matchAll(
      /update problems set scoring_config = '(.+?)'::jsonb,\s*\n\s*instruction = '((?:[^']|'')*)'\s*\n\s*where source_key = '([^']*)';/g
    )].map((m) => ({
      cfg: JSON.parse(m[1]) as Record<string, unknown>,
      instruction: m[2].replace(/''/g, "'"),
      source_key: m[3],
    }))
    t('update SQL 에 8행이 있다', rows.length === 8, `실제=${rows.length}`)
    const canon = (o: unknown) => JSON.stringify(o, Object.keys(o as object).sort())
    for (const d of tp) {
      const row = rows.find((r) => r.source_key === d.source_key)
      t(`update SQL '${d.source_key}' 이 덤프와 같다 (scoring_config · instruction)`,
        !!row && canon(row.cfg) === canon(d.scoring_config) && row.instruction === d.instruction,
        `SQL=${JSON.stringify(row)}`)
    }
  }

  // 형태소 규칙(동사·반복) — 서버 있을 때만
  pushRefMorphCheck('3단계', refs, 'remove', cfgOf)
}

// ── 4단계 reduce_repeat(반복 표현 제거): 원문·모범답안 대조 (세션 27) ─────
//
// 세션 27: 실사용에서 원문 8건이 "문제를 위해 일부러 어색하게 쓴 문장"이라는
// 판정을 받아, 원작 전래동화(저작권 소멸)의 장면·대사로 소설다운 원문을 다시
// 썼다. 반복 결함(repeatTargets 초과)은 훈련 목적상 의도적으로 유지한다.
//
// 새 원칙(4단계 자수 상한): maxChars = 새 원문의 countChars(공백 제외) 그대로.
// 반복 고치기가 압축을 강요하면 안 된다(세션 23 원칙의 4단계 판). 원문 그대로
// 제출하는 꼼수는 자수가 아니라 repeatTargets('겹친 말')에서 걸린다 — 이 검사는
// 형태소가 필요 없다(답안 문자열의 낱말 횟수).
//
// answers.json 의 reference[] 에 8문항 × ord 1(가)/2(나) = 16행. blank_key ''.
console.log('\n[4단계 reduce_repeat: 원문·모범답안 대조]')
{
  interface RpProblem {
    source_key: string
    skill_key: string
    type: string
    passage: string | null
    instruction: string
    scoring_config: ScoringConfig
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const rp = readDump<RpProblem[]>('problems.json').filter((d) => d.skill_key === 'reduce_repeat')
  const rpKeys = new Set(rp.map((d) => d.source_key))
  const refs = (readDump<{ reference?: RefRow[] }>('answers.json').reference ?? []).filter((r) =>
    rpKeys.has(r.source_key)
  )
  const cfgOf = new Map(rp.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(rp.map((d) => [d.source_key, d.passage ?? '']))

  t('덤프에 reduce_repeat 8문항', rp.length === 8, `실제=${rp.length}`)
  t('전부 remove 유형', rp.every((d) => d.type === 'remove'))
  t('모범답안 16행', refs.length === 16, `실제=${refs.length}`)
  t('모범답안 전부 blank_key 가 빈 문자열', refs.every((r) => r.blank_key === ''),
    JSON.stringify(refs.filter((r) => r.blank_key !== '').map((r) => r.source_key)))

  for (const d of rp) {
    const ords = refs.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }

  // ── 불변식: maxChars == countChars(새 원문) — 세션 27 새 원칙을 코드로 문다 ──
  // 반복 고치기가 압축을 강요하면 안 된다. 상한이 원문 자수 그대로면 원문을
  // 그대로 내도 자수로는 안 걸린다 — 대신 repeatTargets 로 걸린다(아래 물기).
  for (const d of rp) {
    const max = d.scoring_config.maxChars as number
    const n = countChars(d.passage ?? '')
    t(`'${d.source_key}': maxChars ${max} == 원문 자수 ${n}`, max === n, `"${d.passage}"`)
  }

  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const max = (cfg.maxChars as number | undefined) ?? 9999
    const n = countChars(r.content)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ ${max}`, n <= max, `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(`'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`,
      r.content.trim() !== passageOf.get(r.source_key)!.trim())
    // repeatTargets — 모범답안이 이 한도 안이어야 한다(형태소 불필요).
    const rt = (cfg.repeatTargets ?? []) as { word: string; max: number }[]
    const over = rt.filter((tg) => countOccurrences(r.content, tg.word) > tg.max)
    t(`'${r.source_key}' ord${r.ord}: repeatTargets 전 단어 한도 안`, over.length === 0,
      JSON.stringify(over.map((tg) => `${tg.word} ${countOccurrences(r.content, tg.word)}/${tg.max}`)))
    // 출하 코드(combine)로도 같은 결론
    const res = combine(
      { id: r.source_key, type: 'remove', scoring_mode: 'auto', scoring_config: cfg },
      { text: r.content }, undefined, null)
    t(`'${r.source_key}' ord${r.ord}: combine 의 repeatTargets 검사가 pass`,
      res.checks.find((c) => c.key === 'repeatTargets')?.status === 'pass')
  }

  // 물기(형태소 불필요): 새 원문 8건을 그대로 제출하면 repeatTargets('겹친 말')
  // 로 걸린다. 초과 단어·횟수까지 대조한다 — 어느 낱말이 몇 회여서 걸렸는지.
  const RAW_OVER: Record<string, Record<string, number>> = {
    'rp-axe-gold': { 도끼: 6, 산신령: 2 },
    'rp-heungbu-gourd': { 박: 5, 흥부: 2 },
    'rp-simcheong-sea': { 바다: 5, 심청: 3 },
    // kongjwi: 우물 + 물을×3 + 물은 = 5회 (부분 문자열). 세션 27 후기에 마지막
    // 문장 '물동이' → '항아리' 로 갈아 6→5. 한도는 그대로 2회 (올리면 한 음절 구멍).
    'rp-kongjwi-jar': { 물: 5, 콩쥐: 3 },
    'rp-magpie-bridge': { 다리: 5 },
    'rp-rabbit-liver': { 간: 4, 토끼: 4 },
    'rp-siblings-rope': { 동아줄: 4, 오누이: 3 },
    'rp-goblin-club': { 방망이: 4, 도깨비: 2 },
  }
  t('RAW_OVER 가 8문항을 덮는다', Object.keys(RAW_OVER).length === rp.length)
  for (const d of rp) {
    const rt = (d.scoring_config.repeatTargets ?? []) as { word: string; max: number }[]
    t(`'${d.source_key}': repeatTargets 지정 (word·max)`,
      rt.length >= 1 && rt.every((tg) => tg.word.length > 0 && tg.max >= 1), JSON.stringify(rt))
    const res = combine(
      { id: d.source_key, type: 'remove', scoring_mode: 'auto', scoring_config: d.scoring_config },
      { text: d.passage ?? '' }, undefined, null)
    const rtCheck = res.checks.find((c) => c.key === 'repeatTargets')!
    t(`물기: '${d.source_key}' 원문 그대로 제출은 '겹친 말' fail`,
      rtCheck.status === 'fail' && rtCheck.label === '겹친 말', JSON.stringify(rtCheck))
    // 원문은 자수로는 안 걸린다(maxChars == 원문 자수)
    t(`물기: '${d.source_key}' 원문은 maxChars 로는 안 걸린다`,
      res.checks.find((c) => c.key === 'maxChars')?.status !== 'fail')
    // 초과 단어·횟수 대조 — evidence 는 "낱말 N회"
    const want = RAW_OVER[d.source_key]
    const got = Object.fromEntries(
      (rtCheck.evidence ?? []).map((e) => {
        const mm = e.match(/^(.+?) (\d+)회$/)!
        return [mm[1], Number(mm[2])]
      })
    )
    t(`물기: '${d.source_key}' 초과 낱말·횟수가 예상과 같다`,
      JSON.stringify(got) === JSON.stringify(want),
      `got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)
    // 직접 countOccurrences 로도 같은 값
    for (const [w, c] of Object.entries(want)) {
      t(`물기: '${d.source_key}' countOccurrences('${w}')=${c}`,
        countOccurrences(d.passage ?? '', w) === c)
    }
  }

  // ── rp-siblings-rope: 옛 '밧줄' → 원작 어휘 '동아줄' (세션 27) ──
  {
    const sr = rp.find((d) => d.source_key === 'rp-siblings-rope')!
    const words = ((sr.scoring_config.repeatTargets ?? []) as { word: string }[]).map((tg) => tg.word)
    t("rp-siblings-rope: repeatTargets 에 '밧줄' 없음", !words.includes('밧줄'), JSON.stringify(words))
    t("rp-siblings-rope: repeatTargets 에 '동아줄'·'오누이' 있음",
      words.includes('동아줄') && words.includes('오누이'), JSON.stringify(words))
    t("rp-siblings-rope: 지시문에 '동아줄이 튼튼하다는 것' 포함",
      sr.instruction.includes('동아줄이 튼튼하다는 것'), sr.instruction)
    const jointext = [
      ...rp.map((d) => `${d.passage}\n${d.instruction}\n${JSON.stringify(d.scoring_config)}`),
      ...refs.map((r) => r.content),
    ].join('\n')
    t("물기: '밧줄' 이 4단계 덤프(원문·지시문·설정·모범답안) 어디에도 없다",
      !jointext.includes('밧줄'))
  }

  // ── rp-kongjwi-jar: 합성어 함정 제거 (세션 27 후기, 실사용 발견) ──
  // repeatTargets 는 부분 문자열을 센다. 원문의 '물동이' 가 '물' 을 선점해, 맨
  // '물' 반복만 고친 정직한 답이 한도(2회)를 못 넘어 어휘 교체를 강요당했다.
  // 마지막 문장의 '물동이' → '항아리'. 한도는 그대로 — 올리면 한 음절 구멍이 열린다.
  {
    const kj = rp.find((d) => d.source_key === 'rp-kongjwi-jar')!
    const kjRefs = refs.filter((r) => r.source_key === 'rp-kongjwi-jar')
    t("rp-kongjwi-jar: 원문에 '물동이' 가 없다 (합성어 함정 가드)",
      !(kj.passage ?? '').includes('물동이'), kj.passage ?? '')
    t("rp-kongjwi-jar: 모범답안에도 '물동이' 가 없다",
      kjRefs.every((r) => !r.content.includes('물동이')),
      JSON.stringify(kjRefs.map((r) => r.content)))
    // 한도는 물 2 · 콩쥐 2 그대로
    const rt = (kj.scoring_config.repeatTargets ?? []) as { word: string; max: number }[]
    t("rp-kongjwi-jar: repeatTargets 한도 물 2 · 콩쥐 2 유지",
      JSON.stringify(rt) === JSON.stringify([{ word: '물', max: 2 }, { word: '콩쥐', max: 2 }]),
      JSON.stringify(rt))
    // 학습자 경로 물기: '우물' 을 살린 정직한 답이 repeatTargets 를 통과한다
    // (물 2회 — '우물' 포함, 콩쥐 2회). 함정이 걷혀 어휘 교체 없이 고칠 수 있다.
    const honest =
      '콩쥐는 우물에서 물을 길어다 부었지만 독 밑으로 다 새어 나갔다. 채워도 채워도 차지 않았다. 콩쥐는 항아리를 안은 채 주저앉아 울었다.'
    t("물기: '우물' 을 살린 정직한 답이 물 2회 · 콩쥐 2회",
      countOccurrences(honest, '물') === 2 && countOccurrences(honest, '콩쥐') === 2,
      `물=${countOccurrences(honest, '물')} 콩쥐=${countOccurrences(honest, '콩쥐')}`)
    const hres = combine(
      { id: kj.source_key, type: 'remove', scoring_mode: 'auto', scoring_config: kj.scoring_config },
      { text: honest }, undefined, null)
    t("물기: '우물' 을 살린 정직한 답이 repeatTargets 통과 (함정이 걷혔다)",
      hres.checks.find((c) => c.key === 'repeatTargets')?.status === 'pass',
      JSON.stringify(hres.checks.find((c) => c.key === 'repeatTargets')))
  }

  // ── 물기: 옛 passage 가 덤프 어디에도 안 남아 있다 (세션 27 교체) ──
  {
    const dumpText =
      readFileSync(path.join(seedDir, 'problems.json'), 'utf8') +
      readFileSync(path.join(seedDir, 'answers.json'), 'utf8')
    const GONE = [
      '산신령이 금도끼를 들었다.',
      '흥부는 박을 켰다.',
      '심청은 바다를 보았다.',
      '콩쥐는 물을 길었다.',
      '까치들이 다리를 놓았다.',
      '용왕은 간을 요구했다.',
      '오누이는 밧줄을 잡았다.',
      '도깨비가 방망이를 두드렸다.',
    ]
    for (const g of GONE) {
      t(`물기: 옛 원문 "${g}" 가 덤프에 안 남아 있다`, !dumpText.includes(g))
    }
  }

  // ── 화면 병합: maxRepeat('반복 어휘') + repeatTargets('겹친 말') → 한 행 ──
  {
    const d = rp.find((x) => x.source_key === 'rp-kongjwi-jar')! // 물 2 · 콩쥐 2
    const prob = {
      id: d.source_key, type: 'remove' as const, scoring_mode: 'auto' as const,
      scoring_config: d.scoring_config,
    }
    // 답안: '물' 4회(repeatTargets fail) · 두 음절 반복 없음(maxRepeat pass)
    const bad = combine(prob, { text: '물을 붓고 물을 또 붓고 물을 더 부어도 물은 샜다.' },
      undefined, emptyMorph({ verbs: ['붓', '새'], repeats: [] }))
    const rawKeys = bad.checks.filter((c) => c.key === 'maxRepeat' || c.key === 'repeatTargets')
    t('병합 전: 두 검사가 따로 있다', rawKeys.length === 2)
    const merged = mergeRepeatChecks(bad.checks)
    const mrows = merged.filter((c) => c.key === 'maxRepeat' || c.key === 'repeatTargets')
    t('병합 후: 행이 하나뿐', mrows.length === 1 && mrows[0].key === 'maxRepeat')
    const row = mrows[0]
    t('병합 행 라벨 "같은 말 반복"', row.label === '같은 말 반복')
    t('병합 행 rule "같은 말 2회까지"', row.rule === '같은 말 2회까지')
    t('병합: 한쪽이 fail 이면 x', row.status === 'fail')
    t('병합: 칩에 repeatTargets 걸린 단어(물)', !!row.evidence?.some((e) => e.startsWith('물')))

    // 둘 다 pass → '없음'
    const ok = combine(prob, { text: '콩쥐가 물을 부었다. 독이 샜다.' }, undefined,
      emptyMorph({ verbs: ['붓', '새'], repeats: [] }))
    const okRow = mergeRepeatChecks(ok.checks).find((c) => c.key === 'maxRepeat')!
    t('병합: 둘 다 pass 면 "없음"', okRow.status === 'pass' && okRow.detail === '없음')

    // maxRepeat 만 fail(두 음절 반복) → 병합도 x, 칩 합집합
    const rep = combine(prob, { text: '콩쥐가 바가지로 펐다.' }, undefined,
      emptyMorph({ verbs: ['푸'], repeats: [{ word: '바가지', count: 3 }] }))
    const repRow = mergeRepeatChecks(rep.checks).find((c) => c.key === 'maxRepeat')!
    t('병합: maxRepeat 만 fail 이어도 x · 칩에 그 단어',
      repRow.status === 'fail' && !!repRow.evidence?.some((e) => e.startsWith('바가지')))

    // 물기: 검사 하나만 있으면 병합 안 함
    const only: Check[] = [
      { key: 'maxRepeat', label: '반복 어휘', status: 'pass', detail: '없음', rule: 'x' },
    ]
    t('병합 물기: maxRepeat 만 있으면 그대로', mergeRepeatChecks(only).length === 1 &&
      mergeRepeatChecks(only)[0].label === '반복 어휘')
  }
  const trainSrc = readFileSync(
    path.join(__dirname, '..', '..', 'components', 'train', 'TrainClient.tsx'), 'utf8')
  t('TrainClient 가 displayChecks·criteriaChecks 에 mergeRepeatChecks 를 쓴다',
    (trainSrc.match(/mergeRepeatChecks\(/g) ?? []).length >= 2)

  // update SQL 이 덤프와 갈리지 않았는지 — 세션 27.
  //  v2 (update-reduce-repeat-v2.sql): rp- 8건 passage·instruction·scoring_config
  //     (jsonb 통째로) + reference_answers 16행 content. 이미 DB 에 실행됐다.
  //  v3 (update-reduce-repeat-v3.sql): v2 실행 후 — kongjwi 합성어 함정 제거
  //     (물동이→항아리). problems 1건 passage + reference 1행 content.
  //  v4 (update-reduce-repeat-v4.sql): v3 실행 후 — magpie 가를 박 님 실제 통과
  //     답안으로 교체. reference 1행 content.
  //  v2 → v3 → v4 순으로 덮어쓴 최종 상태가 덤프와 같아야 한다(뒤가 이김).
  {
    const parseUpd = (file: string) => {
      const sql = readFileSync(path.join(__dirname, '..', '..', 'seed', file), 'utf8')
      const prob = [...sql.matchAll(
        /update problems set\n\s*passage = '((?:[^']|'')*)',\n(?:\s*instruction = '((?:[^']|'')*)',\n)?\s*scoring_config = '(.+?)'::jsonb\n\s*where source_key = '([^']*)';/g
      )].map((m) => ({
        passage: m[1].replace(/''/g, "'"),
        instruction: m[2]?.replace(/''/g, "'"),
        cfg: JSON.parse(m[3]) as Record<string, unknown>,
        source_key: m[4],
      }))
      // v3 은 scoring_config 을 안 싣는다 — passage 만 갱신하는 update 도 잡는다
      const probPassageOnly = [...sql.matchAll(
        /update problems set\n\s*passage = '((?:[^']|'')*)'\n\s*where source_key = '([^']*)';/g
      )].map((m) => ({ passage: m[1].replace(/''/g, "'"), source_key: m[2] }))
      const ref = [...sql.matchAll(
        /update reference_answers set content =\n\s*'((?:[^']|'')*)'\n\s*where problem_id = \(select id from problems where source_key = '([^']*)'\)\n\s*and ord = (\d+) and blank_key = '';/g
      )].map((m) => ({
        content: m[1].replace(/''/g, "'"),
        source_key: m[2],
        ord: Number(m[3]),
      }))
      return { prob, probPassageOnly, ref }
    }
    // deep canonical: 객체 키 정렬 + 배열 원소 재귀
    const canon = (o: unknown): unknown =>
      Array.isArray(o)
        ? o.map(canon)
        : o && typeof o === 'object'
          ? Object.fromEntries(Object.keys(o as object).sort().map((k) => [k, canon((o as Record<string, unknown>)[k])]))
          : o
    const cj = (o: unknown) => JSON.stringify(canon(o))

    const v2 = parseUpd('update-reduce-repeat-v2.sql')
    const v3 = parseUpd('update-reduce-repeat-v3.sql')
    const v4 = parseUpd('update-reduce-repeat-v4.sql')
    t('v2 SQL 에 problems update 8행', v2.prob.length === 8, `실제=${v2.prob.length}`)
    t('v2 SQL 에 reference_answers update 16행', v2.ref.length === 16, `실제=${v2.ref.length}`)
    t('v3 SQL 에 kongjwi passage update 1건', v3.probPassageOnly.length === 1 &&
      v3.probPassageOnly[0].source_key === 'rp-kongjwi-jar',
      JSON.stringify(v3.probPassageOnly))
    t('v3 SQL 에 kongjwi reference update 1행', v3.ref.length === 1 &&
      v3.ref[0].source_key === 'rp-kongjwi-jar' && v3.ref[0].ord === 1,
      JSON.stringify(v3.ref))
    t("v3 SQL 이 싣는 데이터에 '물동이' 가 없다 (항아리로 갈았다)",
      !v3.probPassageOnly[0].passage.includes('물동이') && !v3.ref[0].content.includes('물동이'))
    t('v4 SQL 은 magpie reference 1행만 (passage·cfg 안 건드림)',
      v4.ref.length === 1 && v4.ref[0].source_key === 'rp-magpie-bridge' && v4.ref[0].ord === 1 &&
      v4.prob.length === 0 && v4.probPassageOnly.length === 0,
      JSON.stringify(v4))

    // 최종 passage/instruction/cfg: v2 → v3(passage) 덮어쓰기
    const finalPassage = new Map<string, string>()
    const finalInstr = new Map<string, string>()
    const finalCfg = new Map<string, unknown>()
    for (const r of v2.prob) {
      finalPassage.set(r.source_key, r.passage)
      finalInstr.set(r.source_key, r.instruction!)
      finalCfg.set(r.source_key, r.cfg)
    }
    for (const r of v3.probPassageOnly) finalPassage.set(r.source_key, r.passage)
    for (const d of rp) {
      t(`v2+v3+v4 최종 '${d.source_key}' passage 가 덤프와 같다`,
        finalPassage.get(d.source_key) === d.passage,
        `SQL=${JSON.stringify(finalPassage.get(d.source_key))}`)
      t(`v2 '${d.source_key}' instruction·scoring_config 가 덤프와 같다`,
        finalInstr.get(d.source_key) === d.instruction &&
          cj(finalCfg.get(d.source_key)) === cj(d.scoring_config),
        `SQL instr=${JSON.stringify(finalInstr.get(d.source_key))}`)
    }

    // 최종 reference content: v2 → v3 → v4 덮어쓰기
    const finalRef = new Map<string, string>()
    for (const r of [...v2.ref, ...v3.ref, ...v4.ref]) finalRef.set(`${r.source_key}#${r.ord}`, r.content)
    for (const r of refs) {
      t(`v2+v3+v4 최종 '${r.source_key}' ord${r.ord} content 가 덤프와 같다`,
        finalRef.get(`${r.source_key}#${r.ord}`) === r.content,
        `SQL=${JSON.stringify(finalRef.get(`${r.source_key}#${r.ord}`))}`)
    }
  }

  // 형태소 규칙(동사·반복 ≤ 2) — 서버 있을 때만. 모범답안이 제 규칙을 지킨다.
  pushRefMorphCheck('4단계', refs, 'remove', cfgOf)
}

// ── 도입 1 start_choose(첫 문장 고르기): 5문항 신설 (세션 28) ────────────
//
// 도입 트랙 첫 문항. 근거는 작법 문서의 카메라 앵글 원칙(1화는 주인공에게서
// 시작) · 구체 이미지 원칙(추상 서술 금지) · 거시 서술 지양 · [IN-01] 다섯
// 줄의 승부. 정답 = 주인공이 구체적 사물을 상대로 행동하는 문장. 오답 3종 =
// 거시 서술 · 타인물 앵글 · 추상 분위기. choice 라 형태소 불필요.
//
// 표면 지표 물기(세션 3 4-1 의 일반화): 정답이 자수·index 로 뽑히면 안 된다.
console.log('\n[도입 1 start_choose: 5문항 신설]')
{
  interface ScProblem {
    source_key: string
    skill_key: string
    type: string
    choices: string[] | null
    passage: string | null
    scoring_config: Record<string, unknown>
    instruction: string
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const sc = readDump<ScProblem[]>('problems.json').filter((d) => d.skill_key === 'start_choose')
  const scKeys = new Set(sc.map((d) => d.source_key))
  const scAns = readDump<{ answers?: { source_key: string; answer: { kind: string; index?: number } }[] }>(
    'answers.json'
  ).answers!.filter((a) => scKeys.has(a.source_key))

  t('덤프에 start_choose 5문항', sc.length === 5, `실제=${sc.length}`)
  t('전부 choice 유형 · passage 없음', sc.every((d) => d.type === 'choice' && d.passage === null))
  t('전부 choices 4개', sc.every((d) => Array.isArray(d.choices) && d.choices!.length === 4),
    JSON.stringify(sc.map((d) => d.choices?.length)))
  t('전부 scoring_config 빈 객체', sc.every((d) => JSON.stringify(d.scoring_config) === '{}'))
  t('지시문이 다 "…고르시오." 로 끝난다',
    sc.every((d) => d.instruction.trim().endsWith('고르시오.')))

  t('answers 에 start_choose 5건', scAns.length === 5, `실제=${scAns.length}`)
  t('전부 kind choice · index 0..3',
    scAns.every((a) => a.answer.kind === 'choice' &&
      Number.isInteger(a.answer.index) && a.answer.index! >= 0 && a.answer.index! <= 3),
    JSON.stringify(scAns.map((a) => a.answer)))
  // 출하 코드로 정답/오답 판정
  for (const d of sc) {
    const ans = scAns.find((a) => a.source_key === d.source_key)!
    const idx = ans.answer.index!
    const good = combine(
      { id: d.source_key, type: 'choice', scoring_mode: 'auto', scoring_config: {} },
      { choiceIndex: idx }, { kind: 'choice', index: idx }, null)
    t(`'${d.source_key}': 정답 index ${idx} 제출 → pass`, good.status === 'pass')
    const wrong = (idx + 1) % 4
    const bad = combine(
      { id: d.source_key, type: 'choice', scoring_mode: 'auto', scoring_config: {} },
      { choiceIndex: wrong }, { kind: 'choice', index: idx }, null)
    t(`'${d.source_key}': 오답 index ${wrong} 제출 → fail`, bad.status === 'fail')
  }

  // ── 설계 물기 — 정답은 주인공이 행동하는 문장이다 ──
  // 정답 choice 는 주인공 이름을 담고, 오답 3종(거시·타인물·추상)은 안 담는다.
  // 답안 index 가 엉뚱한 곳을 가리키면(자기일관 데이터라 판정 검사는 못 잡음)
  // 여기서 걸린다.
  const PROTAG: Record<string, string> = {
    'sc-hunter-status': '강도윤',
    'sc-sword-ruin': '진운',
    'sc-broken-vow': '하은수',
    'sc-villainess-chains': '카리엘',
    'sc-boss-mirror': '이재하',
  }
  t('PROTAG 가 5문항을 덮는다', Object.keys(PROTAG).length === sc.length)
  for (const d of sc) {
    const ans = scAns.find((a) => a.source_key === d.source_key)!
    const name = PROTAG[d.source_key]
    t(`'${d.source_key}': 지시문에 주인공 '${name}'`, d.instruction.includes(name))
    d.choices!.forEach((c, i) => {
      if (i === ans.answer.index) {
        t(`'${d.source_key}': 정답 choice[${i}] 에 주인공 이름`, c.includes(name), c)
      } else {
        t(`'${d.source_key}': 오답 choice[${i}] 에 주인공 이름 없음`, !c.includes(name), c)
      }
    })
  }

  // ── 표면 지표 물기 — 정답이 자수·자리로 뽑히면 안 된다 ──
  const cc = (s: string) => s.replace(/\s/g, '').length
  let longestHits = 0
  let shortestHits = 0
  for (const d of sc) {
    const ans = scAns.find((a) => a.source_key === d.source_key)!
    const lens = d.choices!.map(cc)
    const cl = lens[ans.answer.index!]
    if (cl === Math.max(...lens)) longestHits++
    if (cl === Math.min(...lens)) shortestHits++
  }
  t(`물기: 정답 자수가 5문항 모두에서 최장은 아니다 (실제 ${longestHits}/5)`, longestHits < 5)
  t(`물기: 정답 자수가 5문항 모두에서 최단도 아니다 (실제 ${shortestHits}/5)`, shortestHits < 5)
  const idxCount = new Map<number, number>()
  for (const a of scAns) idxCount.set(a.answer.index!, (idxCount.get(a.answer.index!) ?? 0) + 1)
  const maxIdx = Math.max(...idxCount.values())
  t(`물기: 정답 index 가 한 값에 3회 초과로 몰리지 않는다 (최다 ${maxIdx}회)`, maxIdx <= 3,
    JSON.stringify([...idxCount]))

  // stages 코치
  const stagesDump = readDump<{ skill_key: string; coach_intro: string; coach_line: string }[]>('stages.json')
  const st = stagesDump.find((s) => s.skill_key === 'start_choose')!
  t('stages start_choose 에 coach_intro·coach_line 존재',
    st.coach_intro.length > 0 && st.coach_line.length > 0)

  // ── 해설 층 (세션 28 둘째): reference_answers 재활용 ──
  // source_key = sc-* · ord = 선택지 번호(1~4) · blank_key '' · content = 해설.
  // 화면: 오답이면 고른 것 한 줄, 정답이면 4개 전부 + 정답 표식.
  {
    interface RefRow2 { source_key: string; ord: number; blank_key: string; content: string }
    const expl = readDump<{ reference?: RefRow2[] }>('answers.json').reference!
      .filter((r) => scKeys.has(r.source_key))
    t('해설: sc-* 5문항 × ord 1~4 = 20행', expl.length === 20, `실제=${expl.length}`)
    for (const d of sc) {
      const ords = expl.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
      t(`해설 '${d.source_key}': ord 1~4 완비`, JSON.stringify(ords) === '[1,2,3,4]', JSON.stringify(ords))
    }
    t('해설 전부 blank_key 빈 문자열', expl.every((r) => r.blank_key === ''))
    t('해설 전부 비어 있지 않다', expl.every((r) => r.content.trim().length > 0))

    // ── 교차 물기: ord 어긋남을 잡는 그물 ──
    // 오답 해설은 결함을 지적한다("없다·아직·못했다·설명이다·역사서·…에게 가
    // 있다"). 정답 해설은 그런 지적이 없다. 답안 ord 가 엉뚱한 곳을 가리키면
    // (자기일관 데이터라 판정 검사는 못 잡음) 여기서 걸린다.
    const FLAW = ['없', '아직', '못', '아니', '설명', '역사서', '가 있다']
    const flaws = (s: string) => FLAW.filter((p) => s.includes(p))
    for (const d of sc) {
      const ans = scAns.find((a) => a.source_key === d.source_key)!
      const correctOrd = ans.answer.index! + 1
      for (const r of expl.filter((x) => x.source_key === d.source_key)) {
        if (r.ord === correctOrd) {
          t(`해설 '${d.source_key}' 정답 ord${r.ord}: 결함 지적 패턴 없음`,
            flaws(r.content).length === 0, `${r.content} ← ${JSON.stringify(flaws(r.content))}`)
        } else {
          t(`해설 '${d.source_key}' 오답 ord${r.ord}: 결함 지적 패턴 있음`,
            flaws(r.content).length > 0, r.content)
        }
      }
    }

    // 화면 배선
    const root = path.join(__dirname, '..', '..')
    const ceSrc = readFileSync(path.join(root, 'components', 'train', 'ChoiceExplain.tsx'), 'utf8')
    t('ChoiceExplain: 오답이면 고른 것 한 줄만 (passed 분기)',
      /if \(!passed\)/.test(ceSrc) && /choices\[chosenIndex\]/.test(ceSrc))
    t('ChoiceExplain: 정답이면 choices 전부 순회 + 정답 표식',
      /choices\.map\(/.test(ceSrc) && /i === chosenIndex/.test(ceSrc) && /정답/.test(ceSrc))
    t('ChoiceExplain: choice 전용 캡션 (가/나 문구 아님)',
      ceSrc.includes('각 문장이 통하는지, 왜 안 통하는지.') &&
        !ceSrc.includes('정해진 답은 없다'))
    t('ChoiceExplain: ord = index+1 로 해설을 찾는다',
      /r\.ord === i \+ 1/.test(ceSrc))
    const tcSrc = readFileSync(path.join(root, 'components', 'train', 'TrainClient.tsx'), 'utf8')
    t('TrainClient: choice 는 ChoiceExplain 으로 분기 (SelfCheck 경로와 분리)',
      /problem\.type === 'choice' \? \(/.test(tcSrc) && /<ChoiceExplain/.test(tcSrc))
    t('TrainClient: ChoiceExplain 에 passed = 통과 여부를 넘긴다',
      /passed=\{result\.status === 'pass'\}/.test(tcSrc))
    // ── 세션 28 셋째: 오답 해설 미표시 버그 ──
    // 제출 순간의 선택지를 별도 상태(setSubmittedChoice)로 두면 setResult 뒤
    // async 연속부에서만 갱신돼, 결과가 뜨는 첫 렌더에는 아직 null 이라
    // 'submittedChoice !== null' 게이트가 해설을 걸렀다. 선택지 번호를 result
    // 객체에 함께 실어(submittedChoiceIndex) 한 번의 setResult 로 원자화한다.
    t('TrainClient: 제출 선택지는 result 객체 안에 원자적으로 실린다',
      /submittedChoiceIndex: choiceIndex/.test(tcSrc) &&
        /chosenIndex=\{result\.submittedChoiceIndex\}/.test(tcSrc))
    t('TrainClient: 해설 게이트가 result.submittedChoiceIndex 로 열린다 (별도 상태 아님)',
      /result\.submittedChoiceIndex != null \?/.test(tcSrc) &&
        !/setSubmittedChoice/.test(tcSrc))
    t('TrainClient: 오답(fail)에도 해설을 낸다 — 게이트에 pass 조건이 없다',
      // choice 분기 안의 ChoiceExplain 게이트: reference 유무 + 선택지만 본다.
      /result\.reference\?\.length && result\.submittedChoiceIndex != null \? \(\s*<ChoiceExplain/.test(
        tcSrc.replace(/\s+/g, ' ')
      ))
    t('TrainClient: 가/나 SelfCheck 경로가 살아 있다',
      /<SelfCheck reference=\{result\.reference\} selfChecks=\{selfChecks\} \/>/.test(tcSrc))
  }
}

// ── 도입 2 start_write(첫 문장 쓰기): 5문항 + 모범답안 대조 (세션 29) ──────
//
// convert 유형 · requireAny 첫 사용. passage 는 도입 1 의 '추상 분위기' 오답을
// 글자까지 이어받는다 — 학습자는 그 문장을 주인공이 보고 만지는 것으로 다시
// 쓴다. 원문 그대로 제출은 forbidWords(분위기어) + requireAny(주인공 이름)로
// 두 겹 막힌다.
console.log('\n[도입 2 start_write: 5문항 + 모범답안 대조]')
{
  interface SwProblem {
    source_key: string
    skill_key: string
    type: string
    choices: string[] | null
    passage: string | null
    instruction: string
    order_no: number
    difficulty: number
    scoring_mode: string
    scoring_config: ScoringConfig
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const allProblems = readDump<SwProblem[]>('problems.json')
  const sw = allProblems.filter((d) => d.skill_key === 'start_write')
  const swKeys = new Set(sw.map((d) => d.source_key))
  const answersDump = readDump<{
    reference?: RefRow[]
    answers?: { source_key: string; answer: { kind: string; index?: number } }[]
  }>('answers.json')
  const refs = (answersDump.reference ?? []).filter((r) => swKeys.has(r.source_key))
  const cfgOf = new Map(sw.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(sw.map((d) => [d.source_key, d.passage ?? '']))

  t('덤프에 start_write 5문항', sw.length === 5, `실제=${sw.length}`)
  t('전부 convert · auto · choices null · difficulty 1', sw.every(
    (d) => d.type === 'convert' && d.scoring_mode === 'auto' && d.choices === null && d.difficulty === 1))
  t('order_no 1~5 각 1회',
    JSON.stringify([...sw.map((d) => d.order_no)].sort()) === '[1,2,3,4,5]',
    JSON.stringify(sw.map((d) => d.order_no)))
  // 세션 29 후기: '기류'·'오라' 미검출 → forbidWords 5 확장 + forbidLemmas 신설.
  const FW_COMMON = ['기운', '느낌', '분위기', '기류', '아우라', '기색', '낌새', '기미']
  const DISP_EXPAND = ['기류', '오라', '아우라', '기색', '낌새', '기미']
  for (const d of sw) {
    const c = d.scoring_config
    const fw = (c.forbidWords ?? []) as string[]
    const disp = (c.forbidDisplay ?? []) as string[]
    const lem = (c.forbidLemmas ?? []) as string[]
    t(`'${d.source_key}': scoring_config (maxChars 60 · minVerbs 1 · requireAny · forbidLabel)`,
      c.maxChars === 60 && c.minVerbs === 1 &&
        Array.isArray(c.requireAny) && (c.requireAny as string[]).length >= 1 &&
        c.forbidLabel === '분위기를 직접 말하는 표현',
      JSON.stringify(c))
    t(`'${d.source_key}': forbidWords ⊇ 공통 8 (기운·느낌·분위기·기류·아우라·기색·낌새·기미)`,
      FW_COMMON.every((w) => fw.includes(w)), JSON.stringify(fw))
    t(`'${d.source_key}': forbidLemmas == ['오라/NNG']`,
      JSON.stringify(lem) === JSON.stringify(['오라/NNG']), JSON.stringify(lem))
    t(`'${d.source_key}': forbidDisplay 가 확장 6 (기류·오라·아우라·기색·낌새·기미) 포함`,
      DISP_EXPAND.every((w) => disp.includes(w)), JSON.stringify(disp))
  }

  // ── 지시문 규격 (세션 29 후기: 첫 문장이 제목으로 떼여 '위 문장'이 오독됨) ──
  for (const d of sw) {
    const req0 = ((d.scoring_config.requireAny ?? []) as string[])[0]
    t(`'${d.source_key}': 지시문이 "…의 1화 첫 문장을 쓰시오." 로 시작`,
      d.instruction.startsWith(`${req0}의 1화 첫 문장을 쓰시오.`), d.instruction.slice(0, 30))
    t(`'${d.source_key}': 지시문에 '잘못된 첫 문장' 포함`,
      d.instruction.includes('잘못된 첫 문장'))
    t(`'${d.source_key}': 지시문에 '위 문장' 미포함 (제목 오독 원인 제거)`,
      !d.instruction.includes('위 문장'))
  }

  // ── passage 이어받기: 도입 1(start_choose) 의 추상 분위기 오답을 글자까지 ──
  const CARRY: Record<string, [string, number]> = {
    'sw-hunter-dawn': ['sc-hunter-status', 3],
    'sw-ruin-ash': ['sc-sword-ruin', 3],
    'sw-vow-afternoon': ['sc-broken-vow', 3],
    'sw-scaffold-morning': ['sc-villainess-chains', 2],
    'sw-boss-wake': ['sc-boss-mirror', 3],
  }
  t('CARRY 가 5문항을 덮는다', Object.keys(CARRY).length === sw.length)
  const scOf = (k: string) => allProblems.find((p) => p.source_key === k)!
  for (const d of sw) {
    const [scKey, idx] = CARRY[d.source_key]
    const scChoice = scOf(scKey).choices![idx]
    t(`'${d.source_key}': passage 가 ${scKey}.choices[${idx}] 와 글자까지 같다`,
      d.passage === scChoice, `passage=${JSON.stringify(d.passage)} sc=${JSON.stringify(scChoice)}`)
  }

  // ── 불변식: passage 그대로 제출은 forbidWords + requireAny 두 겹으로 막힌다 ──
  for (const d of sw) {
    const res = combine(
      { id: d.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: d.scoring_config },
      { text: d.passage ?? '' }, undefined, null)
    const fwCheck = res.checks.find((c) => c.key === 'forbidWords')
    const rqCheck = res.checks.find((c) => c.key === 'requireAny')
    t(`불변식: '${d.source_key}' 원문 그대로는 forbidWords fail 그리고 requireAny fail`,
      fwCheck?.status === 'fail' && rqCheck?.status === 'fail',
      JSON.stringify({ fw: fwCheck?.status, rq: rqCheck?.status }))
  }

  // ── 모범답안 10행 ──
  t('모범답안 10행', refs.length === 10, `실제=${refs.length}`)
  t('모범답안 전부 blank_key 빈 문자열', refs.every((r) => r.blank_key === ''))
  for (const d of sw) {
    const ords = refs.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }
  // 실측 자수 (공백만 제외 · 구두점 포함)
  const LEN: Record<string, [number, number]> = {
    'sw-hunter-dawn': [41, 37],
    'sw-ruin-ash': [37, 28],
    'sw-vow-afternoon': [34, 37],
    'sw-scaffold-morning': [32, 25],
    'sw-boss-wake': [37, 36],
  }
  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const n = countChars(r.content)
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} == 실측 ${LEN[r.source_key][r.ord - 1]}`,
      n === LEN[r.source_key][r.ord - 1], `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ 60`, n <= 60)
    t(`'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`,
      r.content.trim() !== passageOf.get(r.source_key)!.trim())
    // forbidWords 적중 0
    const hits = findForbidden(r.content, (cfg.forbidWords as string[] | undefined) ?? [])
    t(`'${r.source_key}' ord${r.ord}: forbidWords 적중 0`, hits.length === 0, JSON.stringify(hits))
    // requireAny 중 하나를 문자열로 포함
    const req = (cfg.requireAny as string[] | undefined) ?? []
    t(`'${r.source_key}' ord${r.ord}: requireAny 중 하나를 포함`,
      req.some((w) => r.content.includes(w)), JSON.stringify(req))
    // combine 으로도 pass (형태소 없이 되는 검사만 — minVerbs 는 pending)
    const res = combine(
      { id: r.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: cfg },
      { text: r.content }, undefined, null)
    for (const key of ['forbidWords', 'requireAny', 'maxChars']) {
      const c = res.checks.find((x) => x.key === key)
      t(`'${r.source_key}' ord${r.ord}: combine 의 ${key} 검사가 pass`,
        !c || c.status === 'pass', JSON.stringify(c))
    }
  }

  // ── 단계 간 베낌 방어 (박 님 지시) ──
  // 각 모범답안이 그 문항이 이어받은 sc- 문항의 '정답 선택지 문장'(끝 마침표
  // 뗀 것)을 부분 문자열로 포함하지 않는다 — 도입 1 정답을 그대로 옮겨 적은
  // 답과 모범답안이 구분되게 유지한다.
  const scAnsIdx = new Map(
    (answersDump.answers ?? [])
      .filter((a) => a.answer.kind === 'choice')
      .map((a) => [a.source_key, a.answer.index!])
  )
  for (const d of sw) {
    const [scKey] = CARRY[d.source_key]
    const correctIdx = scAnsIdx.get(scKey)!
    const correctSentence = scOf(scKey).choices![correctIdx].replace(/\.$/, '')
    for (const r of refs.filter((x) => x.source_key === d.source_key)) {
      t(`단계 간 베낌 방어: '${r.source_key}' ord${r.ord} 이 ${scKey} 정답 문장을 안 베꼈다`,
        !r.content.includes(correctSentence),
        `correct="${correctSentence}"`)
    }
  }

  // ── 형태소(서버 있을 때만): 모범답안 동사 ≥ 1 (실측 4·3·4·3·4·3·3·2·3·2) ──
  pushRefMorphCheck('도입 2', refs, 'convert', cfgOf)

  // ── 물기(형태소 서버 있을 때만): 확장 금지어가 실제로 걸리고 '오라' 충돌은 안 남 ──
  {
    const c0 = cfgOf.get('sw-ruin-ash')!
    const trap = '진운은 창밖으로 멋진 기류가 흐르는 것을 보았다.' //  기류(forbidWords)
    const aura = '진운은 반짝이는 오라를 손끝으로 만졌다.' //           오라/NNG(forbidLemmas)
    const clash1 = '진운은 문을 열고 돌아오라는 외침을 들었다.' //      돌아오/VV — 안 걸림
    const clash2 = '진운은 이리 오라는 손짓을 보았다.' //              오/VV — 안 걸림
    aiChainChecks.push((async () => {
      const m = await morphAnalyze(trap)
      if (!m) { morphSkipped += 4; console.log('  – 형태소 서버 없음: 도입 2 확장 금지어 물기 건너뜀'); return }
      const run = async (text: string) => {
        const morph = text === trap ? m : await morphAnalyze(text)
        return combine(
          { id: 'sw-ruin-ash', type: 'convert', scoring_mode: 'auto', scoring_config: c0 },
          { text }, undefined, morph)
      }
      const rt = await run(trap)
      t("물기: '…멋진 기류가 흐르는…' 은 forbidWords 로 fail",
        rt.checks.find((c) => c.key === 'forbidWords')?.status === 'fail',
        JSON.stringify(rt.checks.find((c) => c.key === 'forbidWords')))
      const ra = await run(aura)
      t("물기: '반짝이는 오라를…' 은 forbidLemmas(오라/NNG)로 fail",
        ra.checks.find((c) => c.key === 'forbidLemmas')?.status === 'fail',
        JSON.stringify(ra.checks.find((c) => c.key === 'forbidLemmas')))
      for (const [txt, name] of [[clash1, '돌아오라는'], [clash2, '이리 오라는']] as const) {
        const r = await run(txt)
        const fl = r.checks.find((c) => c.key === 'forbidLemmas')
        t(`물기: '${name}' 명령형은 forbidLemmas 에 안 걸린다 (오라 충돌 없음)`,
          fl?.status !== 'fail', JSON.stringify(fl))
      }
    })())
  }

  // ── update-start-write.sql ↔ 덤프 (instruction · scoring_config jsonb 통째) ──
  // 세션 27 v2 선례. 기존 행이라 이 update 파일이 DB 반영을 담당한다.
  {
    const updSql = readFileSync(
      path.join(__dirname, '..', '..', 'seed', 'update-start-write.sql'), 'utf8')
    const canon = (o: unknown): unknown =>
      Array.isArray(o)
        ? o.map(canon)
        : o && typeof o === 'object'
          ? Object.fromEntries(Object.keys(o as object).sort().map((k) => [k, canon((o as Record<string, unknown>)[k])]))
          : o
    const cj = (o: unknown) => JSON.stringify(canon(o))
    const rows = [...updSql.matchAll(
      /update problems set\n\s*instruction = '((?:[^']|'')*)',\n\s*scoring_config = '(.+?)'::jsonb\n\s*where source_key = '([^']*)';/g
    )].map((m) => ({
      instruction: m[1].replace(/''/g, "'"),
      cfg: JSON.parse(m[2]) as Record<string, unknown>,
      source_key: m[3],
    }))
    t('update-start-write.sql 에 5행', rows.length === 5, `실제=${rows.length}`)
    for (const d of sw) {
      const row = rows.find((r) => r.source_key === d.source_key)
      t(`update SQL '${d.source_key}' 의 instruction·scoring_config 가 덤프와 같다`,
        !!row && row.instruction === d.instruction && cj(row.cfg) === cj(d.scoring_config),
        `SQL=${JSON.stringify(row)}`)
    }
  }

  // ── 없는 컬럼 가드 (세션 29 후기 2: 박 님이 Supabase 에서 42703) ──
  // 덤프의 order_no 는 gen-seed 시드 순서용 덤프 전용 필드다 — problems 테이블에
  // order_no 컬럼은 없다. update SQL 꼬리의 확인용 select 가 'p.order_no' 로
  // 정렬하려다 실패했다(update·commit 뒤라 데이터는 반영됨). verify 는 SQL 을
  // 실행하지 않아 로컬에서 못 잡던 종류라, 텍스트로 막는다. 문항 정렬은
  // difficulty·source_key (app/train/[stageId]/page.tsx).
  {
    const seedSqlDir = path.join(__dirname, '..', '..', 'seed')
    const bad: string[] = []
    for (const f of readdirSync(seedSqlDir).filter((n) => n.endsWith('.sql'))) {
      const src = readFileSync(path.join(seedSqlDir, f), 'utf8')
      // 주석 줄은 뺀다 — 이 가드 자신의 설명이 걸리지 않게.
      const code = src.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n')
      if (/\bp\.order_no\b/.test(code)) bad.push(f)
    }
    t("seed/*.sql 에 'p.order_no' 참조가 없다 (problems 에 order_no 컬럼 없음)",
      bad.length === 0, JSON.stringify(bad))
  }

  // ── stages: start_write 코치·자기점검 (세션 29 후기 문구) ──
  const stagesDump = readDump<{ skill_key: string; coach_intro: string; coach_line: string; self_checks: string[] }[]>('stages.json')
  const swStage = stagesDump.find((s) => s.skill_key === 'start_write')!
  t('stages start_write 의 coach_intro·coach_line 이 비어 있지 않다',
    swStage.coach_intro.length > 0 && swStage.coach_line.length > 0)
  t("stages start_write coach_intro 에 '이번엔 직접 써 보자!' (세션 29 후기)",
    swStage.coach_intro.includes('이번엔 직접 써 보자!') &&
      !swStage.coach_intro.includes('이번엔 네가 직접 써.'))
  t('stages start_write 의 self_checks 1건',
    Array.isArray(swStage.self_checks) && swStage.self_checks.length === 1 &&
      swStage.self_checks[0].length > 0, JSON.stringify(swStage.self_checks))

  // ── 화면 배선: start_write 원문 상자 라벨 (세션 29 후기) ──
  const root = path.join(__dirname, '..', '..')
  const tcSrc = readFileSync(path.join(root, 'components', 'train', 'TrainClient.tsx'), 'utf8')
  t("TrainClient: start_write 면 passageLabel 이 '잘못된 첫 문장'",
    /problem\.skill_key === 'start_write'\s*\n?\s*\?\s*'잘못된 첫 문장'/.test(tcSrc))
  const pageSrc = readFileSync(
    path.join(root, 'app', 'train', '[stageId]', '[sourceKey]', 'page.tsx'), 'utf8')
  t('page.tsx: stages 에서 skill_key 를 읽어 TrainClient 에 넘긴다',
    /select\('id, track, order_no, skill_key/.test(pageSrc) && /skill_key: skillKey/.test(pageSrc))
}

// ── 도입 3 start_extend(도입 잇기): 5문항 + 모범답안 대조 (세션 30) ────────
//
// continue 유형 첫 사용 — 코드 변경 0줄(서술형 경로에 이미 배선). 이 단계의
// 축은 금지가 아니라 요구다: requireAny(주인공 이름) + minVerbs(움직임). 지문은
// 도입 1 의 '거시 서술' 오답(3건) + 신작(2건). 학습자는 세상 설명 뒤에 주인공을
// 무대에 올린다.
console.log('\n[도입 3 start_extend: 5문항 + 모범답안 대조]')
{
  interface SeProblem {
    source_key: string
    skill_key: string
    type: string
    choices: string[] | null
    passage: string | null
    instruction: string
    order_no: number
    difficulty: number
    scoring_mode: string
    scoring_config: ScoringConfig
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const allProblems = readDump<SeProblem[]>('problems.json')
  const se = allProblems.filter((d) => d.skill_key === 'start_extend')
  const seKeys = new Set(se.map((d) => d.source_key))
  const answersDump = readDump<{
    reference?: RefRow[]
    answers?: { source_key: string; answer: { kind: string; index?: number } }[]
  }>('answers.json')
  const refs = (answersDump.reference ?? []).filter((r) => seKeys.has(r.source_key))
  const cfgOf = new Map(se.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(se.map((d) => [d.source_key, d.passage ?? '']))

  t('덤프에 start_extend 5문항', se.length === 5, `실제=${se.length}`)
  t('전부 continue · auto · choices null · difficulty 1', se.every(
    (d) => d.type === 'continue' && d.scoring_mode === 'auto' && d.choices === null && d.difficulty === 1))
  t('order_no 1~5 각 1회',
    JSON.stringify([...se.map((d) => d.order_no)].sort()) === '[1,2,3,4,5]',
    JSON.stringify(se.map((d) => d.order_no)))
  for (const d of se) {
    const c = d.scoring_config
    t(`'${d.source_key}': scoring_config (maxChars 60 · minVerbs 1 · requireAny · forbid 없음)`,
      c.maxChars === 60 && c.minVerbs === 1 &&
        Array.isArray(c.requireAny) && (c.requireAny as string[]).length >= 1 &&
        c.forbidWords === undefined && c.forbidLemmas === undefined && c.forbidLabel === undefined,
      JSON.stringify(c))
    t(`'${d.source_key}': 지시문이 '나오게 이어 쓰시오.' 로 시작`,
      d.instruction.includes('나오게 이어 쓰시오.'), d.instruction.slice(0, 24))
  }

  // ── 지문 이어받기: 도입 1(start_choose) 의 거시 서술 오답을 글자까지 (3건) ──
  const CARRY: Record<string, [string, number]> = {
    'se-hunter-gate': ['sc-hunter-status', 0],
    'se-sword-five': ['sc-sword-ruin', 0],
    'se-vow-deal': ['sc-broken-vow', 1],
  }
  const scOf = (k: string) => allProblems.find((p) => p.source_key === k)!
  for (const [seKey, [scKey, idx]] of Object.entries(CARRY)) {
    const d = se.find((x) => x.source_key === seKey)!
    t(`'${seKey}': passage 가 ${scKey}.choices[${idx}] 와 글자까지 같다`,
      d.passage === scOf(scKey).choices![idx],
      `passage=${JSON.stringify(d.passage)}`)
  }
  // ── 새 지문 2건은 sc- 어느 choices 에도 없다(신작) ──
  const allScChoices = new Set(
    allProblems.filter((p) => p.skill_key === 'start_choose').flatMap((p) => p.choices ?? []))
  for (const key of ['se-rose-heir', 'se-phoenix-mound']) {
    const d = se.find((x) => x.source_key === key)!
    t(`'${key}': 새 지문 — sc- 어느 choices 에도 없다`, !allScChoices.has(d.passage ?? ''), d.passage ?? '')
  }

  // ── 불변식: 지문 5건은 requireAny 이름을 포함하지 않는다 ──
  // (이름 없는 이어쓰기가 requireAny 로 막히는 구조의 전제)
  for (const d of se) {
    const req = (d.scoring_config.requireAny as string[]) ?? []
    t(`불변식: '${d.source_key}' 지문에 주인공 이름이 없다`,
      !req.some((w) => (d.passage ?? '').includes(w)), `${d.passage} / ${JSON.stringify(req)}`)
    // 지문 그대로 이어쓰면 requireAny fail
    const res = combine(
      { id: d.source_key, type: 'continue', scoring_mode: 'auto', scoring_config: d.scoring_config },
      { text: d.passage ?? '' }, undefined, null)
    t(`불변식: '${d.source_key}' 지문 그대로 제출은 requireAny fail`,
      res.checks.find((c) => c.key === 'requireAny')?.status === 'fail')
  }

  // ── 모범답안 10행 ──
  t('모범답안 10행', refs.length === 10, `실제=${refs.length}`)
  t('모범답안 전부 blank_key 빈 문자열', refs.every((r) => r.blank_key === ''))
  for (const d of se) {
    const ords = refs.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }
  const LEN: Record<string, [number, number]> = {
    'se-hunter-gate': [42, 40],
    'se-sword-five': [39, 31],
    'se-vow-deal': [35, 34],
    'se-rose-heir': [43, 35],
    'se-phoenix-mound': [40, 40],
  }
  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const n = countChars(r.content)
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} == 실측 ${LEN[r.source_key][r.ord - 1]}`,
      n === LEN[r.source_key][r.ord - 1], `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ 60`, n <= 60)
    t(`'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`,
      r.content.trim() !== passageOf.get(r.source_key)!.trim())
    const req = (cfg.requireAny as string[] | undefined) ?? []
    t(`'${r.source_key}' ord${r.ord}: requireAny 중 하나를 포함`,
      req.some((w) => r.content.includes(w)), JSON.stringify(req))
    const res = combine(
      { id: r.source_key, type: 'continue', scoring_mode: 'auto', scoring_config: cfg },
      { text: r.content }, undefined, null)
    for (const key of ['requireAny', 'maxChars']) {
      const c = res.checks.find((x) => x.key === key)
      t(`'${r.source_key}' ord${r.ord}: combine 의 ${key} 검사가 pass`,
        !c || c.status === 'pass', JSON.stringify(c))
    }
  }

  // ── 단계 간 베낌 가드 (도입 3 확장): 도입 1 정답 5문장 + 도입 2 모범 10문장 ──
  // 각 se- 모범답안이 앞 단계의 어느 문장(끝 마침표 뗀 것)도 부분 문자열로
  // 포함하지 않는다. 대조원은 덤프에서 유도한다.
  const priorSentences: string[] = []
  {
    const scAnsIdx = new Map(
      (answersDump.answers ?? []).filter((a) => a.answer.kind === 'choice')
        .map((a) => [a.source_key, a.answer.index!]))
    for (const p of allProblems.filter((x) => x.skill_key === 'start_choose')) {
      const idx = scAnsIdx.get(p.source_key)
      if (idx != null && p.choices) priorSentences.push(p.choices[idx].replace(/\.$/, ''))
    }
    for (const r of answersDump.reference ?? []) {
      if (r.source_key.startsWith('sw-')) priorSentences.push(r.content.replace(/\.$/, ''))
    }
  }
  t('단계 간 베낌 가드: 대조원이 15문장 (도입 1 정답 5 + 도입 2 모범 10)',
    priorSentences.length === 15, `실제=${priorSentences.length}`)
  for (const r of refs) {
    const copied = priorSentences.filter((s) => r.content.includes(s))
    t(`단계 간 베낌 가드: '${r.source_key}' ord${r.ord} 이 앞 단계 문장을 안 베꼈다`,
      copied.length === 0, JSON.stringify(copied))
  }

  // ── 형태소(서버 있을 때만): 모범답안 동사 ≥ 1 (실측 가 4·2·2·4·2 / 나 1·3·2·3·3) ──
  pushRefMorphCheck('도입 3', refs, 'continue', cfgOf)

  // ── stages: start_extend 코치·자기점검 ──
  const stagesDump = readDump<{ skill_key: string; coach_intro: string; coach_line: string; self_checks: string[] }[]>('stages.json')
  const seStage = stagesDump.find((s) => s.skill_key === 'start_extend')!
  t('stages start_extend 의 coach_intro·coach_line 이 비어 있지 않다',
    seStage.coach_intro.length > 0 && seStage.coach_line.length > 0)
  t('stages start_extend 의 self_checks 1건',
    Array.isArray(seStage.self_checks) && seStage.self_checks.length === 1 &&
      seStage.self_checks[0].length > 0, JSON.stringify(seStage.self_checks))
}

// ── 구성 11 lack(결핍 부여): 5문항 + 모범답안 대조 (세션 31) ──────────────
//
// convert 유형 · 구성 트랙 첫 신설. 2단계(emotion_action)의 캐릭터 버전 —
// 순간 감정이 아니라 지속 상태(결핍)를 버릇으로 새어 나오게 한다. 원문은
// 이름 없이 직함·상황만 담은 무난한 장면이라, 원문 그대로 제출은 결함이
// 없어 requireAny(이름)가 막는다. 근거: 문항설계서 5-05 · 02 CH-04 · 정리본 20-4.
console.log('\n[구성 11 lack: 5문항 + 모범답안 대조]')
{
  interface LkProblem {
    source_key: string
    skill_key: string
    type: string
    choices: string[] | null
    passage: string | null
    instruction: string
    order_no: number
    difficulty: number
    scoring_mode: string
    scoring_config: ScoringConfig
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const allProblems = readDump<LkProblem[]>('problems.json')
  const lk = allProblems.filter((d) => d.skill_key === 'lack')
  const lkKeys = new Set(lk.map((d) => d.source_key))
  const answersDump = readDump<{
    reference?: RefRow[]
    answers?: { source_key: string; answer: { kind: string; index?: number } }[]
  }>('answers.json')
  const refs = (answersDump.reference ?? []).filter((r) => lkKeys.has(r.source_key))
  const cfgOf = new Map(lk.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(lk.map((d) => [d.source_key, d.passage ?? '']))

  t('덤프에 lack 5문항', lk.length === 5, `실제=${lk.length}`)
  t('전부 convert · auto · choices null · difficulty 1', lk.every(
    (d) => d.type === 'convert' && d.scoring_mode === 'auto' && d.choices === null && d.difficulty === 1))
  t('order_no 1~5 각 1회',
    JSON.stringify([...lk.map((d) => d.order_no)].sort()) === '[1,2,3,4,5]',
    JSON.stringify(lk.map((d) => d.order_no)))
  const labels = new Set<string>()
  for (const d of lk) {
    const c = d.scoring_config
    t(`'${d.source_key}': scoring_config (maxChars 60 · minVerbs 2 · requireAny ≥1 · forbidWords ≥2 · forbidDisplay ≥2)`,
      c.maxChars === 60 && c.minVerbs === 2 &&
        Array.isArray(c.requireAny) && (c.requireAny as string[]).length >= 1 &&
        Array.isArray(c.forbidWords) && (c.forbidWords as string[]).length >= 2 &&
        typeof c.forbidLabel === 'string' && (c.forbidLabel as string).length > 0 &&
        Array.isArray(c.forbidDisplay) && (c.forbidDisplay as string[]).length >= 2,
      JSON.stringify(c))
    labels.add(c.forbidLabel as string)
  }
  t('forbidLabel 이 문항별로 다르다 (동일 문구 아님)', labels.size === lk.length, JSON.stringify([...labels]))

  // ── 원문 불변식: 이름 없음 · forbidWords 미적중 · 원문 그대로 → requireAny fail ──
  for (const d of lk) {
    const c = d.scoring_config
    const req = (c.requireAny as string[]) ?? []
    const fw = (c.forbidWords as string[]) ?? []
    t(`불변식: '${d.source_key}' 원문에 주인공 이름이 없다`,
      !req.some((w) => (d.passage ?? '').includes(w)), d.passage ?? '')
    t(`불변식: '${d.source_key}' 원문에 forbidWords 가 없다 (무난 장면)`,
      findForbidden(d.passage ?? '', fw).length === 0, d.passage ?? '')
    const res = combine(
      { id: d.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: c },
      { text: d.passage ?? '' }, undefined, null)
    t(`불변식: '${d.source_key}' 원문 그대로 제출은 requireAny fail`,
      res.checks.find((x) => x.key === 'requireAny')?.status === 'fail')
  }

  // ── 새 지문 5건은 sc- 어느 choices 에도 없다(신작) ──
  const allScChoices = new Set(
    allProblems.filter((p) => p.skill_key === 'start_choose').flatMap((p) => p.choices ?? []))
  for (const d of lk) {
    t(`'${d.source_key}': 새 지문 — sc- 어느 choices 에도 없다`,
      !allScChoices.has(d.passage ?? ''), d.passage ?? '')
  }

  // ── 모범답안 10행 ──
  t('모범답안 10행', refs.length === 10, `실제=${refs.length}`)
  t('모범답안 전부 blank_key 빈 문자열', refs.every((r) => r.blank_key === ''))
  for (const d of lk) {
    const ords = refs.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }
  // 세션 31 후기: 박 님 실사용 답안으로 4행 교체 (desk 가 · cafe 가·나 · board 나).
  const LEN: Record<string, [number, number]> = {
    'lk-desk-nine': [47, 43],
    'lk-cafe-wait': [48, 56],
    'lk-guard-dawn': [37, 36],
    'lk-board-rank': [39, 46],
    'lk-tower-shelf': [36, 39],
  }
  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const n = countChars(r.content)
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} == 실측 ${LEN[r.source_key][r.ord - 1]}`,
      n === LEN[r.source_key][r.ord - 1], `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ 60`, n <= 60)
    t(`'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`,
      r.content.trim() !== passageOf.get(r.source_key)!.trim())
    const hits = findForbidden(r.content, (cfg.forbidWords as string[] | undefined) ?? [])
    t(`'${r.source_key}' ord${r.ord}: forbidWords 적중 0`, hits.length === 0, JSON.stringify(hits))
    const req = (cfg.requireAny as string[] | undefined) ?? []
    t(`'${r.source_key}' ord${r.ord}: requireAny 중 하나를 포함`,
      req.some((w) => r.content.includes(w)), JSON.stringify(req))
    const res = combine(
      { id: r.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: cfg },
      { text: r.content }, undefined, null)
    for (const key of ['forbidWords', 'requireAny', 'maxChars']) {
      const c = res.checks.find((x) => x.key === key)
      t(`'${r.source_key}' ord${r.ord}: combine 의 ${key} 검사가 pass`,
        !c || c.status === 'pass', JSON.stringify(c))
    }
  }

  // ── 단계 간 베낌 가드: 도입 1 정답 5 + 도입 2 모범 10 + 도입 3 모범 10 = 25문장 ──
  const priorSentences: string[] = []
  {
    const scAnsIdx = new Map(
      (answersDump.answers ?? []).filter((a) => a.answer.kind === 'choice')
        .map((a) => [a.source_key, a.answer.index!]))
    for (const p of allProblems.filter((x) => x.skill_key === 'start_choose')) {
      const idx = scAnsIdx.get(p.source_key)
      if (idx != null && p.choices) priorSentences.push(p.choices[idx].replace(/\.$/, ''))
    }
    for (const r of answersDump.reference ?? []) {
      if (r.source_key.startsWith('sw-') || r.source_key.startsWith('se-')) {
        priorSentences.push(r.content.replace(/\.$/, ''))
      }
    }
  }
  t('단계 간 베낌 가드: 대조원이 25문장 (도입 1 정답 5 + 도입 2 모범 10 + 도입 3 모범 10)',
    priorSentences.length === 25, `실제=${priorSentences.length}`)
  for (const r of refs) {
    const copied = priorSentences.filter((s) => r.content.includes(s))
    t(`단계 간 베낌 가드: '${r.source_key}' ord${r.ord} 이 앞 단계 문장을 안 베꼈다`,
      copied.length === 0, JSON.stringify(copied))
  }

  // ── 형태소(서버 있을 때만): 모범답안 동사 ≥ 2 ──
  // 실측(세션 31 후기): 가 6·4·5·2·2 / 나 5·6·5·3·3
  pushRefMorphCheck('구성 11', refs, 'convert', cfgOf)

  // ── update-lack-refs.sql ↔ 덤프 (content 글자까지) — 세션 31 후기 4행 교체 ──
  // 기존 행이라 이 update 파일이 DB 반영을 담당한다(reference insert 는 on
  // conflict do nothing). 나머지 6행은 불변.
  {
    const updSql = readFileSync(
      path.join(__dirname, '..', '..', 'seed', 'update-lack-refs.sql'), 'utf8')
    const rows = [...updSql.matchAll(
      /update reference_answers set content =\n\s*'((?:[^']|'')*)'\n\s*where problem_id = \(select id from problems where source_key = '([^']*)'\)\n\s*and ord = (\d+) and blank_key = '';/g
    )].map((m) => ({
      content: m[1].replace(/''/g, "'"),
      source_key: m[2],
      ord: Number(m[3]),
    }))
    const CHANGED: [string, number][] = [
      ['lk-desk-nine', 1], ['lk-cafe-wait', 1], ['lk-cafe-wait', 2], ['lk-board-rank', 2],
    ]
    t('update-lack-refs.sql 에 4행', rows.length === 4, `실제=${rows.length}`)
    for (const [sk, ord] of CHANGED) {
      const row = rows.find((r) => r.source_key === sk && r.ord === ord)
      const ref = refs.find((r) => r.source_key === sk && r.ord === ord)
      t(`update SQL '${sk}' ord${ord} 의 content 가 덤프와 글자까지 같다`,
        !!row && !!ref && row.content === ref.content,
        `SQL=${JSON.stringify(row?.content)}`)
    }
  }

  // ── stages: lack 코치·자기점검 (구성 트랙 첫 코치) ──
  const stagesDump = readDump<{ skill_key: string; coach_intro: string; coach_line: string; self_checks: string[] }[]>('stages.json')
  const lkStage = stagesDump.find((s) => s.skill_key === 'lack')!
  t('stages lack 의 coach_intro·coach_line 이 비어 있지 않다',
    lkStage.coach_intro.length > 0 && lkStage.coach_line.length > 0)
  t('stages lack 의 self_checks 1건',
    Array.isArray(lkStage.self_checks) && lkStage.self_checks.length === 1 &&
      lkStage.self_checks[0].length > 0, JSON.stringify(lkStage.self_checks))
}

// ── 구성 12 contrast_char(입체 캐릭터): 재설계 · 활성 6 + 비활성 4 (세션 32 후기) ─
//
// 박 님 판정: 옛 대비형은 인물이 한 줄 라벨이라 "결과만 있고 배움이 없다".
// 겉과 속의 갭이 이 단계의 기술이다. 인물 원장(docs/characters.md)을 만들고
// 문항을 갈았다.
//   활성: cc-first-pay(페어 대비 · requireAll 유지) + 신규 5
//         — 갭 4(cc-praise-callout·cc-ace-siren·cc-night-shift·cc-junk-dealer,
//           forbidLabel '속마음을 직접 말하는 표현' · requireAny 1명 · difficulty 1)
//         + 군중 1(cc-flash-crowd, forbid 없음 · requireAny · difficulty 2)
//   비활성: cc-report-credit · cc-street-night · cc-raid-reward · cc-relic-box
//           (deactivate.json · 제출 이력 보존)
console.log('\n[구성 12 contrast_char: 재설계 · 활성 6 + 비활성 4]')
{
  interface CcProblem {
    source_key: string
    skill_key: string
    type: string
    choices: string[] | null
    passage: string | null
    instruction: string
    order_no: number
    difficulty: number
    scoring_mode: string
    scoring_config: ScoringConfig
  }
  const seedDir = path.join(__dirname, '..', '..', 'seed', 'dump')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(seedDir, f), 'utf8').replace(/^﻿/, '')) as T

  const allProblems = readDump<CcProblem[]>('problems.json')
  const deactivate = readDump<{ source_keys: string[] }>('deactivate.json')
  const deadSet = new Set(deactivate.source_keys)
  const ccAll = allProblems.filter((d) => d.skill_key === 'contrast_char')
  const cc = ccAll.filter((d) => !deadSet.has(d.source_key)) // 활성만
  const inactive = ccAll.filter((d) => deadSet.has(d.source_key))
  const ccKeys = new Set(cc.map((d) => d.source_key))
  const answersDump = readDump<{
    reference?: RefRow[]
    answers?: { source_key: string; answer: { kind: string; index?: number } }[]
  }>('answers.json')
  const refs = (answersDump.reference ?? []).filter((r) => ccKeys.has(r.source_key))
  const cfgOf = new Map(cc.map((d) => [d.source_key, d.scoring_config]))
  const passageOf = new Map(cc.map((d) => [d.source_key, d.passage ?? '']))

  const GAP = ['cc-praise-callout', 'cc-ace-siren', 'cc-night-shift', 'cc-junk-dealer']
  const CROWD = 'cc-flash-crowd'

  // ── 비활성 4건 ──
  t('비활성 contrast_char 4건 (deactivate.json)',
    inactive.length === 4 &&
      JSON.stringify(inactive.map((d) => d.source_key).sort()) ===
        JSON.stringify(['cc-raid-reward', 'cc-relic-box', 'cc-report-credit', 'cc-street-night']),
    JSON.stringify(inactive.map((d) => d.source_key)))
  t('비활성 4건의 기존 모범답안 8행이 answers.json 에 남아 있다',
    ['cc-report-credit', 'cc-street-night', 'cc-raid-reward', 'cc-relic-box'].every((k) =>
      (answersDump.reference ?? []).filter((r) => r.source_key === k).length === 2))

  // ── 활성 6건 ──
  t('활성 contrast_char 6문항 (first-pay + 신규 5)', cc.length === 6, `실제=${cc.length}`)
  t('활성 전부 convert · auto · choices null', cc.every(
    (d) => d.type === 'convert' && d.scoring_mode === 'auto' && d.choices === null))
  t('활성 order_no: first-pay 3 · 신규 6~10',
    JSON.stringify([...cc.map((d) => d.order_no)].sort((a, b) => a - b)) === '[3,6,7,8,9,10]',
    JSON.stringify(cc.map((d) => `${d.source_key}:${d.order_no}`)))
  t('활성 전부 maxChars 60 · minVerbs 2',
    cc.every((d) => d.scoring_config.maxChars === 60 && d.scoring_config.minVerbs === 2))

  // cc-first-pay: requireAll 2 유지
  {
    const fp = cc.find((d) => d.source_key === 'cc-first-pay')!
    const c = fp.scoring_config
    t('cc-first-pay: requireAll 정확히 2 · difficulty 1 · forbid 없음',
      Array.isArray(c.requireAll) && (c.requireAll as string[]).length === 2 &&
        fp.difficulty === 1 && c.forbidWords === undefined && c.requireAny === undefined)
  }
  // 갭 4건: forbidLabel 동일 문구 · requireAny 1명 · difficulty 1
  for (const key of GAP) {
    const d = cc.find((x) => x.source_key === key)!
    const c = d.scoring_config
    t(`'${key}': forbidLabel '속마음을 직접 말하는 표현' · requireAny 1명 · forbidWords ≥2 · forbidDisplay ≥2 · difficulty 1 · requireAll 없음`,
      c.forbidLabel === '속마음을 직접 말하는 표현' &&
        Array.isArray(c.requireAny) && (c.requireAny as string[]).length >= 1 &&
        Array.isArray(c.forbidWords) && (c.forbidWords as string[]).length >= 2 &&
        Array.isArray(c.forbidDisplay) && (c.forbidDisplay as string[]).length >= 2 &&
        d.difficulty === 1 && c.requireAll === undefined,
      JSON.stringify(c))
  }
  // 군중 1건: difficulty 2 · forbid 없음 · requireAny
  {
    const d = cc.find((x) => x.source_key === CROWD)!
    const c = d.scoring_config
    t(`'${CROWD}': difficulty 2 · forbid 없음 · requireAny · forbidLabel 없음 · requireAll 없음`,
      d.difficulty === 2 && c.forbidWords === undefined && c.forbidLabel === undefined &&
        c.requireAll === undefined && Array.isArray(c.requireAny) && (c.requireAny as string[]).length >= 1,
      JSON.stringify(c))
  }

  // 갭 4 의 forbidLabel 이 한 문구로 동일한지 (문항별 상이인 lack 과 반대)
  t('갭 4건의 forbidLabel 이 전부 같은 문구',
    new Set(GAP.map((k) => cc.find((x) => x.source_key === k)!.scoring_config.forbidLabel)).size === 1)

  // ── 원문 불변식: 이름 미포함 · forbidWords 미적중 · 원문 그대로 → 요구 검사 fail ──
  for (const d of cc) {
    const c = d.scoring_config
    const names = ((c.requireAll ?? c.requireAny ?? []) as string[])
    const fw = (c.forbidWords as string[]) ?? []
    t(`불변식: '${d.source_key}' 원문에 주인공 이름이 없다`,
      names.every((n) => !(d.passage ?? '').includes(n)), d.passage ?? '')
    if (fw.length > 0) {
      t(`불변식: '${d.source_key}' 원문에 forbidWords 가 없다 (무난 장면)`,
        findForbidden(d.passage ?? '', fw).length === 0, d.passage ?? '')
    }
    const res = combine(
      { id: d.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: c },
      { text: d.passage ?? '' }, undefined, null)
    const reqKey = c.requireAll ? 'requireAll' : 'requireAny'
    t(`불변식: '${d.source_key}' 원문 그대로 제출은 ${reqKey} fail`,
      res.checks.find((x) => x.key === reqKey)?.status === 'fail')
  }

  // ── 새 지문은 sc- 어느 choices 에도 없다(신작) ──
  const allScChoices = new Set(
    allProblems.filter((p) => p.skill_key === 'start_choose').flatMap((p) => p.choices ?? []))
  for (const d of cc) {
    t(`'${d.source_key}': 지문이 sc- 어느 choices 에도 없다`,
      !allScChoices.has(d.passage ?? ''), d.passage ?? '')
  }

  // ── 모범답안 12행 (활성 6 × 가·나) ──
  t('활성 모범답안 12행', refs.length === 12, `실제=${refs.length}`)
  t('모범답안 전부 blank_key 빈 문자열', refs.every((r) => r.blank_key === ''))
  for (const d of cc) {
    const ords = refs.filter((r) => r.source_key === d.source_key).map((r) => r.ord).sort()
    t(`'${d.source_key}': 가·나 두 세트`, JSON.stringify(ords) === '[1,2]', JSON.stringify(ords))
  }
  // 실측 자수(공백만 제외) · first-pay 는 세션 32 그대로, 신규 5 는 세션 32 후기
  const LEN: Record<string, [number, number]> = {
    'cc-first-pay': [38, 36],
    'cc-praise-callout': [44, 41],
    'cc-ace-siren': [47, 44],
    'cc-night-shift': [42, 42],
    'cc-junk-dealer': [43, 46],
    'cc-flash-crowd': [43, 44],
  }
  for (const r of refs) {
    const cfg = cfgOf.get(r.source_key)!
    const n = countChars(r.content)
    const names = ((cfg.requireAll ?? cfg.requireAny ?? []) as string[])
    t(`'${r.source_key}' ord${r.ord}: 비어 있지 않다`, r.content.trim().length > 0)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} == 실측 ${LEN[r.source_key][r.ord - 1]}`,
      n === LEN[r.source_key][r.ord - 1], `"${r.content}"`)
    t(`'${r.source_key}' ord${r.ord}: 자수 ${n} ≤ 60`, n <= 60)
    t(`'${r.source_key}' ord${r.ord}: 지문을 그대로 베끼지 않았다`,
      r.content.trim() !== passageOf.get(r.source_key)!.trim())
    t(`'${r.source_key}' ord${r.ord}: 요구 이름을 포함`,
      cfg.requireAll
        ? names.every((nm) => r.content.includes(nm))
        : names.some((nm) => r.content.includes(nm)),
      JSON.stringify(names))
    const hits = findForbidden(r.content, (cfg.forbidWords as string[] | undefined) ?? [])
    t(`'${r.source_key}' ord${r.ord}: forbidWords 적중 0`, hits.length === 0, JSON.stringify(hits))
    const res = combine(
      { id: r.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: cfg },
      { text: r.content }, undefined, null)
    for (const key of ['requireAll', 'requireAny', 'forbidWords', 'maxChars']) {
      const c = res.checks.find((x) => x.key === key)
      t(`'${r.source_key}' ord${r.ord}: combine 의 ${key} 검사가 pass`,
        !c || c.status === 'pass', JSON.stringify(c))
    }
  }

  // ── 단계 간 베낌 가드: 도입 1 정답 5 + 도입 2·3 모범 20 + lack 모범 10 +
  //    비활성 cc- 모범 8 = 43문장. 비활성 문항 모범답안도 유지한다 —
  //    여전히 베끼면 안 되는 문장들이다.
  const priorSentences: string[] = []
  {
    const scAnsIdx = new Map(
      (answersDump.answers ?? []).filter((a) => a.answer.kind === 'choice')
        .map((a) => [a.source_key, a.answer.index!]))
    for (const p of allProblems.filter((x) => x.skill_key === 'start_choose')) {
      const idx = scAnsIdx.get(p.source_key)
      if (idx != null && p.choices) priorSentences.push(p.choices[idx].replace(/\.$/, ''))
    }
    const deadCc = new Set(['cc-report-credit', 'cc-street-night', 'cc-raid-reward', 'cc-relic-box'])
    for (const r of answersDump.reference ?? []) {
      if (r.source_key.startsWith('sw-') || r.source_key.startsWith('se-') ||
        r.source_key.startsWith('lk-') || deadCc.has(r.source_key)) {
        priorSentences.push(r.content.replace(/\.$/, ''))
      }
    }
  }
  t('단계 간 베낌 가드: 대조원 43문장 (도입 1 정답 5 + 도입 2·3 모범 20 + lack 모범 10 + 비활성 cc- 8)',
    priorSentences.length === 43, `실제=${priorSentences.length}`)
  for (const r of refs) {
    const copied = priorSentences.filter((s) => r.content.includes(s))
    t(`단계 간 베낌 가드: '${r.source_key}' ord${r.ord} 이 앞 단계·비활성 문장을 안 베꼈다`,
      copied.length === 0, JSON.stringify(copied))
  }

  // ── 형태소(서버 있을 때만): 모범답안 동사 ≥ 2 ──
  // 실측 신규 가 5·4·4·4·3 / 나 4·3·5·5·4 · first-pay 가 3 / 나 5
  pushRefMorphCheck('구성 12', refs, 'convert', cfgOf)

  // ── 요구 검사 물기 (형태소 불필요) ──
  {
    const fp = cc.find((x) => x.source_key === 'cc-first-pay')! // requireAll ['조평','유겸']
    const run = (text: string) => combine(
      { id: fp.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: fp.scoring_config },
      { text }, undefined, emptyMorph({ verbs: ['하', '되'] }))
      .checks.find((c) => c.key === 'requireAll')!
    t("물기: '조평'만 있고 '유겸' 없는 답안 → requireAll fail · detail 에 빠진 이름",
      run('조평은 삯을 전대에 꿰맸다.').status === 'fail' &&
        run('조평은 삯을 전대에 꿰맸다.').detail === '없음: 유겸')
    const gap = cc.find((x) => x.source_key === 'cc-ace-siren')!
    const gr = combine(
      { id: gap.source_key, type: 'convert', scoring_mode: 'auto', scoring_config: gap.scoring_config },
      { text: '도현은 인터뷰 내내 불안한 표정을 감추지 못했다.' }, undefined,
      emptyMorph({ verbs: ['하', '못하'] }))
    t("물기: 갭 문항에 '불안' 을 직접 쓰면 forbidWords fail",
      gr.checks.find((c) => c.key === 'forbidWords')?.status === 'fail')
  }

  // ── 인물 원장(characters.md) — 왕복 규칙의 덫 ──
  const charMd = readFileSync(path.join(__dirname, '..', '..', 'docs', 'characters.md'), 'utf8')
  t('docs/characters.md 가 있다', charMd.length > 0)
  const charHeaders = new Set(
    [...charMd.matchAll(/^##\s+([^\s—]+)\s+—/gm)].map((m) => m[1]))
  t('원장에 인물 헤더 10명 이상', charHeaders.size >= 10, JSON.stringify([...charHeaders]))
  // 활성 lack·contrast_char 문항의 대표 이름이 원장 헤더에 실재한다.
  const nameSkills = new Set(['lack', 'contrast_char'])
  for (const d of allProblems.filter((p) => nameSkills.has(p.skill_key) && !deadSet.has(p.source_key))) {
    const c = d.scoring_config
    const canon = (c.requireAll as string[] | undefined) ?? [((c.requireAny as string[]) ?? [])[0]]
    for (const nm of canon) {
      t(`왕복 규칙: '${d.source_key}' 의 인물 '${nm}' 이 characters.md 에 있다`,
        charHeaders.has(nm), JSON.stringify([...charHeaders]))
    }
  }

  // ── stages: contrast_char 코치·자기점검 (재설계 문구) ──
  const stagesDump = readDump<{ skill_key: string; title: string; coach_intro: string; coach_line: string; self_checks: string[] }[]>('stages.json')
  const ccStage = stagesDump.find((s) => s.skill_key === 'contrast_char')!
  t("stages contrast_char title '입체 캐릭터'", ccStage.title === '입체 캐릭터')
  t('stages contrast_char coach_intro·coach_line 이 비어 있지 않다',
    ccStage.coach_intro.length > 0 && ccStage.coach_line.length > 0)
  t("stages contrast_char coach_line '겉 하나, 새는 속 하나!'",
    ccStage.coach_line === '겉 하나, 새는 속 하나!')
  t('stages contrast_char 의 self_checks 2건 (겉·속 / 페어)',
    Array.isArray(ccStage.self_checks) && ccStage.self_checks.length === 2 &&
      ccStage.self_checks.every((s) => s.length > 0), JSON.stringify(ccStage.self_checks))
}

// ── '쓰지 않을 말' 표시: forbidLabel/forbidDisplay ↔ 채점 (세션 22) ──────
//
// scoring_config 에 표시 전용 필드 둘을 더했다. 채점(forbidWords·forbidLemmas)은
// 안 건드린다 — 화면의 규칙 줄이 긴 목록 대신 범주 한 줄 + '예: …'(펼치면 전체)로
// 보이게만 한다. 2단계 emotion_action 6 + 6단계 sensory 8 에 채웠다.
//
// ★ forbidDisplay 의 기본형마다 대응 어간이 forbidWords/forbidLemmas 에 실재해야
//   한다. 표시와 채점이 갈리면(학습자에게 안 잡히는 말을 예로 보여주면) 여기서 문다.
console.log('\n[쓰지 않을 말 표시: forbidLabel/forbidDisplay ↔ 채점]')
{
  interface FwProblem {
    source_key: string
    skill_key: string
    type: string
    scoring_config: ScoringConfig
  }
  const root = path.join(__dirname, '..', '..')
  const readDump = <T,>(f: string): T =>
    JSON.parse(readFileSync(path.join(root, 'seed', 'dump', f), 'utf8').replace(/^﻿/, '')) as T

  // 표시(기본형) → 어간. 'X다' 면 '다'를 뗀다(보다→보, 화나다→화나). 그 밖엔 그대로.
  const stemOf = (display: string) => (display.endsWith('다') ? display.slice(0, -1) : display)
  // 표시 기본형이 채점 목록에 실재하는가. forbidWords 는 활용 어간('화났'),
  // forbidLemmas 는 '보/VV' 라 표제어만 뗀다. 자모 분해(NFD)해서 한쪽이 다른
  // 쪽을 품으면 대응으로 본다 — '화나'(ㅎㅘㄴㅏ)는 '화났'(ㅎㅘㄴㅏㅆ)의 앞이고,
  // '낯뜨거'는 '낯뜨겁'의 앞이다(ㅂ 불규칙·시제 어미를 이렇게 흡수한다).
  const nfd = (s: string) => s.normalize('NFD')
  const isScored = (display: string, fw: string[], fl: string[]) => {
    const stem = nfd(stemOf(display))
    const overlaps = (target: string) => {
      const a = nfd(target)
      return a.includes(stem) || stem.includes(a)
    }
    return fw.some(overlaps) || fl.some((l) => overlaps(l.split('/')[0]))
  }

  // 비활성 대비형 cc- 4건은 forbidLabel 이 없다(세션 32 requireAll 형) — 카운트
  // 대상 아님. 세션 32 후기 갭 문항 4건이 forbidLabel 을 새로 들고 온다.
  const withDisplay = readDump<FwProblem[]>('problems.json').filter(
    (d) => d.scoring_config.forbidLabel !== undefined
  )
  t('덤프에 forbidLabel 을 채운 문항 28', withDisplay.length === 28, `실제=${withDisplay.length}`)
  t(
    '전부 emotion_action 6 + sensory 8 + start_write 5 + lack 5 + contrast_char 4',
    withDisplay.filter((d) => d.skill_key === 'emotion_action').length === 6 &&
      withDisplay.filter((d) => d.skill_key === 'sensory').length === 8 &&
      withDisplay.filter((d) => d.skill_key === 'start_write').length === 5 &&
      withDisplay.filter((d) => d.skill_key === 'lack').length === 5 &&
      withDisplay.filter((d) => d.skill_key === 'contrast_char').length === 4
  )

  for (const d of withDisplay) {
    const cfg = d.scoring_config
    const label = cfg.forbidLabel!
    const display = cfg.forbidDisplay ?? []
    const fw = cfg.forbidWords ?? []
    const fl = cfg.forbidLemmas ?? []
    t(`'${d.source_key}': forbidLabel 이 한 줄이고 '기계' 얘기가 없다`,
      label.length > 0 && label.length < 40 && !/기계|자동|채점기|규칙 검사|서버/.test(label), `"${label}"`)
    t(`'${d.source_key}': forbidDisplay 가 2개 이상`, display.length >= 2, `${display.length}`)
    for (const e of display) {
      t(`'${d.source_key}': 표시 '${e}' 가 채점 목록(forbidWords/forbidLemmas)에 실재`,
        isScored(e, fw, fl), `어간="${stemOf(e)}"`)
    }
  }

  // 물기: 채점에 없는 말을 표시에 넣으면 잡힌다. dragon-king-anger 의 목록에는
  // '억울'이 없다 — 넣어 보면 isScored 가 false 여야 한다(그래서 검사가 문다).
  {
    const anger = withDisplay.find((d) => d.source_key === 'dragon-king-anger')!
    const fw = anger.scoring_config.forbidWords ?? []
    const fl = anger.scoring_config.forbidLemmas ?? []
    t('물기: 채점에 없는 "억울하다"는 실재로 안 잡힌다',
      isScored('억울하다', fw, fl) === false)
    t('물기: 실제 목록의 "화나다"는 잡힌다', isScored('화나다', fw, fl) === true)
  }

  // 세션 29 후기: start_write 의 표시어 '오라'는 forbidLemmas('오라/NNG')에만
  // 대응한다 — stemOf 가 '다' 로 안 끝나는 낱말을 그대로 두므로 isScored 가
  // 표제어(l.split('/')[0])와 맞춰 잡아야 정상.
  {
    const sw0 = withDisplay.find((d) => d.skill_key === 'start_write')!
    const fw = sw0.scoring_config.forbidWords ?? []
    const fl = sw0.scoring_config.forbidLemmas ?? []
    t("start_write: 표시 '오라' 가 forbidLemmas('오라/NNG')로 잡힌다",
      isScored('오라', fw, fl) === true)
    t("start_write: 표시 '기류' 는 forbidWords 로 잡힌다", isScored('기류', fw, fl) === true)
  }

  // 규칙 없는 문항은 안 깨진다 — forbidWords 만 있고 forbidLabel 없는 문항의
  // 검사는 rule 이 '쓰지 않음: …' 그대로여야 한다(예: 8단계 fill 의 대괄호).
  {
    const plain: Problem = {
      id: 'x', type: 'convert', scoring_mode: 'auto',
      scoring_config: { forbidWords: ['가나다'] },
    }
    const r = combine(plain, { text: '무해한 문장.' }, undefined, emptyMorph())
    const fwCheck = r.checks.find((c) => c.key === 'forbidWords')!
    t('forbidLabel 없으면 rule 이 "쓰지 않음: …" 그대로', fwCheck.rule === '쓰지 않음: 가나다')
    t('forbidLabel 없으면 examples 가 없다', fwCheck.examples === undefined)
  }

  // 있는 문항: combine 이 rule=forbidLabel, examples=forbidDisplay 로 낸다
  {
    const anger = withDisplay.find((d) => d.source_key === 'dragon-king-anger')!
    const prob: Problem = {
      id: anger.source_key, type: 'convert', scoring_mode: 'auto',
      scoring_config: anger.scoring_config,
    }
    const r = combine(prob, { text: '용왕이 옥좌를 내리쳤다.' }, undefined, emptyMorph({ verbs: ['내리치'] }))
    const fwCheck = r.checks.find((c) => c.key === 'forbidWords')!
    t('forbidLabel 있으면 rule 이 범주 한 줄', fwCheck.rule === '분노를 직접 말하는 표현')
    t('forbidLabel 있으면 examples 가 forbidDisplay',
      JSON.stringify(fwCheck.examples) === JSON.stringify(anger.scoring_config.forbidDisplay))
  }

  // sensory: forbidWords + forbidLemmas 를 mergeForbidChecks 가 한 줄로 합치는데,
  // forbidDisplay 가 있으면 합친 목록 대신 범주 한 줄 + examples 를 유지해야 한다.
  {
    const sn = withDisplay.find((d) => d.skill_key === 'sensory')!
    const prob: Problem = {
      id: sn.source_key, type: 'convert', scoring_mode: 'auto',
      scoring_config: sn.scoring_config,
    }
    const r = combine(prob, { text: '손끝이 진흙을 훑었다.' }, undefined,
      emptyMorph({ verbs: ['훑'], lemmas: [] }))
    const merged = mergeForbidChecks(r.checks).find((c) => c.key === 'forbidWords')!
    t('sensory 병합본 rule 이 범주 한 줄', merged.rule === '눈에 기대는 표현')
    t('sensory 병합본에 examples 가 남는다',
      JSON.stringify(merged.examples) === JSON.stringify(sn.scoring_config.forbidDisplay))
    t('sensory 병합본에 forbidLemmas 표제어 나열이 안 샌다', !merged.rule.includes('바라보'))
  }

  // update SQL 이 덤프와 갈리지 않았는지 (scoring_config 를 jsonb 로 비교).
  // update-forbid-display.sql 은 세션 22 의 기존 14문항(emotion_action·sensory)만
  // 담는다 — start_write 5 · lack 5 는 새 insert 라 seed_data.sql 에 통째로 들어간다.
  {
    const updSql = readFileSync(path.join(root, 'seed', 'update-forbid-display.sql'), 'utf8')
    const rows = [...updSql.matchAll(
      /update problems set scoring_config = '(.+?)'::jsonb\s*\n\s*where source_key = '([^']*)';/g
    )].map((m) => ({ cfg: JSON.parse(m[1]) as Record<string, unknown>, source_key: m[2] }))
    t('update SQL 에 14행이 있다', rows.length === 14, `실제=${rows.length}`)
    const canon = (o: unknown) => JSON.stringify(o, Object.keys(o as object).sort())
    for (const d of withDisplay.filter((x) => !['start_write', 'lack', 'contrast_char'].includes(x.skill_key))) {
      const row = rows.find((r) => r.source_key === d.source_key)
      t(`update SQL '${d.source_key}' 의 scoring_config 가 덤프와 같다`,
        !!row && canon(row.cfg) === canon(d.scoring_config),
        `SQL=${JSON.stringify(row?.cfg)}`)
    }
  }

  // 화면 배선 — 사본 없이 RuleText 를 쓴다
  const ruleTextSrc = readFileSync(path.join(root, 'components', 'train', 'RuleText.tsx'), 'utf8')
  // 기본이 펼침(useState(true)) — 처음 화면에 범주 줄 + 기본형 전체 줄이 다 보인다.
  // 접기/펼치기는 있되 2줄째 자리는 늘 남긴다(visibility) — 행 높이 불변.
  t('RuleText 가 기본 펼침이다 (useState(true))', /useState\(\s*true\s*\)/.test(ruleTextSrc))
  t('RuleText 가 접기/전체 보기 로 토글한다',
    /'접기'/.test(ruleTextSrc) && /'전체 보기'/.test(ruleTextSrc) && /setOpen\(/.test(ruleTextSrc))
  // 2줄째는 조건부 렌더가 아니라 늘 그리고 visibility 로만 감춘다 — 접어도 높이 그대로.
  t('RuleText 2줄째가 접어도 자리를 남긴다 (조건부 렌더 아님 · visibility 토글)',
    /\{list\.length > 0 && \(\s*<span\s+aria-hidden/.test(ruleTextSrc) &&
      /visibility:\s*open\s*\?\s*'visible'\s*:\s*'hidden'/.test(ruleTextSrc))
  t('RuleText 2줄째가 기본형 전체 · 옅은 색 · 행 전체(block) · keep-all',
    /\{list\.join\(' · '\)\}/.test(ruleTextSrc) && /color:\s*'var\(--ink-soft\)'/.test(ruleTextSrc) &&
      /wordBreak:\s*'keep-all'/.test(ruleTextSrc))
  t('RuleText 는 인라인이다 — 팝오버·바깥클릭·Esc 장치가 없다',
    !/position:\s*'absolute'/.test(ruleTextSrc) && !/Escape|mousedown/.test(ruleTextSrc) &&
      !/useEffect/.test(ruleTextSrc) && !/예:/.test(ruleTextSrc))
  const checkRowSrc = readFileSync(path.join(root, 'components', 'train', 'CheckRow.tsx'), 'utf8')
  t('CheckRow 가 RuleText 를 쓰고 라벨을 nowrap 한다',
    /RuleText/.test(checkRowSrc) && /whitespace-nowrap/.test(checkRowSrc))
  const trainSrc = readFileSync(path.join(root, 'components', 'train', 'TrainClient.tsx'), 'utf8')
  t("'무엇을 봅니다' 라벨이 nowrap + 긴 규칙만 줄바꿈",
    /whitespace-nowrap[^]*RuleText/.test(trainSrc) && /min-w-0 flex-1/.test(trainSrc))
  // 규칙 글씨는 본문 급(text-sm 아님)
  t("'무엇을 봅니다' 규칙 글씨가 본문 급이다 (text-sm 안 씀)",
    /min-w-0 flex-1 text-right"/.test(trainSrc) && !/min-w-0 flex-1 text-right text-sm/.test(trainSrc))
  t('CheckRow 의 RuleText 도 본문 급 (text-sm 벗음)',
    /examples\?\.length \? \(\s*<div className="pb-3"/.test(checkRowSrc))
  // 행 높이·간격 — 제출 전('무엇을 봅니다')과 후(CheckRow)가 같은 값이어야 한다.
  t("'무엇을 봅니다' 행이 min-height 3.5rem · py-4 · space-y-4 · 라벨 font-medium",
    /py-4" style=\{\{ minHeight: '3.5rem' \}\}/.test(trainSrc) &&
      /space-y-4 pt-4/.test(trainSrc) && /whitespace-nowrap font-medium/.test(trainSrc))
  t('CheckRow 도 같은 행 밀도 (min-height 3.5rem · py-4 · 라벨 font-medium)',
    /py-4 text-left"/.test(checkRowSrc) && /minHeight: '3\.5rem'/.test(checkRowSrc) &&
      /flex-1 whitespace-nowrap font-medium/.test(checkRowSrc))

  // ── 문항 영역(왼쪽) 스케일업 (세션 23) ──
  const editorSrc2 = readFileSync(path.join(root, 'components', 'train', 'Editor.tsx'), 'utf8')
  const fillBodySrc = readFileSync(path.join(root, 'components', 'train', 'FillBody.tsx'), 'utf8')
  t('제목이 text-3xl', /<h1\s+className="text-3xl"/.test(trainSrc))
  t('원문 상자가 p-5 · text-lg · leading-relaxed',
    /whitespace-pre-wrap p-5 text-lg leading-relaxed/.test(trainSrc))
  t('Editor 입력 높이 1.2배 (6→7 · 13→16)', /rows=\{cfg\.minLines != null \? 16 : 7\}/.test(trainSrc))
  t('두 칸 비율이 왼쪽 우선 (1.4fr) · 오른쪽 최소 22rem',
    /lg:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(22rem,1fr\)\]/.test(trainSrc))
  t('페이지 컨테이너 한 단계 넓힘 (max-w-7xl · 한 칸은 max-w-3xl)',
    /mx-auto max-w-7xl p-6/.test(trainSrc) && /mx-auto max-w-3xl space-y-6 p-6/.test(trainSrc))
  t('Editor textarea 글씨 text-lg(1.125rem) · 패딩 20',
    /fontSize:\s*'1\.125rem'/.test(editorSrc2) && /padding:\s*20/.test(editorSrc2))
  t('fill(FillBody) 고정 줄·입력칸도 같은 글씨 급 (text-lg / 1.125rem)',
    /className="text-lg leading-relaxed"/.test(fillBodySrc) && /fontSize:\s*'1\.125rem'/.test(fillBodySrc))
  // 유형마다 크기가 다르면 안 된다 — 세 자리(원문 상자·Editor·FillBody)가 같은 급
  t('원문 상자·Editor·FillBody 입력 글씨가 한 급이다',
    /p-5 text-lg/.test(trainSrc) && /fontSize:\s*'1\.125rem'/.test(editorSrc2) &&
      /fontSize:\s*'1\.125rem'/.test(fillBodySrc))
}

// ── 자기점검 self_checks: 스키마 · 시드 · 화면 대조 (세션 19) ────────────
//
// 자기점검 문구가 SelfCheck.tsx 에 하드코딩돼 있던 것을 stages.self_checks 로
// 옮겼다(재설계안 11-2). 단계마다 다르다: reduce_adverb 한 줄 · action_reason
// 두 줄 · 나머지 빈 배열(칸이 안 뜬다).
console.log('\n[자기점검 self_checks: 시드 ↔ 화면]')
{
  const root = path.join(__dirname, '..', '..')
  const stagesDump = JSON.parse(
    readFileSync(path.join(root, 'seed', 'dump', 'stages.json'), 'utf8').replace(/^﻿/, '')
  ) as { skill_key: string; self_checks?: unknown }[]

  t(
    '모든 단계에 self_checks 배열이 있다',
    stagesDump.every((s) => Array.isArray(s.self_checks)),
    JSON.stringify(stagesDump.filter((s) => !Array.isArray(s.self_checks)).map((s) => s.skill_key))
  )

  const scOf = (k: string) => stagesDump.find((s) => s.skill_key === k)?.self_checks as string[] | undefined
  t(
    'reduce_adverb 자기점검 한 줄',
    JSON.stringify(scOf('reduce_adverb')) === JSON.stringify(['부사가 하던 일을 동작이 하고 있는가'])
  )
  t(
    'emotion_action 자기점검 한 줄',
    JSON.stringify(scOf('emotion_action')) ===
      JSON.stringify(['이 동작만 보고도 무슨 감정인지 남이 맞힐 수 있는가'])
  )
  t(
    'trim_padding 자기점검 한 줄',
    JSON.stringify(scOf('trim_padding')) ===
      JSON.stringify(['지운 문장 중에 이야기가 잃은 것이 있는가'])
  )
  t(
    'reduce_repeat 자기점검 한 줄',
    JSON.stringify(scOf('reduce_repeat')) ===
      JSON.stringify(['같은 말이 두 번 넘게 안 나와? 소리 내서 읽어 봐!'])
  )
  t(
    'action_reason 자기점검 두 줄(옛 SelfCheck 문구)',
    JSON.stringify(scOf('action_reason')) ===
      JSON.stringify([
        '마지막에 채운 칸이 그 뒤 결정타 줄의 이유가 되는가',
        '채운 칸들이 앞뒤 고정 줄과 끊기지 않고 이어지는가',
      ])
  )
  t(
    'start_write 자기점검 한 줄 (세션 29)',
    JSON.stringify(scOf('start_write')) ===
      JSON.stringify(['첫 문장만 읽고 머릿속에 장면이 그려져? 카메라가 주인공한테 붙어 있어?'])
  )
  t(
    'start_extend 자기점검 한 줄 (세션 30)',
    JSON.stringify(scOf('start_extend')) ===
      JSON.stringify(['지문과 내 문장을 이어 읽으면 한 사람 이야기로 느껴져? 주인공이 나와서 뭐라도 하고 있어?'])
  )
  t(
    'lack 자기점검 한 줄 (세션 31)',
    JSON.stringify(scOf('lack')) ===
      JSON.stringify(['결핍이라는 말 없이도, 이 사람이 뭐에 굶주렸는지 남이 맞힐 수 있어?'])
  )
  t(
    'contrast_char 자기점검 두 줄 (세션 32 후기 — 겉·속 / 페어)',
    JSON.stringify(scOf('contrast_char')) ===
      JSON.stringify([
        '겉과 속이 각각 행동 하나씩으로 보여? 속을 말로 설명해 버리진 않았어?',
        '두 사람이 나오면 — 반응을 서로 바꿔 놓아도 어색하지 않은지 봐. 안 어색하면 아직 대비가 아니야.',
      ])
  )
  const withSelfChecks = [
    'reduce_adverb', 'emotion_action', 'trim_padding', 'reduce_repeat', 'action_reason',
    'start_write', 'start_extend', 'lack', 'contrast_char',
  ]
  t(
    '나머지 단계는 빈 배열(자기점검 칸이 안 뜬다)',
    stagesDump
      .filter((s) => !withSelfChecks.includes(s.skill_key))
      .every((s) => Array.isArray(s.self_checks) && (s.self_checks as string[]).length === 0)
  )

  const selfCheckSrc = readFileSync(path.join(root, 'components', 'train', 'SelfCheck.tsx'), 'utf8')
  t(
    'SelfCheck 가 자기점검 문구를 하드코딩하지 않는다',
    !selfCheckSrc.includes('마지막에 채운 칸이') && !selfCheckSrc.includes('const QUESTIONS')
  )
  t('SelfCheck 가 selfChecks prop 을 받는다', /selfChecks:\s*string\[\]/.test(selfCheckSrc))

  const seedSql = readFileSync(path.join(root, 'seed_data.sql'), 'utf8')
  t(
    'seed_data.sql stages insert 에 self_checks 열이 있다',
    /\(track, order_no, title, skill_key, summary, is_free, self_checks,/.test(seedSql) &&
      /self_checks = excluded\.self_checks/.test(seedSql)
  )
  t(
    'seed_data.sql 에 reduce_adverb 자기점검 문구가 들어갔다',
    seedSql.includes("array['부사가 하던 일을 동작이 하고 있는가']::text[]")
  )
  t('seed_data.sql 에 빈 self_checks 는 array[]::text[]', seedSql.includes('array[]::text[]'))

  const schemaSql = readFileSync(path.join(root, 'seed_schema.sql'), 'utf8')
  t(
    'seed_schema.sql 에 stages.self_checks 컬럼 추가가 있다',
    /alter table stages add column if not exists self_checks text\[\]/.test(schemaSql)
  )
}

// ── 가르침 층: 코치 말풍선 · 조건 요약 · 문장 수 게이지 (세션 24) ─────────
console.log('\n[가르침 층: 코치 말풍선 · 조건 요약 · 게이지]')
{
  const root = path.join(__dirname, '..', '..')
  const stagesDump = JSON.parse(
    readFileSync(path.join(root, 'seed', 'dump', 'stages.json'), 'utf8').replace(/^﻿/, '')
  ) as { skill_key: string; track: string; intro?: unknown; coach_intro?: unknown; coach_line?: unknown }[]

  // ── 가·나·라: 코치 캐릭터 ──
  t('모든 단계에 coach_intro·coach_line 문자열', stagesDump.every(
    (s) => typeof s.coach_intro === 'string' && typeof s.coach_line === 'string'))
  // 문장 트랙 10단계 + 도입 1·2·3(세션 28~30) + 구성 11 lack·12 contrast_char
  // (세션 31·32) = 15단계에 코치가 있다.
  const COACH_SKILLS = new Set([
    'reduce_adverb', 'emotion_action', 'trim_padding', 'reduce_repeat', 'adverb_exception',
    'sensory', 'rhythm', 'dialogue_ratio', 'pov_lock', 'action_reason',
    'start_choose', 'start_write', 'start_extend', 'lack', 'contrast_char',
  ])
  const withCoach = stagesDump.filter((s) => (s.coach_intro as string).length > 0)
  t('coach_intro 는 문장 10 + 도입 1·2·3 + 구성 11·12 에만 있다',
    withCoach.length === 15 && withCoach.every((s) => COACH_SKILLS.has(s.skill_key)),
    JSON.stringify(withCoach.map((s) => `${s.skill_key}:${s.track}`)))
  t('coach_line 도 같은 15단계에만',
    stagesDump.filter((s) => (s.coach_line as string).length > 0).length === 15 &&
      stagesDump.every((s) => (s.coach_intro as string).length > 0 === ((s.coach_line as string).length > 0)))
  t('그 밖의 단계는 coach_intro·coach_line 이 빈 문자열',
    stagesDump.filter((s) => !COACH_SKILLS.has(s.skill_key)).every(
      (s) => s.coach_intro === '' && s.coach_line === ''))
  const scCoach = stagesDump.find((s) => s.skill_key === 'start_choose')!
  t('start_choose 코치 대사에 실제 콘텐츠 (다섯 줄·카메라)',
    (scCoach.coach_intro as string).includes('다섯 줄') &&
      (scCoach.coach_intro as string).length > 60 &&
      (scCoach.coach_line as string).includes('카메라'))
  // 레거시 intro 는 전부 '' — 화면이 안 쓴다
  t('stages.json 의 intro 는 전부 빈 문자열(레거시)',
    stagesDump.every((s) => s.intro === ''))
  const raCoach = stagesDump.find((s) => s.skill_key === 'reduce_adverb')!
  t('reduce_adverb 코치 대사에 실제 콘텐츠',
    (raCoach.coach_intro as string).includes('부사') && (raCoach.coach_intro as string).length > 60 &&
      (raCoach.coach_line as string).length > 5)

  const schemaSql = readFileSync(path.join(root, 'seed_schema.sql'), 'utf8')
  t('seed_schema.sql 에 stages.coach_intro·coach_line 컬럼',
    /alter table stages add column if not exists coach_intro text not null default ''/.test(schemaSql) &&
      /alter table stages add column if not exists coach_line\s+text not null default ''/.test(schemaSql))
  const seedSql = readFileSync(path.join(root, 'seed_data.sql'), 'utf8')
  t('seed_data.sql stages upsert 에 coach_intro·coach_line (insert + do update)',
    /insert into stages\s*\n\s*\([^)]*coach_intro, coach_line\)/.test(seedSql) &&
      /coach_intro = excluded\.coach_intro,/.test(seedSql) &&
      /coach_line = excluded\.coach_line;/.test(seedSql))

  const bubbleSrc = readFileSync(path.join(root, 'components', 'train', 'CoachBubble.tsx'), 'utf8')
  t('CoachBubble 이 빈 문자열이면 렌더 안 함', /if \(!text\) return null/.test(bubbleSrc))
  t('CoachBubble 에 ✒️ + 말풍선 카드(꼬리)', /✒️/.test(bubbleSrc) && /borderRight: '8px solid/.test(bubbleSrc))

  const stageListSrc = readFileSync(path.join(root, 'app', 'train', '[stageId]', 'page.tsx'), 'utf8')
  t('단계 목록 페이지가 coach_intro 를 읽고 요약 아래 CoachBubble 로 그린다',
    /select\([^)]*coach_intro/.test(stageListSrc) && /<CoachBubble text=\{stage\.coach_intro/.test(stageListSrc))

  // ── 다: 조건 요약 (summarizeConfig) ──
  t('요약: 3단계 config → 예시 문구 그대로',
    summarizeConfig({ maxChars: 42, minVerbs: 3, maxRepeat: 2 }) ===
      '42자 이하 · 움직이는 말 3개 이상 · 같은 말 반복 2회까지')
  t('요약: 빈 config → 빈 문자열', summarizeConfig({}) === '')
  t('요약: choice 재료(cards)만 있으면 빈 문자열', summarizeConfig({ cards: ['a', 'b'] }) === '')
  t('요약: forbidLabel 이 있으면 범주로', summarizeConfig({ maxChars: 60, forbidLabel: '분노를 직접 말하는 표현' }) ===
    '60자 이하 · 분노를 직접 말하는 표현 안 씀')
  t('요약: forbidLabel 없이 forbidWords 만 → "쓰지 않을 말 있음"',
    summarizeConfig({ forbidWords: ['화났'] }) === '쓰지 않을 말 있음')
  t('요약: repeatTargets → 감시 낱말 목록',
    summarizeConfig({ maxChars: 45, maxRepeat: 2, repeatTargets: [{ word: '도끼', max: 2 }, { word: '산신령', max: 1 }] }) ===
      '45자 이하 · 같은 말 반복 2회까지 · 특정 낱말 반복 제한(도끼·산신령)')
  // 모든 실 문항의 요약이 터지지 않고, 채점 임계값(숫자 배열)이 안 샌다
  const allProblems = JSON.parse(
    readFileSync(path.join(root, 'seed', 'dump', 'problems.json'), 'utf8').replace(/^﻿/, '')
  ) as { source_key: string; scoring_config: ScoringConfig }[]
  for (const p of allProblems) {
    const s = summarizeConfig(p.scoring_config)
    t(`요약 '${p.source_key}' 이 문자열이고 원시 배열이 안 샌다`,
      typeof s === 'string' && !s.includes('[') && !s.includes('undefined'), `"${s}"`)
  }
  const pageSrc = readFileSync(
    path.join(root, 'app', 'train', '[stageId]', '[sourceKey]', 'page.tsx'), 'utf8')
  t('문항 page.tsx 가 summarizeConfig 로 configSummary 를 만들어 넘긴다',
    /summarizeConfig\(cfg\)/.test(pageSrc) && /configSummary=\{configSummary\}/.test(pageSrc))
  t('문항 page.tsx 가 이 단계의 coach_line 을 읽어 넘긴다',
    /select\([^)]*coach_line/.test(pageSrc) && /coachLine=\{coachLine\}/.test(pageSrc))
  const trainSrc2 = readFileSync(path.join(root, 'components', 'train', 'TrainClient.tsx'), 'utf8')
  t('TrainClient 가 configSummary 를 지시문 아래에 그린다',
    /configSummary !== ''/.test(trainSrc2) && /configSummary: string/.test(trainSrc2))
  t('TrainClient 가 지시문 위에 CoachBubble(coachLine) 을 그린다',
    /<CoachBubble text=\{coachLine\} \/>/.test(trainSrc2) &&
      trainSrc2.indexOf('<CoachBubble') < trainSrc2.indexOf('{instructionFirst}'))

  // ── 라: 게이지에 문장 수 ──
  t('서술형 게이지에 문장 수 + 자수 (모든 텍스트 유형)',
    /countSentences\(text\)\}문장 · \{countChars\(text\)\}/.test(trainSrc2))
  // RuleGauge 만 maxChars 로 게이트하고, 문장·자수 줄은 그 밖에서 늘 뜬다.
  t('RuleGauge 는 maxChars 로 게이트 · 문장 수 줄은 게이트 밖',
    /\{cfg\.maxChars != null && <RuleGauge count=\{countChars\(text\)\} max=\{cfg\.maxChars\} \/>\}/.test(trainSrc2) &&
      /\}자\s*<\/p>/.test(trainSrc2) &&
      /maxChars != null \? ` \/ \$\{cfg\.maxChars\}` : ''\}자/.test(trainSrc2))
}

// ── 채점 근거 하이라이트: fail 검사만 본문에 칠한다 (세션 20) ────────────
//
// 통과 화면에 밑줄이 남아 있으면 학습자가 "아직 틀렸다"로 읽는다(실사용 혼동).
// buildMarks 는 status === 'fail' 인 검사의 evidence 만 밑줄로 만든다. 통과·
// 확인중인 검사의 근거는 오른쪽 검사 목록(CheckRow)의 칩으로만 남는다.
console.log('\n[채점 근거 하이라이트: fail 만 본문에 칠한다]')
{
  const text = '흥부는 몹시 조심스럽게 제비의 다리를 아주 천천히 감쌌다.'
  const mk = (status: CheckStatus, evidence: string[]): Check => ({
    key: 'maxAdverbs',
    label: '부사',
    status,
    detail: '',
    rule: '',
    evidence,
  })

  const failMarks = buildMarks(text, [mk('fail', ['몹시', '아주'])])
  t('fail 검사의 evidence 는 밑줄이 된다', failMarks.length === 2, JSON.stringify(failMarks))

  const passMarks = buildMarks(text, [mk('pass', ['몹시', '아주'])])
  t('pass 검사의 evidence 는 하이라이트 대상에 안 들어간다', passMarks.length === 0, JSON.stringify(passMarks))

  const pendingMarks = buildMarks(text, [mk('pending', ['몹시', '아주'])])
  t('pending 검사의 evidence 도 안 들어간다', pendingMarks.length === 0, JSON.stringify(pendingMarks))

  // 통과·미달이 섞이면 미달 것만 남는다
  const mixed = buildMarks(text, [
    { ...mk('pass', ['몹시']), key: 'minVerbs', label: '동사' },
    mk('fail', ['아주']),
  ])
  t('섞이면 fail 것만 남는다', mixed.length === 1 && text.slice(mixed[0].start, mixed[0].end) === '아주', JSON.stringify(mixed))

  // 물기: 필터를 지우면(예전 동작) pass evidence 가 밑줄로 샌다
  t('물기: 필터가 없으면 pass evidence 2개가 샌다', (() => {
    // buildMarks 안의 status 게이트를 흉내 낸 '필터 없음' 버전
    const leaked: number[] = []
    for (const w of ['몹시', '아주']) {
      let from = 0
      for (;;) {
        const i = text.indexOf(w, from)
        if (i === -1) break
        leaked.push(i)
        from = i + w.length
      }
    }
    return leaked.length === 2 && passMarks.length === 0
  })())

  // Editor.tsx 가 이 순수 모듈을 쓴다 — 사본을 만들지 않았다
  const editorSrc = readFileSync(
    path.join(__dirname, '..', '..', 'components', 'train', 'Editor.tsx'), 'utf8')
  t("Editor.tsx 가 './marks' 의 buildMarks 를 쓴다", /from '\.\/marks'/.test(editorSrc) && /buildMarks/.test(editorSrc))
  t('Editor.tsx 에 buildMarks 사본이 없다', !/function buildMarks/.test(editorSrc))
}

// ── 학습 루프: '다음 문항' 계산 (세션 18) ─────────────────────────────
//
// 순수 함수 nextProblemKey 만 여기서 문다. 화면(TrainClient)은 이 값으로
// 링크를 그릴 뿐이다. 목록 순서는 difficulty → source_key — page.tsx 의
// .order 와 같아야 한다.
console.log('\n[학습 루프: 다음 문항 계산]')
{
  // 목록 순서가 섞여 들어와도(difficulty 2 가 먼저, source_key 도 뒤죽박죽)
  // 안에서 정렬한다. 그래야 화면이 어떤 순서로 넘겨도 결과가 같다.
  const P = [
    { id: 'i-c', source_key: 'ar-c', difficulty: 1 },
    { id: 'i-a', source_key: 'ar-a', difficulty: 1 },
    { id: 'i-b', source_key: 'ar-b', difficulty: 1 },
    { id: 'i-e', source_key: 'ar-e', difficulty: 2 },
    { id: 'i-d', source_key: 'ar-d', difficulty: 2 },
  ]
  // 정렬 결과: ar-a, ar-b, ar-c (난1) · ar-d, ar-e (난2)
  const none = new Set<string>()

  t('첫 문항 → 다음은 ar-b', nextProblemKey(P, 'ar-a', none) === 'ar-b')
  t('난이도 경계를 넘는다 (ar-c → ar-d)', nextProblemKey(P, 'ar-c', none) === 'ar-d')
  t('마지막 문항 → null', nextProblemKey(P, 'ar-e', none) === null)
  t('목록에 없는 key → null (방어)', nextProblemKey(P, 'ar-z', none) === null)

  // 통과한 것을 건너뛴다
  t('바로 다음이 통과면 그 다음으로', nextProblemKey(P, 'ar-a', new Set(['i-b'])) === 'ar-c')
  t('뒤가 다 통과면 null', nextProblemKey(P, 'ar-c', new Set(['i-d', 'i-e'])) === null)
  t('지금 문항이 통과여도 다음 계산에는 영향 없음', nextProblemKey(P, 'ar-a', new Set(['i-a'])) === 'ar-b')

  // 문항이 하나뿐인 단계
  t('문항 하나뿐 → null', nextProblemKey([P[0]], 'ar-c', none) === null)

  // 물기: 건너뛰기 로직을 지우면 '바로 다음이 통과면' 시험이 샌다
  const skipLeaks = (() => {
    // passedIds 를 무시하는 버전을 흉내 낸다
    const list = [...P].sort((a, b) => a.difficulty - b.difficulty || a.source_key.localeCompare(b.source_key))
    const i = list.findIndex((p) => p.source_key === 'ar-a')
    return list[i + 1]?.source_key ?? null // 'ar-b' — 통과 여부를 안 봄
  })()
  t('물기: 건너뛰기를 빼면 통과한 ar-b 로 보낸다 (지금은 ar-c)', skipLeaks === 'ar-b' && nextProblemKey(P, 'ar-a', new Set(['i-b'])) === 'ar-c')
}

console.log('\n[학습 루프: 다음 단계 계산]')
{
  const S = [
    { id: 's-a', track: 'sentence', order_no: 10 },
    { id: 's-b', track: 'sentence', order_no: 11 },
    { id: 's-c', track: 'sentence', order_no: 12 },
    { id: 's-d', track: 'structure', order_no: 11 },
    { id: 's-e', track: 'structure', order_no: 14 },
    { id: 's-f', track: 'start', order_no: 1 },
  ]
  const has = (...ids: string[]) => new Set(ids)

  t('바로 다음 단계에 문항 있으면 그것', nextStageId(S, 's-a', has('s-b')) === 's-b')
  t('빈 단계를 건너뛴다', nextStageId(S, 's-a', has('s-d')) === 's-d')
  t('트랙 경계 — sentence 12 다음은 structure 11 (order_no 11 < 12 여도)',
    nextStageId(S, 's-c', has('s-d', 's-e')) === 's-d')
  t('structure 끝 → start 로', nextStageId(S, 's-e', has('s-f')) === 's-f')
  t('뒤가 전부 빈 단계면 null', nextStageId(S, 's-a', has('s-a')) === null)
  t('마지막 단계면 null', nextStageId(S, 's-f', has('s-f')) === null)
  t('목록에 없는 단계면 null (방어)', nextStageId(S, 's-z', has('s-b')) === null)

  // 물기: 트랙을 안 보고 order_no 만으로 정렬하면 sentence 12 다음에 structure 11 이
  //       안 온다(11 < 12 라 앞에 있다). 위 '트랙 경계' 시험이 그것을 잡는다.
  const byOrderOnly = [...S].sort((a, b) => a.order_no - b.order_no)
  const iC = byOrderOnly.findIndex((s) => s.id === 's-c')
  t('물기: order_no 만 보면 s-c 다음에 s-d 가 없다', !byOrderOnly.slice(iC + 1).some((s) => s.id === 's-d'))
}

console.log('\n[학습 루프: 진도 세기 — 유형과 무관]')
{
  // stageProgress 는 유형을 안 본다 — 통과한 problem_id 만 센다. choice·order·
  // count 는 실제로 difficulty 가 섞여 있어(ae-* 는 [2,2,1,1]) 정렬 뒤 세는지 본다.
  // 세션 18: choice 단계에서 완료 화면이 'NaN/4' 였다.
  const choiceStage = [
    { id: 'q-kongjwi', source_key: 'ae-kongjwi-jar', difficulty: 2 },
    { id: 'q-axe', source_key: 'ae-axe-drop', difficulty: 2 },
    { id: 'q-gyeonu', source_key: 'ae-gyeonu-bridge', difficulty: 1 },
    { id: 'q-rabbit', source_key: 'ae-rabbit-gate', difficulty: 1 },
  ]
  const p0 = stageProgress(choiceStage, new Set())
  t('choice 4문항 · 통과 0 → 0/4', p0.passed === 0 && p0.total === 4)
  t('choice · 통과 0 → passed 는 수다(NaN 아님)', Number.isInteger(p0.passed))
  t('choice · skipped 가 목록 순서(난1 먼저, 그 안에서 source_key)', p0.skipped.map((p) => p.source_key).join(',') === 'ae-gyeonu-bridge,ae-rabbit-gate,ae-axe-drop,ae-kongjwi-jar')

  const pAll = stageProgress(choiceStage, new Set(['q-kongjwi', 'q-axe', 'q-gyeonu', 'q-rabbit']))
  t('choice · 전부 통과 → 4/4 · skipped 0', pAll.passed === 4 && pAll.total === 4 && pAll.skipped.length === 0)

  const pSome = stageProgress(choiceStage, new Set(['q-gyeonu', 'q-axe']))
  t('choice · 둘 통과 → 2/4', pSome.passed === 2 && pSome.total === 4)
  t('choice · 남은 둘이 skipped', pSome.skipped.map((p) => p.id).sort().join(',') === 'q-kongjwi,q-rabbit')

  // order 3문항 · count 2문항 — 같은 식
  const orderStage = [
    { id: 'o-1', source_key: 'od-a', difficulty: 1 },
    { id: 'o-2', source_key: 'od-b', difficulty: 1 },
    { id: 'o-3', source_key: 'od-c', difficulty: 2 },
  ]
  t('order 3 · 통과 2 → 2/3', stageProgress(orderStage, new Set(['o-1', 'o-3'])).passed === 2)
  const countStage = [
    { id: 'n-1', source_key: 'be-a', difficulty: 1 },
    { id: 'n-2', source_key: 'be-b', difficulty: 2 },
  ]
  t('count 2 · 통과 1 → 1/2', stageProgress(countStage, new Set(['n-2'])).passed === 1)
  t('count · 통과 없음의 passed 는 0 (undefined·NaN 아님)', stageProgress(countStage, new Set()).passed === 0)

  // difficulty 가 null·문자열로 와도 안 깨진다
  const messy = [
    { id: 'm-1', source_key: 'x-b', difficulty: null as unknown as number },
    { id: 'm-2', source_key: 'x-a', difficulty: '2' as unknown as number },
  ]
  const pm = stageProgress(messy, new Set(['m-1']))
  t('difficulty null·문자열 → passed 1/2, skipped 는 x-a', pm.passed === 1 && pm.total === 2 && pm.skipped[0].source_key === 'x-a')

  // 물기: total 을 passedIds 크기로 세면(유형별로 다른 자리에서 세던 흔적)
  //       이 단계에 없는 통과가 섞여 수가 부푼다
  const withStranger = stageProgress(choiceStage, new Set(['q-gyeonu', 'not-in-this-stage']))
  t('물기: 이 단계 밖의 통과는 안 센다', withStranger.passed === 1 && withStranger.total === 4)
}

// 픽스처와 덤프가 갈리면 위의 감시 전부가 실제 배포물을 안 보는 상태가 된다.
// 8단계가 같은 가드를 두고 있다. 문항이 덤프에 없으면 건너뛰지 않고 실패시킨다 —
// 건너뛰면 "아직 안 넣었다"와 "통과"가 구별되지 않는다.
console.log('\n[9단계 pov_lock: 덤프 대조]')
{
  interface DumpProblem {
    source_key: string
    skill_key: string
    passage: string | null
    instruction: string
    difficulty: number
    scoring_config: Record<string, unknown>
  }
  const raw = readFileSync(
    path.join(__dirname, '..', '..', 'seed', 'dump', 'problems.json'), 'utf8').replace(/^﻿/, '')
  const dump: DumpProblem[] = JSON.parse(raw)
  const povDump = dump.filter((d) => d.skill_key === 'pov_lock')
  t('덤프에 pov_lock 8문항', povDump.length === 8, `실제=${povDump.length}`)

  const canon = (o: Record<string, unknown>) => JSON.stringify(o, Object.keys(o).sort())
  for (const item of POV_ITEMS) {
    const dp = povDump.find((d) => d.source_key === item.sourceKey)
    t(`'${item.sourceKey}' 덤프에 있다`, dp !== undefined)
    if (!dp) continue
    t(`'${item.sourceKey}' 덤프 passage가 픽스처와 같다`, dp.passage === passageOf(item),
      `덤프=${JSON.stringify(dp.passage)}`)
    t(`'${item.sourceKey}' 덤프 instruction이 POV_INSTRUCTION과 같다`,
      dp.instruction === POV_INSTRUCTION, `덤프=${JSON.stringify(dp.instruction)}`)
    t(`'${item.sourceKey}' 덤프 scoring_config가 픽스처와 같다`,
      canon(dp.scoring_config) === canon(povCfgOf(item) as unknown as Record<string, unknown>),
      `덤프=${canon(dp.scoring_config)}`)
    t(`'${item.sourceKey}' 덤프 difficulty가 픽스처와 같다`, dp.difficulty === item.difficulty,
      `덤프=${dp.difficulty}`)
  }
}

// findForbidden은 어간이 아니라 순수 부분 문자열이다(local.ts:17~35).
// DEICTIC이 조망이 아닌 흔한 말을 잡으면 좋은 답안이 미달이 된다.
// 검토를 마친 넷 말고 새 충돌이 생기면 여기서 걸린다.
console.log('\n[9단계 pov_lock: DEICTIC 누출 감시]')
{
  const PROBE = [
    '여기저기', '거기', '여기', '저기압', '저기요', '이쪽저쪽', '멀찍하다',
    '저 사람', '저녁', '저울', '저항', '위쪽', '앞쪽', '너머로', '멀리서',
    '한쪽 위에', '책상 위에', '눈앞에', '문 앞에', '그 너머', '저마다', '저절로',
  ]
  const reviewed = new Set(DEICTIC_REVIEWED_COLLISIONS.map((c) => c.word))
  const leaked = PROBE.filter((w) => findForbidden(w, DEICTIC).length > 0 && !reviewed.has(w))
  t('검토하지 않은 DEICTIC 충돌이 없다', leaked.length === 0, JSON.stringify(leaked))

  // triage 기록이 낡지 않았는지. 안 걸리는 말이 목록에 남아 있으면
  // 다음 사람이 그것을 근거로 DEICTIC을 고칠 수 있다.
  const stale = DEICTIC_REVIEWED_COLLISIONS.filter((c) => findForbidden(c.word, DEICTIC).length === 0)
  t('충돌 기록에 죽은 항목이 없다', stale.length === 0, JSON.stringify(stale.map((c) => c.word)))

  // 말뭉치 전수 — 덤프 지문·지시문 + 좋은 답안 64건
  interface DeicticProbeDump {
    skill_key: string
    passage: string | null
    instruction: string
  }
  const corpus: string[] = []
  const dumpRaw = readFileSync(
    path.join(__dirname, '..', '..', 'seed', 'dump', 'problems.json'), 'utf8')
  for (const dp of JSON.parse(dumpRaw) as DeicticProbeDump[]) {
    // 9단계 자신의 지문·지시문은 뺀다 — 조망 지시어가 들어 있는 것이 지문의
    // 요건이다. 여기서 재는 것은 '조망이 아닌 글이 걸리는가'다.
    if (dp.skill_key === 'pov_lock') continue
    if (dp.passage) corpus.push(dp.passage)
    if (dp.instruction) corpus.push(dp.instruction)
  }
  for (const i of POV_ITEMS) corpus.push(...i.goods)
  const hits = corpus.filter((c) => findForbidden(c, DEICTIC).length > 0)
  t(`말뭉치 ${corpus.length}건에서 DEICTIC이 안 걸린다`, hits.length === 0, `실제=${hits.length}`)
}

// 지시문 예시가 여덟 지문 중 하나로 되돌아가면 '지시문 예시 그대로' 뚫기가
// 모범 답안이 된다. 8단계가 실측으로 확인한 자리다(미검출 8/8).
console.log('\n[9단계 pov_lock: 지시문 가드]')
{
  for (const item of POV_ITEMS) {
    t(
      `지시문 예시에 '${item.pov}'가 없다`,
      !POV_INSTRUCTION_EXAMPLE.includes(item.pov) && !POV_INSTRUCTION_BEFORE.includes(item.pov),
      POV_INSTRUCTION_EXAMPLE
    )
    t(
      `지시문 예시가 '${item.sourceKey}'의 지문이 아니다`,
      !POV_INSTRUCTION_BEFORE.includes(item.gaze) && !POV_INSTRUCTION_EXAMPLE.includes(item.gaze),
      item.gaze
    )
  }
  t(
    '지시문 예시(밀착 쪽)에 지시어가 없다',
    findForbidden(POV_INSTRUCTION_EXAMPLE, DEICTIC).length === 0,
    JSON.stringify(findForbidden(POV_INSTRUCTION_EXAMPLE, DEICTIC))
  )
  t(
    '지시문 예시(조망 쪽)는 지시어로 시작한다 — 고칠 대상임이 보여야 한다',
    DEICTIC.some((d) => POV_INSTRUCTION_BEFORE.startsWith(d + ' ')),
    POV_INSTRUCTION_BEFORE
  )
  t('지시문에 예시가 들어 있다', POV_INSTRUCTION.includes(POV_INSTRUCTION_EXAMPLE.split('\n')[0]))
}

{
  interface DumpProblem {
    source_key: string
    type: string
    passage: string | null
    scoring_config: Record<string, unknown>
  }

  const dumpPath = path.join(__dirname, '..', '..', 'seed', 'dump', 'problems.json')
  const raw = readFileSync(dumpPath, 'utf8').replace(/^\uFEFF/, '')
  const dumpProblems: DumpProblem[] = JSON.parse(raw)
  // \uBB38\uD56D \uC218\uB97C \uC5EC\uAE30\uC11C \uC77D\uB294\uB2E4 \u2014 \uC0C1\uC218\uB85C \uBC15\uC73C\uBA74 \uBB38\uD56D\uC774 \uB298 \uB54C \uC81C\uBAA9\uB9CC \uC61B \uC218\uB97C \uB9D0\uD55C\uB2E4.
  console.log(`\n[rule \uB204\uB77D \uAC10\uC2DC: \uB364\uD504 ${dumpProblems.length}\uBB38\uD56D \uC804\uBD80]`)

  let checked = 0
  const missing: string[] = []
  for (const dp of dumpProblems) {
    const problem: Problem = {
      id: dp.source_key,
      type: dp.type as ProblemType,
      scoring_mode: 'auto' as ScoringMode, // gradeLocal은 scoring_mode를 안 본다
      scoring_config: dp.scoring_config,
    }
    for (const text of ['', dp.passage ?? '']) {
      const checks = [
        ...gradeLocal(problem, { text }, undefined),
        ...pendingMorphChecks(problem.scoring_config),
      ]
      for (const c of checks) {
        checked++
        if (c.rule.trim() === '') missing.push(`${dp.source_key}/${c.key}`)
      }
    }
  }
  t(
    'rule이 빈(또는 공백뿐인) Check가 하나도 없음',
    missing.length === 0,
    `checked=${checked} missing=${JSON.stringify(missing)}`
  )
}

// ── 덤프 ↔ 생성된 SQL ────────────────────────────────────────────
//
// 셋 중 하나가 비어 있었다.
//   덤프 ↔ 저장소 사본   test:scoring 이 이미 본다
//   덤프 ↔ DB            seed_check.sql (세션 8)
//   덤프 ↔ 생성된 SQL    ← 여기. 세션 9 §5 의 오염이 로컬에서 안 걸린 이유다
//
// test:scoring 은 seed_data.sql 을 아예 안 봤다. 그래서 문자열 리터럴 안에
// 실제 줄바꿈 176개가 들어간 채로 커밋되고, Supabase 편집기가 그것을 CRLF로
// 바꿔 놓은 뒤에야 seed_check.sql 이 잡았다.
console.log('\n[덤프 ↔ 생성된 SQL: 줄바꿈 · 최신 여부]')
{
  const repoRoot = path.join(__dirname, '..', '..')

  // (1) 스캐너 자체 표본. 스캐너가 틀리면 아래 검사 전부가 거짓 통과다.
  const probes: Array<[string, string, number]> = [
    ['실제 줄바꿈을 센다', "select '가\n나';", 1],
    ["E'' 의 \\n 은 안 센다", "select E'가\\n나';", 0],
    ['-- 주석 안의 줄바꿈은 안 센다', "-- 가 ' 나\nselect 1;", 0],
    ["'' 뒤의 줄바꿈도 센다", "select '가''나\n다';", 1],
    ['CR 도 센다', "select '가\r나';", 1],
    ["E'' 의 \\' 는 문자열을 안 끝낸다", "select E'가\\'나\n다';", 1],
    ["E'' 끝의 \\\\ 뒤에서는 문자열이 끝난다", "select E'가\\\\';\nselect 1;", 0],
    ['리터럴 두 개를 따로 센다', "select '가' || '나\n다';", 1],
    // 아래 다섯은 '조용한 미탐'이 나던 자리다. 과탐이 아니라 미탐이었다 —
    // 위반이 있는데 0개로 통과했다. 없음을 재는 자에게는 이쪽이 훨씬 나쁘다.
    ['블록 주석의 따옴표가 상태를 안 뒤집는다', "/* 가 ' 나 */ select '다\n라';", 1],
    ['블록 주석 안의 줄바꿈은 안 센다', "/* 가\n나 */\nselect 1;", 0],
    ['블록 주석은 겹칠 수 있다', "/* 가 /* 나 */ 다 ' */\nselect 1;", 0],
    ['-- 안의 /* 는 블록 주석이 아니다', "-- 원본: seed/dump/*.json\nselect '가\n나';", 1],
    ["e 로 끝난 식별자 뒤는 E'' 가 아니다", "select type'가\\\n나';", 1],
  ]
  for (const [label, sample, want] of probes) {
    const got = countRawNewlinesInStrings(sample).count
    t(`스캐너: ${label}`, got === want, `기대=${want} 실제=${got}`)
  }

  // (2) 저장소에 커밋된 SQL 네 개 전수.
  for (const name of ['seed_data.sql', 'seed_check.sql', 'seed_verify.sql', 'seed_schema.sql']) {
    const sql = readFileSync(path.join(repoRoot, name), 'utf8')
    const { count, lines } = countRawNewlinesInStrings(sql)
    t(
      `${name}: 문자열 리터럴 안 실제 줄바꿈 0개`,
      count === 0,
      `${count}개 · 행 ${lines.slice(0, 10).join(', ')}`
    )
  }

  // (3) 덤프의 값이 seed_data.sql 에 그대로 들어 있는가. 줄바꿈 이스케이프가
  //     맞는지와, gen:seed 를 돌리는 것을 잊지 않았는지를 한 번에 잰다.
  //     sqlStr 은 gen-seed.ts 가 쓰는 바로 그 함수다(lib/seed-sql.ts).
  interface SqlDumpProblem {
    source_key: string
    instruction: string
    passage: string | null
  }
  const seedSql = readFileSync(path.join(repoRoot, 'seed_data.sql'), 'utf8')
  const sqlDump: SqlDumpProblem[] = JSON.parse(
    readFileSync(path.join(repoRoot, 'seed', 'dump', 'problems.json'), 'utf8').replace(/^﻿/, '')
  )

  // Postgres 가 E'' 를 읽는 방식대로 되돌린다. 이스케이프 순서가 뒤집히면
  // (\n 을 먼저 만들고 역슬래시를 겹치면) 스캐너는 통과하고 여기서 걸린다.
  function decodeSqlLiteral(lit: string): string {
    if (!lit.startsWith("E'")) return lit.slice(1, -1).replace(/''/g, "'")
    const body = lit.slice(2, -1)
    let out = ''
    let i = 0
    while (i < body.length) {
      if (body[i] === '\\') {
        const n = body[i + 1]
        out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n
        i += 2
        continue
      }
      if (body[i] === "'" && body[i + 1] === "'") {
        out += "'"
        i += 2
        continue
      }
      out += body[i]
      i++
    }
    return out
  }

  let eLiterals = 0
  for (const dp of sqlDump) {
    const bad: string[] = []
    for (const [field, value] of [
      ['instruction', dp.instruction],
      ['passage', dp.passage],
    ] as Array<[string, string | null]>) {
      if (value === null) continue
      const lit = sqlStr(value)
      if (lit.startsWith("E'")) eLiterals++
      if (!seedSql.includes(lit)) bad.push(`${field} 가 seed_data.sql 에 없다`)
      if (decodeSqlLiteral(lit) !== value) bad.push(`${field} 왕복 실패`)
      if (countRawNewlinesInStrings(lit).count > 0) bad.push(`${field} 리터럴에 실제 줄바꿈`)
    }
    t(`${dp.source_key}: 덤프 값이 seed_data.sql 에 그대로 있다`, bad.length === 0, bad.join(' · '))
  }

  // (4) E'' 로 나간 리터럴 수 = 덤프에서 줄바꿈을 가진 필드 수.
  //
  //     ★ 등식이 본체다. 절대 수는 문항이 늘면 바뀐다 — 세션 10이 '실측 32'를
  //       값으로 박아 두었고 10단계 8문항이 들어오면서 48로 늘었다(+16 =
  //       passage 8 + instruction 8). 등식만 재고 절대 수는 아래 주석에 남긴다.
  //
  //     32  8단계 mo-* (instruction 8 + passage 3) · 9단계 pv-* (instruction 10 + passage 1)
  //     48  + 10단계 at-* (instruction 8 + passage 8)
  //     64  + 10단계 ar-* fill (instruction 8[한 종을 여덟이 나눠 쓴다] + passage 8)
  //
  //     세션 10 §6-1 이 sqlStr 을 고친 뒤로 줄바꿈을 가진 문항이 하나도 안
  //     들어왔다. 10단계가 그 고침이 실전에서 처음 걸린 자리다.
  const withNewline = sqlDump.reduce(
    (n, dp) =>
      n +
      (/[\n\r]/.test(dp.instruction) ? 1 : 0) +
      (dp.passage !== null && /[\n\r]/.test(dp.passage) ? 1 : 0),
    0
  )
  t(`E'' 리터럴 수가 줄바꿈 보유 필드 수와 같다`, eLiterals === withNewline,
    `E''=${eLiterals} 줄바꿈필드=${withNewline}`)
}

console.log('\n[AI 마개 — 게이트와 관측]')
{
  // ★ 별도 절이다. 기존 검사 안에 접지 않는다 — 세션 12 §6 `감시를 기존 검사
  //   안에 접기`. 단언 수가 안 늘면 붙었는지를 수로 못 본다.
  //
  // ★★ 검사가 통과하는 것과 문다는 것은 다르다(세션 11 계보 둘째). 그래서
  //   아래는 전부 **병을 넣어 물리는** 꼴이다 — 마개를 하나씩 망가뜨리고
  //   deny 가 나오는지 본다. `정상값에서 allow 가 나온다` 만 재면 마개를
  //   통째로 지워도 그 단언은 통과한다.
  const ok = {
    hasApiKey: true,
    killSwitch: false,
    dailySpendCapUsd: 20,
    spentTodayUsd: 0,
  }
  const ruleOf = (d: GateDecision) => (d.allow ? 'allow' : d.rule)

  t('마개: 정상값이면 통과한다', checkGateBeforeQuota(ok).allow)

  // 병 1 — 킬스위치. 세션 6 §12 `가-1` 이 여섯 세션 기다린 자리다.
  t('병: kill_switch=true 면 막는다', ruleOf(checkGateBeforeQuota({ ...ok, killSwitch: true })) === 'kill_switch')
  // ★ null 은 false 가 아니다. 못 읽은 채로 통과시키면 마개가 없는 것과 같다.
  t('병: kill_switch 를 못 읽으면 막는다', ruleOf(checkGateBeforeQuota({ ...ok, killSwitch: null })) === 'kill_switch')

  // 병 2 — 지출 상한. 세션 11 §8-1 `20 은 한도가 아니다 — 적혀 있을 뿐이다`.
  t('병: 오늘 지출이 상한이면 막는다', ruleOf(checkGateBeforeQuota({ ...ok, spentTodayUsd: 20 })) === 'spend_cap')
  t('병: 오늘 지출이 상한을 넘으면 막는다', ruleOf(checkGateBeforeQuota({ ...ok, spentTodayUsd: 20.01 })) === 'spend_cap')
  t('마개: 상한 아래면 통과한다', checkGateBeforeQuota({ ...ok, spentTodayUsd: 19.99 }).allow)
  t('병: 상한이 없으면 막는다', ruleOf(checkGateBeforeQuota({ ...ok, dailySpendCapUsd: null })) === 'spend_cap')
  t('병: 오늘 지출을 못 읽으면 막는다', ruleOf(checkGateBeforeQuota({ ...ok, spentTodayUsd: null })) === 'spend_cap')

  // 병 3 — 키. 키가 없으면 호출 자체가 못 선다.
  t('병: API 키가 없으면 막는다', ruleOf(checkGateBeforeQuota({ ...ok, hasApiKey: false })) === 'api_key')

  // ★ 순서. 킬스위치가 켜져 있는데 상한 이유로 막히면, 킬스위치를 내려도 안 열린다.
  //   어느 마개에 걸렸는지가 값으로 나오는 것이 이 게이트의 존재 이유다.
  t('마개: 여럿이 닫혔을 때 앞선 마개가 이유가 된다',
    ruleOf(checkGateBeforeQuota({ hasApiKey: false, killSwitch: true, dailySpendCapUsd: null, spentTodayUsd: null })) === 'api_key')

  // 병 4 — 사용자 한도(라우트) · 실행 상한(하니스). 넷째 마개는 경로마다 다르다.
  t('병: 한도 차감이 실패하면 막는다', ruleOf(checkQuota(null)) === 'quota')
  t('병: 한도를 다 쓰면 막는다', ruleOf(checkQuota(-1)) === 'quota')
  t('마개: 한도가 남으면 통과한다', checkQuota(0).allow)
  t('병: 하니스가 자기 상한을 채우면 막는다', ruleOf(checkRunBudget(10, 10)) === 'run_cap')
  t('마개: 하니스 상한 아래면 통과한다', checkRunBudget(9, 10).allow)
  t('병: 하니스 상한이 0이면 막는다', ruleOf(checkRunBudget(0, 0)) === 'run_cap')

  // ── 재시도 판단 ────────────────────────────────────────────────────
  //
  // ★ 503 은 실제로 만난 것이다. `gemini-3.7-flash` 가 몰려서
  //   `This model is currently experiencing high demand` 를 냈다.
  //   172건을 돌리면 몇 건은 반드시 만난다 — 재시도가 없으면 측정이
  //   프롬프트가 아니라 모델 혼잡도를 잰다.
  //
  // ★★ SDK 가 던지는 꼴이 하나가 아니었다. 상태가 `Error.status` 가 아니라
  //   **메시지 안의 JSON** 으로 왔다. 그걸 못 캐면 재시도가 통째로 안 돈다.
  t('재시도: message 안의 JSON 에서 상태를 캔다',
    statusOf(new Error('{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}')) === 503)
  t('재시도: Error.status 에서도 캔다', statusOf(Object.assign(new Error('x'), { status: 429 })) === 429)
  t('재시도: 못 캐면 null 이다', statusOf(new Error('그냥 실패')) === null)

  t('재시도: 503 은 다시 건다', isRetryable(new Error('{"error":{"code":503}}')))
  t('재시도: 429 는 다시 건다', isRetryable(Object.assign(new Error('x'), { status: 429 })))
  // ★ 400·403 은 다시 걸어도 같은 답이 온다. 재시도가 그것을 가리면 안 된다.
  t('병: 400 은 다시 안 건다', !isRetryable(new Error('{"error":{"code":400}}')))
  t('병: 403 은 다시 안 건다', !isRetryable(Object.assign(new Error('x'), { status: 403 })))
  t('재시도: 중단·끊김은 다시 건다', isRetryable(new Error('This operation was aborted')))

  // 지수로 늘리되 흔들림이 붙는다. 172건이 같은 박자로 재시도하면 우리가 더 민다.
  t('재시도: 대기가 지수로 는다', backoffMs(0, () => 1) < backoffMs(3, () => 1))
  t('재시도: 흔들림이 붙는다', backoffMs(2, () => 0) !== backoffMs(2, () => 1))
  t('재시도: 상한 30초를 안 넘는다', backoffMs(20, () => 1) <= 30_000)

  // ── 프롬프트 v2 — 바뀐 곳과 안 바뀐 곳 ─────────────────────────────
  //
  // ★★ v1 과 v2 의 차이가 `delete` 하나여야 두 결과를 나란히 놓을 수 있다.
  //   `cue_copied` 는 36건에서 8/8, `foreshadow_used` 는 4/4 로 섰다 —
  //   서 있는 관측을 같이 고치면 무엇이 좋아졌는지 못 가린다.
  //   그래서 **안 바뀐 것을 검사가 문다.** 사람 눈으로 대조하면 다음 번에 샌다.
  t('v2: cue_copied 문안이 안 바뀌었다',
    PROMPT_FRAME.includes('그 낱말을 자기 문장으로 만들었으면 false, 구절째 놔뒀으면 true.') &&
    PROMPT_FRAME.includes('★ 4번 줄이 짧은 것은 true 의 근거가 아니다. 짧게 끊는 것은 권장되는 마무리다.'))
  t('v2: foreshadow_used 문안이 안 바뀌었다',
    PROMPT_FRAME.includes('지문에 [복선] 줄이 있을 때만 판정한다. 없으면 null.') &&
    PROMPT_FRAME.includes('1~3번 줄 중 하나라도 그 복선을 집어 쓰면 true, 한 번도 안 쓰면 false.'))
  t('v2: has_actor 문안이 안 바뀌었다',
    PROMPT_FRAME.includes('4번 줄에 인물의 행동이나 상태가 있으면 true, 사물·상황만 있는 명사구면 false.'))

  // 바뀐 곳 — v1 이 무너진 자리 셋을 각각 막는 문장이 실제로 들어 있는가.
  t('v2: C-1 을 막는다 (1번 줄도 판정)', PROMPT_FRAME.includes('1번 줄도 반드시 판정한다'))
  t('v2: C-2 를 막는다 (4번 줄 하나만)', PROMPT_FRAME.includes('2번 줄과 3번 줄 사이의 근거는 세지 않는다'))
  t('v2: C-4 를 막는다 (지시 해소는 false)', PROMPT_FRAME.includes('주어·주체·대상이 누구인지 모호해진다'))
  // v1 의 문장은 사라져야 한다. 남아 있으면 v1 과 v2 가 섞인 것이다.
  t('병: v1 의 delete 문안이 안 남아 있다',
    !PROMPT_FRAME.includes("★ 문장 연결이 어색해지는 것은 세지 않는다. 4번 줄의 근거가 사라지는지만 본다."))

  // why 계수기 — 판정에 안 쓰고 사람이 읽을 자리를 좁히는 데만 쓴다.
  t('why: C-4 말투를 집는다', looksLikeC4('2번 줄을 지우면 4번 창끝이 박힌 주체가 불분명해짐'))
  t('why: 근거를 댄 why 는 안 집는다', !looksLikeC4('3번의 얼음 소리가 4번 얼음 파쇄의 직접적 복선임'))

  // ★ 틀 길이는 **출력만 한다.** 수를 박으면 문안을 고칠 때마다 낡는다 —
  //   check:numbers 가 세운 규칙과 같다. v1 은 1,010자였다.
  console.log(`  틀 ${PROMPT_FRAME_CHARS}자 (v1 은 1,010자였다 — 비용 계산에 들어간다)`)

  // ── point 문안 ─────────────────────────────────────────────────────
  //
  // ★★ point 는 v2 를 **대신하지 않는다.** 곁에 둔다. Pro 에서 지목과 delete 를
  //   같이 돌려야 등급 탓인지가 갈리고, 그러려면 v2 가 살아 있어야 한다.
  //   그래서 아래 셋은 **양쪽 다** 문다 — v2 는 위에서, point 는 여기서.
  console.log('\n[point 문안]')
  t('point: cue_copied 문안이 v2 와 같다',
    PROMPT_FRAME_POINT.includes('그 낱말을 자기 문장으로 만들었으면 false, 구절째 놔뒀으면 true.') &&
    PROMPT_FRAME_POINT.includes('★ 4번 줄이 짧은 것은 true 의 근거가 아니다. 짧게 끊는 것은 권장되는 마무리다.'))
  t('point: foreshadow_used 문안이 v2 와 같다',
    PROMPT_FRAME_POINT.includes('지문에 [복선] 줄이 있을 때만 판정한다. 없으면 null.') &&
    PROMPT_FRAME_POINT.includes('1~3번 줄 중 하나라도 그 복선을 집어 쓰면 true, 한 번도 안 쓰면 false.'))
  t('point: has_actor 문안이 v2 와 같다',
    PROMPT_FRAME_POINT.includes('4번 줄에 인물의 행동이나 상태가 있으면 true, 사물·상황만 있는 명사구면 false.'))

  // 바뀐 곳 — 첫 항목 하나뿐이어야 한다.
  t('point: delete 문안이 안 들어 있다', !PROMPT_FRAME_POINT.includes('길이 3의 boolean 배열'))
  t('point: 최소로 든다를 적었다', PROMPT_FRAME_POINT.includes('최소로 든다'))
  t('point: 4번 줄 하나만 잰다 (C-2)',
    PROMPT_FRAME_POINT.includes('2번 줄과 3번 줄 사이의 근거는 세지 않는다'))
  t('point: 지시 해소는 근거가 아니다 (C-4)',
    PROMPT_FRAME_POINT.includes('4번 줄의 주어·주체·대상을 알려 준다'))

  // ★★ null 을 앞세우지 않는다. 앞세우면 남발하고, 그러면 축3(설계안 4-2-1)에
  //   걸려 축1의 수를 못 쓴다. `없다` 를 명시하는 P2 는 이것이 진 뒤에만 쓴다.
  t('point: null 안내가 마지막 줄에 있다',
    PROMPT_FRAME_POINT.indexOf('대지 못하면 null') >
      PROMPT_FRAME_POINT.indexOf('최소로 든다'))
  t('병: point 가 없어도 된다를 앞세우지 않는다',
    !PROMPT_FRAME_POINT.includes('없을 수도 있다') &&
    !PROMPT_FRAME_POINT.includes('억지로 하나를 고르지 마라'))

  // 파싱 — 고쳐 읽지 않는다. 꼴이 틀리면 틀렸다고 낸다.
  t('point 파싱: null 을 읽는다',
    parsePointObservation('{"support":null,"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":"x"}').ok)
  t('point 파싱: 1|2|3 을 읽는다',
    parsePointObservation('{"support":3,"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":"x"}').ok)
  t('point 파싱: 0 은 안 받는다',
    !parsePointObservation('{"support":0,"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":"x"}').ok)
  t('point 파싱: 4 는 안 받는다',
    !parsePointObservation('{"support":4,"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":"x"}').ok)
  t('point 파싱: 배열은 안 받는다 (delete 꼴)',
    !parsePointObservation('{"support":[false,true,false],"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":"x"}').ok)
  t('point 파싱: 코드펜스를 벗긴다',
    parsePointObservation('```json\n{"support":2,"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":"x"}\n```').ok)
  {
    const p = buildPointPrompt({ passage: '[상황] x', lines: ['a', 'b', 'c', 'd'], element: 'e' })
    t('point 조립: 치환자가 안 남는다', !/\{(passage|line[1-4]|element)\}/.test(p))
    t('point 조립: 네 줄이 다 들어간다', ['a', 'b', 'c', 'd'].every((l) => p.includes(l)))
  }
  console.log(`  틀 ${PROMPT_FRAME_POINT_CHARS}자 (v2 는 ${PROMPT_FRAME_CHARS}자다)`)

  // ★★ 두 문안이 실제로 다른가. 같으면 --prompt 를 갈아도 같은 것을 재게 된다.
  // ★ 리터럴 타입이라 tsc 가 `겹치지 않는다` 고 한다. 그 말이 곧 통과의 근거인데,
  //   런타임 검사로도 남긴다 — 나중에 누가 둘을 같게 만들면 여기서 걸려야 한다.
  t('point: v2 와 문안이 다르다', (PROMPT_FRAME_POINT as string) !== (PROMPT_FRAME as string))
  t('point: 틀 길이가 v2 와 다르다', PROMPT_FRAME_POINT_CHARS !== PROMPT_FRAME_CHARS)
  // ★ v2 는 point 를 넣은 뒤에도 그대로여야 한다. 12장의 수를 재현할 길이다.
  t('병: v2 에 support 가 안 섞였다', !PROMPT_FRAME.includes('support'))
  t('병: point 에 delete 배열이 안 섞였다', !PROMPT_FRAME_POINT.includes('"delete"'))

  // ── ★★★ 마개 이전(移轉) 검사 ─────────────────────────────────────
  //
  // v2 의 delete 문안은 C-1·C-2·C-4 를 각각 막는 문장 셋을 갖는다. point 로
  // 옮기며 **C-1 만 빠졌고**, support=1 이 180건에서 0건이 됐다(설계안 4-2-2).
  // ★★ 문안 결함이 아니라 이전 결함이다. 새 문안을 만들 때마다 **셋을 다**
  //   물어야 한다. 하나씩 검사하면 다음에도 하나가 빠진다.
  console.log('\n[마개 이전 — C-1·C-2·C-4]')
  const GUARDS: Array<[string, (f: string) => boolean]> = [
    ['C-1 1번 줄도 판정한다', (f) => /1번 줄도 (반드시 판정한다|후보다)/.test(f)],
    ['C-2 4번 줄 하나만 잰다', (f) => f.includes('2번 줄과 3번 줄 사이의 근거는 세지 않는다')],
    ['C-4 지시 해소는 근거가 아니다', (f) => /주어·주체·대상(이 누구인지 모호해진다|을 알려 준다)/.test(f)],
  ]
  for (const [name, has] of GUARDS) {
    t(`v2: ${name}`, has(PROMPT_FRAME))
    t(`point2: ${name}`, has(PROMPT_FRAME_POINT2))
  }
  // ★ point(P1)는 C-1 이 **빠진 채로 남는다.** 그것이 4-2-2 를 낸 문안이다.
  //   고치면 그 수를 낸 문안이 사라진다. 빠져 있다는 것을 검사가 기억한다.
  t('point(P1): C-1 이 빠져 있다 — 4-2-2 를 낸 문안이다',
    !/1번 줄도 (반드시 판정한다|후보다)/.test(PROMPT_FRAME_POINT))

  // point2 는 point 에서 한 줄만 다르다. 파생이라 구조로 보장되는데, 검사로도 문다.
  {
    const a = PROMPT_FRAME_POINT.split('\n')
    const b = PROMPT_FRAME_POINT2.split('\n')
    t('point2: point 에서 한 줄만 늘었다', b.length === a.length + 1)
    t('point2: 늘어난 줄이 C-1 마개다',
      b.filter((l) => !a.includes(l)).join('') === '   ★ 1번 줄도 후보다. 맨 앞이라 안 걸린다고 넘기지 마라.')
  }
  {
    const p = buildPoint2Prompt({ passage: '[상황] x', lines: ['a', 'b', 'c', 'd'], element: 'e' })
    t('point2 조립: 치환자가 안 남는다', !/\{(passage|line[1-4]|element)\}/.test(p))
  }
  console.log(`  틀 point ${PROMPT_FRAME_POINT_CHARS}자 · point2 ${PROMPT_FRAME_POINT2_CHARS}자`)

  // ── 프롬프트와 파싱 ────────────────────────────────────────────────
  //
  // ★ 프롬프트 문안의 단일 출처는 docs/AI심사_설계안.md 2-2 다. 여기서 재는 것은
  //   `문안이 옳은가` 가 아니라 `조립과 읽기가 새지 않는가` 다.
  const at0 = AT_ITEMS[0]
  const good0 = fourLines(at0.goods[0])
  t('프롬프트: 좋은 답안이 네 줄로 갈린다', good0 !== null)
  if (good0) {
    const p = buildPrompt({ passage: atPassageOf(at0), lines: good0, element: at0.element })
    t('프롬프트: 치환자가 하나도 안 남는다', !/\{(passage|line[1-4]|element)\}/.test(p))
    t('프롬프트: 네 줄이 다 들어간다', good0.every((l) => p.includes(l)))
    t('프롬프트: 지문과 요소가 들어간다', p.includes(at0.elementCue) && p.includes(at0.element))
    // ★ 지문의 why 는 안 준다. 학습자가 못 본 것을 AI 에만 주면 AI 가 유리한
    //   자리에서 재게 된다(설계안 7장 `지문의 why 를 AI 에 주기`).
    t('프롬프트: 지문의 why 는 안 들어간다', !p.includes(at0.why))
  }
  // 병: 줄 수가 넷이 아니면 null. 조용히 채우거나 자르지 않는다.
  t('병: 세 줄이면 조립을 거부한다', fourLines('가\n나\n다') === null)
  t('병: 다섯 줄이면 조립을 거부한다', fourLines('가\n나\n다\n라\n마') === null)
  t('요소: requireInLastLine 이 단일 출처다', elementOf(actionCfgOf(at0)) === at0.element)

  const goodJson = '{"delete":[true,false,true],"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":"근거"}'
  const parsedGood = parseObservation(goodJson)
  t('관측: 바른 JSON 을 읽는다', parsedGood.ok)
  t('관측: 코드펜스를 둘러도 읽는다', parseObservation('```json\n' + goodJson + '\n```').ok)
  // ★ 고쳐 읽지 않는다. 꼴이 틀리면 틀렸다고 낸다 — 조용히 기우면 흔들림
  //   측정에서 그 건이 정상으로 보인다.
  t('병: JSON 이 아니면 not_json', !parseObservation('네, 판정하겠습니다').ok)
  t('병: delete 가 둘이면 bad_shape',
    !parseObservation('{"delete":[true,false],"cue_copied":false,"foreshadow_used":null,"has_actor":true,"why":""}').ok)
  t('병: cue_copied 가 문자열이면 bad_shape',
    !parseObservation('{"delete":[true,false,true],"cue_copied":"false","foreshadow_used":null,"has_actor":true,"why":""}').ok)
  // ★ foreshadow_used 는 null 을 받아야 한다. 난이도 1 지문에는 [복선] 이 없다.
  t('관측: foreshadow_used 가 null 이어도 읽는다', parsedGood.ok)

  // 합격선은 코드에 있고, **지금 아무도 안 부른다**(T 미결). 식만 물어 둔다.
  if (parsedGood.ok) {
    const o = parsedGood.observation
    t('합격선: load 가 T 를 넘으면 통과 (T=2)', passesAt(o, 2))
    t('합격선: load 가 T 에 모자라면 탈락 (T=3)', !passesAt(o, 3))
    t('합격선: cue_copied 면 T 와 무관하게 탈락',
      !passesAt({ ...o, cue_copied: true }, 1))
    // ★ foreshadow_used !== false 다. === true 로 쓰면 난이도 1 전량이 떨어진다.
    t('합격선: foreshadow_used=false 면 탈락', !passesAt({ ...o, foreshadow_used: false }, 1))
    t('합격선: foreshadow_used=null 은 통과한다 (난이도 1)', passesAt({ ...o, foreshadow_used: null }, 1))
    // ★★ has_actor 는 합격선에 없다. 넣으면 좋은 답안 7건이 죽는다(설계안 3-4).
    t('합격선: has_actor 는 판정을 안 바꾼다',
      passesAt({ ...o, has_actor: false }, 2) === passesAt({ ...o, has_actor: true }, 2))
  }

  // ── 비용 환산 ──────────────────────────────────────────────────────
  const usage = { inputTokens: 1000, cachedTokens: 0, outputTokens: 100 }
  const c = costUsd('gemini-3.7-flash', usage)
  // 1000 × 0.75/1M + 100 × 3.75/1M = 0.00075 + 0.000375
  t('비용: 잰 토큰을 단가로 환산한다', c === 0.001125, `${c}`)
  // ★ 모르는 모델은 0 이 아니라 null 이다. 0 을 내면 모델 이름 하나 바뀐 것만으로
  //   지출 상한이 통째로 새고 아무도 모른다.
  t('병: 모르는 모델이면 null 을 낸다', costUsd('gemini-9-flash', usage) === null)
  const cached = costUsd('gemini-3.7-flash', { inputTokens: 1000, cachedTokens: 800, outputTokens: 100 })
  t('비용: 캐시 적중분은 싼 단가로 센다', cached !== null && c !== null && cached < c)

  // ── 호출 없이 전 구간 ──────────────────────────────────────────────
  //
  // ★ 가짜 호출로 조립 → 파싱 → 환산 → 결과까지 한 번에 문다. 여기까지가
  //   네트워크 없이 재는 전부다. gemini.ts 만 남는다.
  if (good0) {
    const input = { passage: atPassageOf(at0), lines: good0, element: at0.element }
    const fakeUsage = { inputTokens: 1200, cachedTokens: 0, outputTokens: 120 }

    tAsync('전 구간: 성공하면 관측과 비용이 함께 나온다', async () => {
      const r = await observeWith(
        async () => ({ text: goodJson, usage: fakeUsage, model: 'gemini-3.7-flash' }),
        input, 'gemini-3.7-flash')
      return r.ok && r.observation !== null && r.costUsd !== null
    })

    // 병: 호출이 던지면 usage 가 없다 — 태운 토큰이 없으니 적을 것도 없다.
    tAsync('병: 호출이 실패하면 call_failed 이고 usage 가 없다', async () => {
      const r = await observeWith(async () => { throw new Error('네트워크') }, input, 'gemini-3.7-flash')
      return !r.ok && r.error === 'call_failed' && r.usage === null && r.costUsd === null
    })

    // ★★ 병: 실패는 **내용을 실어 와야 한다.** `call_failed` 만 오면 왜 실패했는지
    //    모른다 — 4-7장의 `head: true` 와 같은 병을 observe.ts 가 저지르고 있었다.
    //    실제로 첫 --n=10 이 `★ call_failed` 만 열 줄 찍고 끝났다.
    tAsync('병: 실패하면 던진 내용이 실려 온다', async () => {
      const r = await observeWith(async () => { throw new Error('네트워크가 끊겼다') }, input, 'gemini-3.7-flash')
      return !r.ok && !!r.detail && r.detail.includes('네트워크가 끊겼다')
    })

    // Error 가 아닌 것을 던져도 버리지 않는다. SDK 가 늘 Error 를 던지지는 않는다.
    tAsync('병: Error 가 아닌 것을 던져도 내용이 남는다', async () => {
      const r = await observeWith(async () => { throw { status: 404 } }, input, 'gemini-3.7-flash')
      return !r.ok && !!r.detail && r.detail.includes('404')
    })

    // ★★ 병: 모델이 헛소리를 뱉어도 **비용은 나온다.** 토큰은 태웠다.
    //    이게 안 나오면 파싱이 깨진 호출만큼 지출 상한이 덜 센다.
    tAsync('병: 관측이 깨져도 비용은 나온다', async () => {
      const r = await observeWith(
        async () => ({ text: '음... 판정이 어렵습니다', usage: fakeUsage, model: 'gemini-3.7-flash' }),
        input, 'gemini-3.7-flash')
      return !r.ok && r.error === 'not_json' && r.costUsd !== null
    })
  }
}

console.log('\n[docs ↔ README 대조]')
{
  // docs/README.md 가 '살아 있는 것' 을 가린다. 그것이 없는 파일을 가리키거나
  // 있는 파일을 안 가리키면 README 가 거짓말을 한다 — 그런데 test:scoring 도
  // check:numbers 도 그걸 안 본다. `git status` 로만 보이던 자리다.
  //
  // ★ 두 방향을 다 잰다. 한 방향만 재면 정규식이 덜 잡아도 통과한다.
  //   셸 한 줄(grep -oE '[가-힣...]')로 두면 로케일에 따라 조용히 덜 잡는다.
  //   실제로 한 쪽 환경에서 'Invalid collation character' 로 죽고 다른 쪽에서는
  //   일부만 뽑혔다. 방향 2 가 그 미탐을 잡는다.
  const docsDir = path.join(__dirname, '..', '..', 'docs')
  const readme = readFileSync(path.join(docsDir, 'README.md'), 'utf8')
  const named = [...new Set([...readme.matchAll(/([^\s`'"()]+\.md)/g)].map((m) => m[1]))]
    .filter((f) => f !== 'README.md')
  const onDisk = readdirSync(docsDir).filter((f) => f.endsWith('.md') && f !== 'README.md')

  const missing = named.filter((f) => !existsSync(path.join(docsDir, f)))
  t('README 가 가리키는 문서가 전부 실재한다', missing.length === 0,
    `없는 것=${JSON.stringify(missing)}`)

  const unlisted = onDisk.filter((f) => !named.includes(f))
  t('docs 의 문서가 전부 README 에 있다', unlisted.length === 0,
    `안 가리키는 것=${JSON.stringify(unlisted)}`)
}

// ★ 비동기 단언을 먼저 기다린다. 이 파일은 CJS 로 돌아 top-level await 이 없다 —
//   .then 으로 미룬다. 여기서 안 기다리면 위의 전 구간 검사가 세어지기 전에
//   최종 줄이 찍히고, **0 실패에 종료 코드 0** 으로 조용히 지나간다.
//
// ★ .catch 가 있어야 한다. 명단의 promise 가 던지면 unhandled rejection 이 되고
//   최종 줄이 **아예 안 찍힌다.** 종료 코드는 1이라 위험하진 않지만 `tail -1` 만
//   보는 절차에서는 오류 줄만 보인다. 던진 것도 실패 하나로 세고 최종 줄은 찍는다.
void Promise.all(aiChainChecks)
  .catch((e) => {
    fail++
    console.log(`  ✗ 비동기 단언이 던졌다: ${e instanceof Error ? e.message : String(e)}`)
  })
  .then(() => {
    // 여기서부터 t 는 봉인된다. 늦게 오는 단언은 세어지는 대신 죽는다.
    sealed = true
    console.log(
      `\n최종: ${pass} 통과 / ${fail} 실패` +
        (morphSkipped > 0 ? ` / 형태소 검사 ${morphSkipped}건 건너뜀(서버 없음)` : '')
    )
    if (fail > 0) process.exit(1)
  })
