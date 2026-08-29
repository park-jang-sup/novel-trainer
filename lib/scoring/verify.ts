// combine을 index.ts에서 그대로 가져온다.
// 사본을 만들지 않는다 — 검증한 코드와 출하하는 코드가 갈라지면 안 된다.
// remote.ts(server-only)는 index.ts가 import하지 않으므로 순수 Node에서 돌아간다.
//
// 검사는 두 방향이다. 오탐(좋은 답안이 걸리는가)과 미검출(나쁜 답안이
// 통과하는가). 세션 4까지는 오탐만 봤다.
//
// 실행: npm run test:scoring

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { combine, findForbidden, mergeForbidChecks, gradeLocal, pendingMorphChecks } from './index'
import { sqlStr, countRawNewlinesInStrings } from '../seed-sql'
import type { Answer, Check, MorphResult, Problem, ProblemType, ScoringConfig, ScoringMode } from './types'
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

let pass = 0
let fail = 0
function t(name: string, cond: boolean, extra = '') {
  if (cond) pass++
  else {
    fail++
    console.log(`  ✗ ${name} ${extra}`)
  }
}

const emptyMorph = (o: Partial<MorphResult> = {}): MorphResult => ({
  adverbs: [], modifiers: [], verbs: [], propers: [], repeats: [], lemmas: [], sentences: 1, ...o,
})

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

// ── 불변식: 덤프 53문항 전부가 자기 forbidWords/forbidLemmas에 걸리는가 ──
//
// seed_verify.sql의 불변식 2와 같은 것을 TS 쪽에서도 본다. DB에 실제로
// 적용해 보지 않고도(DB 명령은 여기서 금지되어 있다) 여기서 먼저 잡을 수
// 있다. CONVERT_SEEDS의 6문항과 대상이 겹치지만, 지금은 그대로 둔다 —
// 중복 제거는 다음 작업의 몫이다.
console.log('\n[불변식: 덤프 53문항이 자기 forbidWords/forbidLemmas에 걸림]')
{
  interface DumpProblem {
    passage: string | null
    source_key: string
    scoring_config: { forbidWords?: string[]; forbidLemmas?: string[] }
  }

  const dumpPath = path.join(__dirname, '..', '..', 'seed', 'dump', 'problems.json')
  // Node는 BOM을 자동으로 벗기지 않는다. scripts/gen-seed.ts의 readJson과 같은 처리.
  const raw = readFileSync(dumpPath, 'utf8').replace(/^\uFEFF/, '')
  const dumpProblems: DumpProblem[] = JSON.parse(raw)

  const skipped: string[] = []
  for (const dp of dumpProblems) {
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
    // 4/12 가 되어 난이도 1의 3/11 과 비교가 깨진다.
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

console.log(`\n최종: ${pass} 통과 / ${fail} 실패`)
if (fail > 0) process.exit(1)
