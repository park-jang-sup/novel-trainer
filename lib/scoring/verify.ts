// combine을 index.ts에서 그대로 가져온다.
// 사본을 만들지 않는다 — 검증한 코드와 출하하는 코드가 갈라지면 안 된다.
// remote.ts(server-only)는 index.ts가 import하지 않으므로 순수 Node에서 돌아간다.
//
// 실행: npm run test:scoring

import { combine, findForbidden, mergeForbidChecks } from './index'
import type { Answer, Check, MorphResult, Problem } from './types'
import { CONVERT_SEEDS } from './fixtures/convert-seeds'

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
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '2개', evidence: ['눈앞에', '모습이'], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'fail', detail: '1개', evidence: ['내려다보았다'], gating: true },
  ])
  t(
    '2건+1건 → Check 1개, evidence 3개, fail',
    m1.length === 1 && m1[0].evidence?.length === 3 && m1[0].status === 'fail',
    JSON.stringify(m1)
  )

  // 2) forbidWords pass + forbidLemmas fail → fail
  const m2 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'pass', detail: '없음', evidence: [], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'fail', detail: '1개', evidence: ['내려다보았다'], gating: true },
  ])
  t('pass + fail → fail', m2[0].status === 'fail', `실제=${m2[0].status}`)

  // 3) forbidWords fail + forbidLemmas pending → fail (pending이 fail을 덮지 않음)
  const m3 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '1개', evidence: ['눈앞에'], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'pending', detail: '형태소 분석 대기' },
  ])
  t('fail + pending → fail (pending이 덮지 않음)', m3[0].status === 'fail', `실제=${m3[0].status}`)

  // 4) forbidWords pass + forbidLemmas pending → pending
  const m4 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'pass', detail: '없음', evidence: [], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'pending', detail: '형태소 분석 대기' },
  ])
  t('pass + pending → pending', m4[0].status === 'pending', `실제=${m4[0].status}`)

  // 5) forbidWords만 있고 forbidLemmas 없음 → 입력과 같은 배열 내용, key 유지
  const only: Check[] = [
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '1개', evidence: ['눈앞에'], gating: true },
  ]
  const m5 = mergeForbidChecks(only)
  t(
    'forbidLemmas 없으면 입력과 동일, key는 forbidWords',
    JSON.stringify(m5) === JSON.stringify(only) && m5[0].key === 'forbidWords',
    JSON.stringify(m5)
  )

  // 6) 두 evidence에 같은 어절이 있으면 합친 evidence에 1개만
  const m6 = mergeForbidChecks([
    { key: 'forbidWords', label: '쓰지 않을 말', status: 'fail', detail: '1개', evidence: ['눈앞에'], gating: true },
    { key: 'forbidLemmas', label: '쓰지 않을 말', status: 'fail', detail: '1개', evidence: ['눈앞에'], gating: true },
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

console.log(`\n최종: ${pass} 통과 / ${fail} 실패`)
if (fail > 0) process.exit(1)
