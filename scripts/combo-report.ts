/**
 * `delete + 지목` 결합 리포트. **새 호출 0 · $0** — 이미 잰 두 회차를 교차한다.
 *
 * ★ 판정선은 `docs/archive/AI심사_설계안.md` 4-2-5 가 단일 출처다. **여기서 선을 옮기지 마라.**
 *   `point-report.ts` 가 4-2-1 에 대해 같은 말을 적어 둔 것과 같은 이유다.
 *
 * ★★ `ai-report.ts` · `point-report.ts` 와 안 묶는다. 셋이 각각 다른 물음을 센다 —
 *   묶으면 한쪽을 고칠 때 다른 쪽이 흔들린다(세션 15 §14).
 *
 *   npx tsx scripts/combo-report.ts            # P1 · P1b 둘 다
 *   npx tsx scripts/combo-report.ts --point=P1 # 하나만
 */
import { readFileSync } from 'node:fs'
import type { Observation, PointObservation } from '../lib/ai/prompt'

// ── 회차 — 4-2-5 가 못 박은 열 개 파일 ────────────────────────────
const DELETE_RUNS = ['v2', 'v2b', 'v23', 'v24', 'v25']
const POINT_RUNS: Record<string, string[]> = {
  P1: ['p1', 'p2', 'p3', 'p4', 'p5'],
  P1b: ['q1', 'q2', 'q3', 'q4', 'q5'],
}

// ── 판정선 — 4-2-5 에서 옮긴 것이다. 고치려면 문서를 먼저 고쳐라 ──
const LINE = {
  낱낱: 7, // ≥7/8
  낱낱재계산: 6, // delete[0] 을 뺀 load 로 다시 세도 ≥6/8 — 선택이 아니라 조건이다
  압축: 6, // ≥6/8
  good: 2, // ≤2/8
  축2: 22, // 결합 S 가 5회 내내 같은 건수 ≥22/36 (delete 단독값)
  등급: 6, // 3계급을 세웠다고 말하려면 무리마다 ≥6/8
}
const MIN_VALID = 3 // 유효 회차가 3회 미만인 건은 판정 불가로 뺀다 (4-2-5 파싱 실패 규칙)

const KINDS = {
  낱낱: '낱낱 나열',
  압축: '빌드업 없이 압축',
  good: 'good',
  cue: '지문의 결정타 줄을 그대로 마지막 줄에',
  복선: '전용 복선미사용',
} as const

type DRow = { sourceKey: string; kind: string; outcome: { observation: Observation | null } }
type PRow = { sourceKey: string; kind: string; prompt?: string; outcome: { ok: boolean; observation: PointObservation | null } }

const read = <T,>(f: string): T[] => JSON.parse(readFileSync(`data/probe/${f}.json`, 'utf8')) as T[]
const key = (x: { sourceKey: string; kind: string }) => x.sourceKey + '|' + x.kind

// 신호 둘. **둘 다 나쁨 신호다**(빌드업이 없다).
const l0 = (o: Observation) => o.delete.filter(Boolean).length === 0
const l0x = (o: Observation) => !o.delete[1] && !o.delete[2] // ★ delete[0] 을 뺀 load
const nul = (o: PointObservation) => o.support === null

/** 유효 회차만으로 과반. 동수는 false — `point-report` 와 같은 잣대다. */
const maj = (vs: boolean[]) => vs.filter(Boolean).length * 2 > vs.length

const pct = (a: number, b: number) => `${a}/${b}`
const mark = (ok: boolean) => (ok ? '✓' : '✗')

