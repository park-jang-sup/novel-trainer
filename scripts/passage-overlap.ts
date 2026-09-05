/**
 * 원문 겹침(3-gram) 임계 실측 — MAX_ECHO 절차(세션 42, 박 님 조건).
 *
 * ★ 코드를 먼저 안 짠다. 임계를 박기 전에 분포부터 찍는다:
 *   (a) 활성 forbidPassageCopy 문항 모범답안 전부 — 좋은 답안의 최댓값(G)
 *   (b) 박 님 뚫기 2건 + (c) 합성 공격 4종 — 공격의 최솟값(A)
 *   G 와 A 사이(폭이 있어야 가른다)에 임계를 중점(소수 둘째 자리)으로 둔다.
 *   pov-lock.ts MAX_ECHO 와 같은 경계 규율 — 좋은 답안이 임계에 닿으면
 *   폭이 준 것이니 다시 잰다.
 *
 * DB·네트워크를 안 탄다 — seed/dump/*.json 만 읽는다.
 * 실행: npx tsx scripts/passage-overlap.ts
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { charGrams, passageOverlap, splitSentences } from '../lib/scoring/local'

interface DumpProblem {
  source_key: string
  passage: string | null
  scoring_config: {
    forbidPassageCopy?: boolean
    passageCopyKeep?: number
    requireAll?: string[]
    requireAny?: string[]
  }
}
interface RefRow {
  source_key: string
  ord: number
  content: string
}

const root = path.join(__dirname, '..')
const readJson = <T,>(rel: string): T =>
  JSON.parse(readFileSync(path.join(root, rel), 'utf8').replace(/^﻿/, '')) as T

const problems = readJson<DumpProblem[]>('seed/dump/problems.json')
const deactivate = readJson<{ source_keys: string[] }>('seed/dump/deactivate.json')
const deadKeys = new Set(deactivate.source_keys)
const answers = readJson<{ reference?: RefRow[] }>('seed/dump/answers.json')

const active = problems.filter((p) => !deadKeys.has(p.source_key))
const fpc = active.filter((p) => p.scoring_config.forbidPassageCopy)
const fpcByKey = new Map(fpc.map((p) => [p.source_key, p]))
const refs = (answers.reference ?? []).filter((r) => fpcByKey.has(r.source_key))

/**
 * 겹침 3-gram 중 요구 이름(requireAll·requireAny) 언저리(이름 앞뒤 2자)에서
 * 나온 몫 — 진짜 원문 베낌이 아니라 이름이 우연히 원문과 겹쳐서 생긴
 * 부풀림을 가늠하는 진단 열이다. 실제 채점 로직(local.ts)에는 안 들어간다.
 */
function nameHitFraction(answer: string, passage: string, names: string[], keep: number): number {
  if (names.length === 0) return 0
  const cleanAnswer = answer.replace(/[^가-힣A-Za-z0-9]/g, '')
  const passageGrams = charGrams(splitSentences(passage).slice(keep).join(' '))
  const spans: [number, number][] = []
  for (const name of names) {
    let from = 0
    while (true) {
      const i = cleanAnswer.indexOf(name, from)
      if (i === -1) break
      spans.push([Math.max(0, i - 2), Math.min(cleanAnswer.length, i + name.length + 2)])
      from = i + name.length
    }
  }
  let totalHits = 0
  let nameHits = 0
  for (let i = 0; i + 3 <= cleanAnswer.length; i++) {
    const g = cleanAnswer.slice(i, i + 3)
    if (!passageGrams.has(g)) continue
    totalHits++
    if (spans.some(([s, e]) => i >= s && i + 3 <= e)) nameHits++
  }
  return totalHits > 0 ? nameHits / totalHits : 0
}

