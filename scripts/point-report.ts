/**
 * 지목(point) 회차 리포트. **`ai-report.ts` 와 안 묶는다** —
 * 묶으면 한쪽을 고칠 때 다른 쪽이 흔들린다. `load` 열두 자리는 그대로 살아 있어야
 * `data/probe` 11개를 계속 센다.
 *
 * ★ 판정선은 `docs/AI심사_설계안.md` 4-2-1 이 단일 출처다. 여기서 선을 옮기지 마라.
 *
 *   npx tsx scripts/point-report.ts data/probe/p1.json [p2.json ...]
 */
import { readFileSync } from 'node:fs'
import type { PointObservation } from '../lib/ai/prompt'

type Row = {
  sourceKey: string
  kind: string
  detail: string
  prompt?: string
  outcome: { ok: boolean; observation: PointObservation | null; error: string | null }
}

const files = process.argv.slice(2)
if (files.length === 0) { console.error('회차 파일을 하나 이상 줘라'); process.exit(1) }
const runs: Row[][] = files.map((f) => JSON.parse(readFileSync(f, 'utf-8')))

// ★★ 한 문안만 있어야 한다. point 와 point2 는 C-1 마개 한 문장이 다르고,
//   섞어 세면 무엇을 쟀는지 모른다. **어느 쪽이든 받되 섞이면 멈춘다.**
const PROMPTS = new Set<string>()
for (const [i, r] of runs.entries()) {
  const bad = r.filter((x) => x.prompt !== undefined && x.prompt !== 'point' && x.prompt !== 'point2')
  if (bad.length) { console.error(`★ ${files[i]} 에 지목 문안이 아닌 행이 ${bad.length}건 있다`); process.exit(1) }
  for (const x of r) if (x.prompt !== undefined) PROMPTS.add(x.prompt)
  if (r.some((x) => x.prompt === undefined)) console.error(`★ ${files[i]} 에 prompt 가 안 실려 있다 (옛 형식)`)
}
if (PROMPTS.size > 1) {
  console.error(`★★ 문안이 섞였다: ${[...PROMPTS].join(' · ')} — 섞어 세면 무엇을 쟀는지 모른다`)
  process.exit(1)
}
const PROMPT = [...PROMPTS][0] ?? '(안 실림)'

const key = (x: Row) => x.sourceKey + '|' + x.kind
const KINDS = ['good', '낱낱 나열', '빌드업 없이 압축', '지문의 결정타 줄을 그대로 마지막 줄에', '전용 복선미사용']

const sup = (x: Row) => (x.outcome.ok && x.outcome.observation ? x.outcome.observation.support : undefined)

// ── 파싱 ──────────────────────────────────────────────────────────
console.log(`회차 ${runs.length} · 문안 ${PROMPT} · 파일 ${files.join(' ')}`)
for (const [i, r] of runs.entries()) {
  const ok = r.filter((x) => x.outcome.ok).length
  console.log(`  ${files[i]}  관측 ${ok}/${r.length}`)
}

// ── 축 1 · 축 3 ───────────────────────────────────────────────────
console.log('\n[축 1] null 을 낸 건수 (회차 다수결)')
const base = runs[0]
const nullMaj = (k: string) => {
  const vs = runs.map((r) => r.find((x) => key(x) === k)).map((x) => (x ? sup(x) : undefined))
  const seen = vs.filter((v) => v !== undefined)
  const n = seen.filter((v) => v === null).length
  return { maj: n * 2 > seen.length, n, of: seen.length }
}
let nullTotal = 0, seenTotal = 0
for (const kind of KINDS) {
  const g = base.filter((x) => x.kind === kind)
  if (!g.length) continue
  const m = g.map((x) => nullMaj(key(x)))
  const cnt = m.filter((x) => x.maj).length
  console.log(`  ${kind.padEnd(26)} n=${g.length}  null ${cnt}/${g.length}`)
}
for (const r of runs) for (const x of r) { const s = sup(x); if (s !== undefined) { seenTotal++; if (s === null) nullTotal++ } }
console.log(`\n[축 3] 전체 null 비율  ${nullTotal}/${seenTotal} = ${(nullTotal / seenTotal * 100).toFixed(1)}%  (40% 초과면 축1의 수를 못 쓴다)`)

// ── 축 2 ──────────────────────────────────────────────────────────
if (runs.length >= 2) {
  let all = 0, maj4 = 0
  for (const x of base) {
    const vs = runs.map((r) => r.find((y) => key(y) === key(x))).map((y) => (y ? sup(y) : undefined))
    const seen = vs.filter((v) => v !== undefined)
    if (seen.length < runs.length) continue
    const first = seen[0]
    const same = seen.filter((v) => v === first).length
    if (same === seen.length) all++
    if (same >= seen.length - 1) maj4++
  }
  console.log(`\n[축 2] 5회 내내 같은 줄  ${all}/${base.length}   (판정선 ≥27. load 는 22/36)`)
  console.log(`       4회 이상 같은 줄  ${maj4}/${base.length}   (참고)`)
}

// ── 흔들림이 몰렸는가 ─────────────────────────────────────────────
// ★ delete 는 갈린 14건이 지문 8건에 고르게 퍼져 있었다(3·3·2·2·1·1·1·1).
//   표본 몇 건이 이상한 것이 아니라 관측 자체가 떠는 것이다.
//   지목도 같은 각도로 본다 — 몰려 있으면 표본 쪽을 봐야 한다.
if (runs.length >= 2) {
  const bySrc = new Map<string, number>()
  const byKind = new Map<string, number>()
  for (const x of base) {
    const vs = runs.map((r) => r.find((y) => key(y) === key(x))).map((y) => (y ? sup(y) : undefined))
    const seen = vs.filter((v) => v !== undefined)
    if (seen.length < runs.length) continue
    if (seen.every((v) => v === seen[0])) continue
    bySrc.set(x.sourceKey, (bySrc.get(x.sourceKey) ?? 0) + 1)
    byKind.set(x.kind, (byKind.get(x.kind) ?? 0) + 1)
  }
  console.log('\n[흔들림이 몰렸는가]  ★ 몰려 있으면 표본 쪽을 봐라')
  console.log('  지문별  ' + [...bySrc.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' · '))
  console.log('  갈래별  ' + [...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' · '))
}

// ── good 의 지목 줄 — 정답지가 생기면 다시 센다 ──────────────────────
console.log('\n[good 여덟] 지목한 줄 — ★ 지금은 정오를 못 잰다. 정답지가 생기면 다시 센다')
for (const x of base.filter((y) => y.kind === 'good')) {
  const vs = runs.map((r) => r.find((y) => key(y) === key(x))).map((y) => (y ? sup(y) : '-'))
  console.log(`  ${x.sourceKey.padEnd(18)} ${JSON.stringify(vs)}`)
}