function run(pointName: string) {
  const dRuns = DELETE_RUNS.map((f) => read<DRow>(f))
  const pRuns = POINT_RUNS[pointName].map((f) => read<PRow>(f))

  // ★ 문안이 섞이면 무엇을 쟀는지 모른다 — `point-report` 와 같은 마개다.
  const prompts = new Set(pRuns.flatMap((r) => r.map((x) => x.prompt)).filter((p) => p !== undefined))
  if (prompts.size > 1) {
    console.error(`★★ 지목 문안이 섞였다: ${[...prompts].join(' · ')}`)
    process.exit(1)
  }

  const base = dRuns[0]
  console.log(`\n${'='.repeat(70)}`)
  console.log(`[${pointName}]  delete ${DELETE_RUNS.join('·')}  ×  지목 ${POINT_RUNS[pointName].join('·')}  (문안 ${[...prompts][0] ?? '(안 실림)'})`)

  // ── 파싱 실패 — 미리 박은 규칙대로 센다 ────────────────────────
  const dFail = dRuns.map((r) => r.filter((x) => !x.outcome.observation).length)
  const pFail = pRuns.map((r) => r.filter((x) => !(x.outcome.ok && x.outcome.observation)).length)
  console.log(`\n[파싱 실패]  delete ${dFail.join('·')}  ·  지목 ${pFail.join('·')}   (건/36)`)

  // 건별 회차값을 모은다. 실패는 undefined 로 남긴다 — 기권이지 0이 아니다.
  const dOf = (k: string) => dRuns.map((r) => r.find((x) => key(x) === k)?.outcome.observation ?? undefined)
  const pOf = (k: string) =>
    pRuns.map((r) => {
      const x = r.find((y) => key(y) === k)
      return x && x.outcome.ok && x.outcome.observation ? x.outcome.observation : undefined
    })

  type Cell = {
    kind: string
    sourceKey: string
    valid: boolean
    L0: boolean
    L0x: boolean
    Nn: boolean
    S: number
    Sx: number // delete[0] 을 뺀 load 로 다시 센 S
    perRound: (number | undefined)[] // 회차별 S
    dStable: boolean
    pStable: boolean
  }

  const cells: Cell[] = base.map((b) => {
    const k = key(b)
    const ds = dOf(k)
    const ps = pOf(k)
    const dv = ds.filter((o): o is Observation => !!o)
    const pv = ps.filter((o): o is PointObservation => !!o)
    const valid = dv.length >= MIN_VALID && pv.length >= MIN_VALID
    const L0 = maj(dv.map(l0))
    const L0x = maj(dv.map(l0x))
    const Nn = maj(pv.map(nul))
    // 축 2 — 회차를 인덱스로 맞물린다. 한쪽이라도 실패한 회차는 undefined 다.
    const perRound = ds.map((o, i) => {
      const p = ps[i]
      if (!o || !p) return undefined
      return (l0(o) ? 1 : 0) + (nul(p) ? 1 : 0)
    })
    const allSame = <T,>(vs: (T | undefined)[]) => vs.every((v) => v !== undefined) && new Set(vs).size === 1
    return {
      kind: b.kind,
      sourceKey: b.sourceKey,
      valid,
      L0,
      L0x,
      Nn,
      S: (L0 ? 1 : 0) + (Nn ? 1 : 0),
      Sx: (L0x ? 1 : 0) + (Nn ? 1 : 0),
      perRound,
      dStable: allSame(ds.map((o) => (o ? o.delete.filter(Boolean).length : undefined))),
      pStable: allSame(ps.map((o) => (o ? String(o.support) : undefined))),
    }
  })

  const group = (g: string) => cells.filter((c) => c.kind === g)
  const usable = (g: string) => group(g).filter((c) => c.valid)
  for (const [label, kind] of Object.entries(KINDS)) {
    const dropped = group(kind).length - usable(kind).length
    if (dropped) console.log(`  ★ ${label} 에서 판정 불가 ${dropped}건을 뺐다 (유효 회차 ${MIN_VALID}회 미만)`)
  }

  // ── 축 2 의 기준값 J — ★ 이 축만 값이 앞이다 ────────────────────
  const J = cells.filter((c) => c.dStable && c.pStable).length
  const dAlone = cells.filter((c) => c.dStable).length
  const pAlone = cells.filter((c) => c.pStable).length
  console.log(`\n[축 2 기준값]  ★ 4-2-5 가 이것만 먼저 보라고 적었다`)
  console.log(`  delete 단독 5회 내내   ${pct(dAlone, cells.length)}   (4-2-2 의 22/36 을 이 잣대로 다시 센 수)`)
  console.log(`  지목 단독 5회 내내     ${pct(pAlone, cells.length)}`)
  console.log(`  J (둘 다 5회 내내)     ${pct(J, cells.length)}   ★ 결합은 이보다 작을 수 없다`)
  console.log(`  선 ${LINE.축2} 는 J=${J} 위에 있다 — 산술적으로 ${J <= LINE.축2 ? '닿는다' : '★ J 만으로 이미 넘는다'}`)

  // ── 축 1 — 본체 ─────────────────────────────────────────────────
  const cnt = (kind: string, f: (c: Cell) => boolean) => usable(kind).filter(f).length
  const n = (kind: string) => usable(kind).length

  const FORMULAS: { name: string; sig: (c: Cell) => boolean; sigx: (c: Cell) => boolean }[] = [
    { name: 'OR  (S≥1)', sig: (c) => c.S >= 1, sigx: (c) => c.Sx >= 1 },
    { name: 'AND (S≥2)', sig: (c) => c.S >= 2, sigx: (c) => c.Sx >= 2 },
    // ★ `합산` 은 같은 S 를 3계급으로 읽는 식이다. 축 1 의 `신호가 났다` 는
    //   OR 와 같은 자리를 자른다 — 3계급은 아래 `등급` 절이 따로 문다(4-2-5).
    { name: '합산 (S≥1)', sig: (c) => c.S >= 1, sigx: (c) => c.Sx >= 1 },
  ]

  console.log(`\n[축 1]  낱낱 ≥${LINE.낱낱}/8 · 압축 ≥${LINE.압축}/8 · good ≤${LINE.good}/8   ★ 세 줄을 다 넘어야 통과`)
  console.log(`  ${'식'.padEnd(12)} ${'낱낱'.padEnd(8)} ${'낱낱(0뺀)'.padEnd(10)} ${'압축'.padEnd(8)} ${'good'.padEnd(8)} 축1`)
  const axis1: Record<string, boolean> = {}
  for (const f of FORMULAS) {
    const a = cnt(KINDS.낱낱, f.sig), ax = cnt(KINDS.낱낱, f.sigx)
    const b = cnt(KINDS.압축, f.sig), g = cnt(KINDS.good, f.sig)
    const pass = a >= LINE.낱낱 && ax >= LINE.낱낱재계산 && b >= LINE.압축 && g <= LINE.good
    axis1[f.name] = pass
    console.log(
      `  ${f.name.padEnd(12)} ${(pct(a, n(KINDS.낱낱)) + mark(a >= LINE.낱낱)).padEnd(8)} ` +
        `${(pct(ax, n(KINDS.낱낱)) + mark(ax >= LINE.낱낱재계산)).padEnd(10)} ` +
        `${(pct(b, n(KINDS.압축)) + mark(b >= LINE.압축)).padEnd(8)} ` +
        `${(pct(g, n(KINDS.good)) + mark(g <= LINE.good)).padEnd(8)} ${mark(pass)}`
    )
  }

  // 단독 둘을 같은 표에 둔다 — 결합이 이보다 나아야 값어치가 있다(4-2-5 기준값).
  console.log(`\n  --- 단독 (같은 잣대로 다시 센다) ---`)
  for (const [nm, f] of [['delete (L0)', (c: Cell) => c.L0], ['지목 (null)', (c: Cell) => c.Nn]] as const) {
    console.log(
      `  ${nm.padEnd(12)} ${pct(cnt(KINDS.낱낱, f), n(KINDS.낱낱)).padEnd(8)} ` +
        `${''.padEnd(10)} ${pct(cnt(KINDS.압축, f), n(KINDS.압축)).padEnd(8)} ${pct(cnt(KINDS.good, f), n(KINDS.good))}`
    )
  }

  // ── S 분포 · 3계급 ──────────────────────────────────────────────
  console.log(`\n[S 분포]  무리마다 S=0 / 1 / 2`)
  for (const [label, kind] of Object.entries(KINDS)) {
    const g = usable(kind)
    const d = [0, 1, 2].map((s) => g.filter((c) => c.S === s).length)
    console.log(`  ${label.padEnd(8)} n=${g.length}  ${d.join(' / ')}`)
  }
  const grade = [
    ['낱낱 S=2', cnt(KINDS.낱낱, (c) => c.S === 2), n(KINDS.낱낱)],
    ['압축 S=1', cnt(KINDS.압축, (c) => c.S === 1), n(KINDS.압축)],
    ['good S=0', cnt(KINDS.good, (c) => c.S === 0), n(KINDS.good)],
  ] as const
  console.log(`\n[3계급]  ★ 통과 조건이 아니다. \`합산이 3계급을 세웠다\` 를 적으려면 넘어야 한다 (≥${LINE.등급}/8)`)
  for (const [nm, a, b] of grade) console.log(`  ${nm.padEnd(10)} ${pct(a, b)} ${mark(a >= LINE.등급)}`)
  const gradeOk = grade.every(([, a]) => a >= LINE.등급)

  // ── 축 2 — 식마다 출력의 흔들림 ─────────────────────────────────
  console.log(`\n[축 2]  식의 값이 5회 내내 같은 건수  (선 ≥${LINE.축2}/36)   ★ \`결합 − J\` 를 함께 읽어라`)
  const axis2: Record<string, boolean> = {}
  for (const f of [
    { name: 'OR  (S≥1)', v: (s: number) => String(s >= 1) },
    { name: 'AND (S≥2)', v: (s: number) => String(s >= 2) },
    { name: '합산 (S)', v: (s: number) => String(s) },
  ]) {
    const stable = cells.filter((c) => c.perRound.every((s) => s !== undefined) && new Set(c.perRound.map((s) => f.v(s!))).size === 1).length
    const nm = f.name.startsWith('합산') ? '합산 (S≥1)' : f.name
    axis2[nm] = stable >= LINE.축2
    console.log(`  ${f.name.padEnd(12)} ${pct(stable, cells.length)} ${mark(stable >= LINE.축2)}   결합 − J = ${stable - J}  ${stable - J > 0 ? '★ 식이 삼킨 건수다' : ''}`)
  }

  // ── 문 ──────────────────────────────────────────────────────────
  console.log(`\n[문]  축1 · 축2 를 다 넘은 식`)
  const passed = FORMULAS.filter((f) => axis1[f.name] && axis2[f.name]).map((f) => f.name)
  console.log(`  ${passed.length ? passed.join(' · ') : '없다'}`)
  console.log(`  3계급 ${gradeOk ? '섰다' : '안 섰다'}`)

  // ── 함께 남길 것 — good 여덟의 회차별 S ─────────────────────────
  console.log(`\n[good 여덟] 회차별 S  ★ 정답지가 없어 정오는 못 잰다 (4-2-1 과 같다)`)
  for (const c of group(KINDS.good)) {
    console.log(`  ${c.sourceKey.padEnd(18)} ${JSON.stringify(c.perRound)}  S=${c.S}`)
  }

  return { pointName, J, dAlone, pAlone, axis1, axis2, passed, gradeOk }
}

const only = process.argv.find((a) => a.startsWith('--point='))?.split('=')[1]
const names = only ? [only] : Object.keys(POINT_RUNS)
for (const nm of names) {
  if (!POINT_RUNS[nm]) { console.error(`★ 모르는 지목 문안: ${nm}`); process.exit(1) }
}
const out = names.map(run)

// ★★ P1 이 본체다. P1b 는 함께 적되 넘김 판단에 안 쓴다 (4-2-5).
if (out.length > 1) {
  console.log(`\n${'='.repeat(70)}\n[판정]  ★ P1 이 본체다. P1b 만 넘으면 \`섰다\` 가 아니라 \`다시 재라\` 다`)
  for (const o of out) console.log(`  ${o.pointName.padEnd(4)} 넘은 식 ${o.passed.length ? o.passed.join(' · ') : '없다'}`)
}