console.log(`활성 forbidPassageCopy 문항 ${fpc.length}건 · 모범답안 ${refs.length}행`)
console.log('\n=== (a) 모범답안 겹침 — 내림차순 ===')
const rows = refs.map((r) => {
  const p = fpcByKey.get(r.source_key)!
  const keep = p.scoring_config.passageCopyKeep ?? 0
  const overlap = passageOverlap(r.content, p.passage ?? '', keep)
  const names = [...(p.scoring_config.requireAll ?? []), ...(p.scoring_config.requireAny ?? [])]
  const nameFrac = nameHitFraction(r.content, p.passage ?? '', names, keep)
  return { key: r.source_key, ord: r.ord, overlap, nameFrac }
})
rows.sort((a, b) => b.overlap - a.overlap)
for (const r of rows) {
  console.log(
    `  ${r.key.padEnd(24)} ord${r.ord}  겹침=${r.overlap.toFixed(4)}  이름몫=${r.nameFrac.toFixed(4)}`
  )
}
const overlaps = rows.map((r) => r.overlap).sort((a, b) => a - b)
const G = overlaps[overlaps.length - 1]
const median = overlaps[Math.floor(overlaps.length / 2)]
console.log(`\n  건수=${rows.length}  최댓값(G)=${G.toFixed(4)}  중앙값=${median.toFixed(4)}`)

// ── (b) 박 님 뚫기 2건 — bt-spear-range 원문 기준 ──
const spearPassage = fpcByKey.get('bt-spear-range')!.passage ?? ''
console.log(`\nbt-spear-range 원문: "${spearPassage}"`)

const breach1 = spearPassage.replace('왼팔', '') // 왼팔 삭제(세션 41 후속 2 픽스처와 같은 구성)
const breach2 =
  '곽무영의 창은음 거리를 지켰다이 들어가면 창끝이 찌르고, 물러서면 창대가 따라와 후렸다. 세 합 만에 서린의 소매가 갈라졌다. 창은 거리 싸움이었다.' // 뭉개기(박 님 제공)

console.log('\n=== (b) 박 님 뚫기 2건 ===')
const breaches = [
  { name: '왼팔 삭제', text: breach1 },
  { name: '뭉개기', text: breach2 },
]
for (const b of breaches) {
  console.log(`  ${b.name}  겹침=${passageOverlap(b.text, spearPassage, 0).toFixed(4)}  "${b.text}"`)
}

// ── (c) 합성 공격 4종 — bt-spear-range 원문으로 합성(이 세션에서 만든 것) ──
const S1 = '곽무영의 창은 세 걸음 거리를 지켰다.'
const S2 = '백서린이 들어가면 창끝이 찌르고, 물러서면 창대가 따라와 후렸다.'
const S3 = '세 합 만에 서린의 왼팔 소매가 갈라졌다.'
const S4 = '창은 거리 싸움이었다.'

console.log('\n=== (c) 합성 공격 4종 ===')
const attacks = [
  { name: '중간 삭제', text: `${S1} 백서린이 들어가면 창끝이 찌르고 후렸다. ${S3} ${S4}` },
  { name: '문장 순서 바꿈', text: `${S3} ${S1} ${S4} ${S2}` },
  {
    name: '어미 바꾸기',
    text:
      '곽무영의 창은 세 걸음 거리를 지켰었다. 백서린이 들어가면 창끝이 찌르고, 물러서면 창대가 따라와 후렸었다. 세 합 만에 서린의 왼팔 소매가 갈라졌었다. 창은 거리의 싸움이었다.',
  },
  { name: '이름 덧붙이기', text: `${S1} ${S2} ${S3} ${S4} 무영과 서린의 대결이었다.` },
]
for (const a of attacks) {
  console.log(`  ${a.name}  겹침=${passageOverlap(a.text, spearPassage, 0).toFixed(4)}  "${a.text}"`)
}

const allAttackOverlaps = [
  ...breaches.map((b) => passageOverlap(b.text, spearPassage, 0)),
  ...attacks.map((a) => passageOverlap(a.text, spearPassage, 0)),
]
const A = Math.min(...allAttackOverlaps)
const threshold = Math.round(((G + A) / 2) * 100) / 100

console.log('\n=== 판정 ===')
console.log(`  G(좋은 답안 최댓값) = ${G.toFixed(4)}`)
console.log(`  A(공격 최솟값)     = ${A.toFixed(4)}`)
console.log(`  폭(A − G)          = ${(A - G).toFixed(4)}`)
console.log(`  임계(중점, 소수 둘째) = ${threshold}`)
if (A <= G) {
  console.log('  ★★ 폭이 없거나 음수다 — 이 임계로는 못 가른다. 검사·표본을 다시 봐라.')
}
