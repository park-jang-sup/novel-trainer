/**
 * `ai-probe.json` 을 갈라 센다. **합계만 세지 않는다.**
 *
 * 설계안 5장 1번이 `관측별로 갈라 세라` 고 적었고, 세션 12 §3 이
 * `합계로 봤으면 7/144 로 끝났을 것을 지문별로 갈라 보니 결함이었다` 고 적었다.
 * 같은 집계를 세 번 손으로 짰다 — 셸 한 줄로 두면 다음에 또 다르게 센다.
 *
 * ```bash
 * npm run ai:report                 # ai-probe.json
 * npm run ai:report -- --in=v1.json # 다른 파일
 * npm run ai:report -- --in=v2.json --vs=v1.json   # 두 회차를 나란히
 * ```
 *
 * ★ 이 스크립트는 **판정을 안 한다.** T 를 정하지 않고(설계안 7장), 수를
 *   내놓기만 한다. `T 별 판정` 절도 `T=1·2·3` 을 나란히 보여줄 뿐이다.
 */
import { readFileSync } from 'node:fs'
import { looksLikeC4 } from '../lib/ai/prompt'
import type { Observation } from '../lib/ai/prompt'

interface Row {
  sourceKey: string
  difficulty: 1 | 2
  kind: string
  detail: string
  text: string
  outcome: {
    observation: Observation | null
    model: string
    error: string | null
    costUsd: number | null
    usage: { inputTokens: number; cachedTokens: number; outputTokens: number } | null
  }
}

const arg = (n: string, d: string) =>
  process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d

const load = (o: Observation) => o.delete.filter(Boolean).length
const read = (f: string): Row[] => JSON.parse(readFileSync(f, 'utf8')) as Row[]

function report(file: string) {
  const all = read(file)
  const rows = all.filter((x) => x.outcome.observation)
  const models = [...new Set(rows.map((x) => x.outcome.model))]
  console.log(`\n${'='.repeat(64)}\n${file}  —  ${rows.length}/${all.length}건 관측 · 모델 ${models.join(', ')}`)
  // ★ 모델을 늘 찍는다. 어느 모델로 잰 값인지가 안 붙으면 회차를 못 견준다.

  const kinds = [...new Set(rows.map((x) => x.kind))]

  console.log('\n[갈래별]  load0 = delete 가 셋 다 false 인 건수')
  for (const kind of kinds) {
    const g = rows.filter((x) => x.kind === kind)
    const l0 = g.filter((x) => load(x.outcome.observation!) === 0).length
    const cue = g.filter((x) => x.outcome.observation!.cue_copied).length
    const f0 = g.filter((x) => x.outcome.observation!.foreshadow_used === false).length
    const c4 = g.filter((x) => looksLikeC4(x.outcome.observation!.why)).length
    console.log(
      `  ${kind.padEnd(26)} n=${g.length}  load0=${l0}  cue=${cue}  fore_false=${f0}  why_C4=${c4}`
    )
  }

  // ★★ 자리별. v1 에서 `delete[0]` 이 0/36 이었다 — 1번 줄은 아예 안 재졌다.
  //   ★ 0을 벗어나는 것만으로는 성공이 아니다. 문안이 `1번 줄도 판정한다` 고
  //     못 박았으니 시키는 대로 찍기만 해도 0을 벗어난다. **갈래별로 갈리는가**
  //     가 성공 조건이다 — 압축·낱낱에서 나오고 good 에서 덜 나와야 재는 것이다.
  console.log('\n[자리별 true]  1번 / 2번 / 3번 줄   ★ 갈래별로 갈리는가를 본다')
  const posOf = (g: Row[]) => {
    const p = [0, 0, 0]
    for (const x of g) x.outcome.observation!.delete.forEach((v, i) => { if (v) p[i]++ })
    return p
  }
  console.log(`  ${'전체'.padEnd(26)} ${posOf(rows).join(' / ')}`)
  for (const kind of kinds) {
    console.log(`  ${kind.padEnd(26)} ${posOf(rows.filter((x) => x.kind === kind)).join(' / ')}`)
  }

  console.log('\n[지문별]  load · cue · fore · actor')
  for (const k of [...new Set(rows.map((x) => x.sourceKey))]) {
    const g = rows.filter((x) => x.sourceKey === k)
    console.log(`\n  ${k}  난${g[0].difficulty}`)
    for (const x of g) {
      const o = x.outcome.observation!
      console.log(
        `    ${x.detail.padEnd(26)} load=${load(o)} ${JSON.stringify(o.delete)}` +
          ` cue=${o.cue_copied} fore=${o.foreshadow_used} actor=${o.has_actor}`
      )
    }
  }

  // ★ T 를 정하지 않는다(설계안 7장). 어느 방향으로 틀렸는지만 본다.
  //   ★★ good 은 지문당 하나뿐이다. 144건의 대역이 아니다 — 수를 옮겨 적지 마라.
  console.log('\n[T 별]  pass = load>=T && !cue && fore!==false   ★ T 를 정하는 자리가 아니다')
  const good = rows.filter((x) => x.kind === 'good')
  const known = rows.filter((x) => x.kind !== 'good')
  for (const T of [1, 2, 3]) {
    const p = (x: Row) => {
      const o = x.outcome.observation!
      return load(o) >= T && !o.cue_copied && o.foreshadow_used !== false
    }
    console.log(
      `  T=${T}  좋은답안 통과 ${good.filter(p).length}/${good.length}` +
        `  ·  known 통과(=미검출) ${known.filter(p).length}/${known.length}`
    )
  }

  // ★★ 수만 보면 못 가르는 자리. load 가 내려가도 why 가 그대로면 AI 가
  //   근거는 두고 답만 바꾼 것이다. **원문을 반드시 눈으로 봐라** —
  //   낱말 목록이라 정밀하지 않다.
  console.log('\n[why · C-4 말투]  주체·주어·모호·계기·흐름')
  const c4 = rows.filter((x) => looksLikeC4(x.outcome.observation!.why))
  console.log(`  ${c4.length}/${rows.length}건`)
  for (const x of c4) {
    console.log(`    ${(x.sourceKey + '/' + x.detail).padEnd(44)} load=${load(x.outcome.observation!)} | ${x.outcome.observation!.why}`)
  }
}

function compare(a: string, b: string) {
  const A = new Map(read(a).filter((x) => x.outcome.observation).map((x) => [x.sourceKey + '|' + x.kind, x]))
  const B = new Map(read(b).filter((x) => x.outcome.observation).map((x) => [x.sourceKey + '|' + x.kind, x]))
  console.log(`\n${'='.repeat(64)}\n[회차 대조]  ${b} → ${a}   ★ 바뀐 건만 적는다`)
  let moved = 0
  for (const [key, x] of A) {
    const y = B.get(key)
    if (!y) continue
    const la = load(x.outcome.observation!)
    const lb = load(y.outcome.observation!)
    const oa = x.outcome.observation!
    const ob = y.outcome.observation!
    if (la === lb && oa.cue_copied === ob.cue_copied && oa.foreshadow_used === ob.foreshadow_used) continue
    moved++
    console.log(`  ${key.padEnd(44)} load ${lb}→${la}  cue ${ob.cue_copied}→${oa.cue_copied}  fore ${ob.foreshadow_used}→${oa.foreshadow_used}`)
  }
  console.log(`  바뀐 것 ${moved} / 겹치는 것 ${[...A.keys()].filter((k) => B.has(k)).length}`)
}

/**
 * 회차 여럿을 건별로 센다. **이것이 설계안 5장 2번(흔들림)이다.**
 *
 * ★ `--vs` 는 두 회차만 견준다. 그걸로는 `바뀐 것 8` 밖에 못 낸다 —
 *   어느 관측이 흔들리는지, 회차를 늘리면 수렴하는지를 못 가른다.
 *   여기서는 건마다 `n회 중 몇 번 true` 를 낸다.
 *
 * ★★ **관측별로 갈라 센다.** `delete` 만 흔들리는지 `cue_copied` 도 흔들리는지가
 *   갈려야 무엇을 고칠지가 정해진다. 합계로 보면 `36건 중 8건 흔들림` 하나로
 *   뭉개진다 — 세션 12 §3 이 정확히 그 자리를 경고했다.
 *
 * ```bash
 * npm run ai:report -- --runs=v2.json,v2b.json,v23.json,v24.json,v25.json
 * ```
 */
function shake(files: string[]) {
  const runs = files.map(read)
  const keyOf = (x: Row) => x.sourceKey + '|' + x.kind
  const base = runs[0].filter((x) => x.outcome.observation)

  console.log(`\n${'='.repeat(64)}\n[흔들림]  ${files.length}회 · ${base.length}건`)
  console.log(`  ${files.join(' · ')}`)

  // 한 건에 대해 회차별 값을 모은다. 없으면 건너뛴다.
  const gather = (k: string) =>
    runs
      .map((r) => r.find((x) => keyOf(x) === k)?.outcome.observation)
      .filter((o): o is Observation => !!o)

  // ── 관측별 · 값이 갈린 건수 ──────────────────────────────────────
  const fields = ['load', 'cue_copied', 'foreshadow_used', 'has_actor'] as const
  const valueOf = (o: Observation, f: (typeof fields)[number]) =>
    f === 'load' ? String(load(o)) : String(o[f])

  console.log('\n[관측별 흔들림]  n회 내내 같은 값인가')
  for (const f of fields) {
    let stable = 0
    let n = 0
    for (const x of base) {
      const os = gather(keyOf(x))
      if (os.length < 2) continue
      n++
      if (new Set(os.map((o) => valueOf(o, f))).size === 1) stable++
    }
    const shaky = n - stable
    console.log(`  ${f.padEnd(18)} 고정 ${stable}/${n}  ·  흔들림 ${shaky}`)
  }

  // ── 갈래별 · delete 의 흔들림 ────────────────────────────────────
  console.log('\n[갈래별 load]  회차마다의 load 를 늘어놓는다')
  for (const kind of [...new Set(base.map((x) => x.kind))]) {
    console.log(`\n  --- ${kind} ---`)
    for (const x of base.filter((b) => b.kind === kind)) {
      const os = gather(keyOf(x))
      const loads = os.map(load)
      const cues = os.map((o) => (o.cue_copied ? 'T' : '.'))
      const same = new Set(loads).size === 1
      console.log(
        `    ${x.sourceKey.padEnd(16)} load ${loads.join(' ')} ${same ? '  ' : '★ '}` +
          ` cue ${cues.join('')}`
      )
    }
  }

  // ── 다수결로 본 갈래별 그물 ──────────────────────────────────────
  //
  // ★ 다수결은 **판정이 아니다.** 흔들리는 관측을 한 값으로 눌러 보면 그물이
  //   어디쯤인지 감이 오지만, 그 값 자체를 결론으로 쓰면 흔들림을 숨긴 것이다.
  //   위의 `흔들림` 수와 반드시 함께 읽어라.
  console.log('\n[다수결]  n회 중 과반  ★ 판정이 아니다. 흔들림 수와 함께 읽어라')
  const majority = (vals: boolean[]) => vals.filter(Boolean).length * 2 > vals.length
  for (const kind of [...new Set(base.map((x) => x.kind))]) {
    const g = base.filter((b) => b.kind === kind)
    let l0 = 0
    let cue = 0
    let f0 = 0
    for (const x of g) {
      const os = gather(keyOf(x))
      if (majority(os.map((o) => load(o) === 0))) l0++
      if (majority(os.map((o) => o.cue_copied))) cue++
      if (majority(os.map((o) => o.foreshadow_used === false))) f0++
    }
    console.log(`  ${kind.padEnd(26)} n=${g.length}  load0=${l0}  cue=${cue}  fore_false=${f0}`)
  }

  // ── 비용의 폭 ────────────────────────────────────────────────────
  //
  // ★★ **평균 하나로 예산을 잡으면 넘친다.** 출력 토큰이 회차마다 다르고
  //   그 차이가 곧 생각 토큰의 편차다. 172건 1회의 예산은 **최대값**으로 잡아라.
  //   설계안 8장에 `$0.21` 하나만 적혀 있던 것이 이 라운드에 물린 자리다 —
  //   수 하나를 적으면 그것이 폭 없는 값으로 읽힌다.
  console.log('\n[비용의 폭]  회차마다의 1회 실비 · 출력 토큰')
  {
    const per = (r: Row[]) => {
      const g = r.filter((x) => x.outcome.usage && x.outcome.costUsd !== null)
      const cost = g.reduce((s, x) => s + (x.outcome.costUsd ?? 0), 0) / (g.length || 1)
      const out = g.map((x) => x.outcome.usage!.outputTokens)
      const inp = g.map((x) => x.outcome.usage!.inputTokens)
      return { cost, out, inp, n: g.length }
    }
    const stats = runs.map(per)
    const costs = stats.map((s) => s.cost).sort((a, b) => a - b)
    const allOut = stats.flatMap((s) => s.out).sort((a, b) => a - b)
    const allIn = stats.flatMap((s) => s.inp)
    const mid = <T,>(a: T[]) => a[Math.floor(a.length / 2)]
    const f = (n: number) => n.toFixed(6)

    stats.forEach((s, i) => {
      const o = [...s.out].sort((a, b) => a - b)
      console.log(`  ${files[i].padEnd(14)} 1회 $${f(s.cost)}  출력 ${o[0]}~${o[o.length - 1]} (중앙 ${mid(o)})`)
    })
    console.log(`\n  1회 실비   최소 $${f(costs[0])} · 중앙 $${f(mid(costs))} · 최대 $${f(costs[costs.length - 1])}`)
    console.log(`  출력 토큰   최소 ${allOut[0]} · 중앙 ${mid(allOut)} · 최대 ${allOut[allOut.length - 1]}`)
    const avgIn = allIn.reduce((a, b) => a + b, 0) / (allIn.length || 1)
    console.log(`  입력 토큰   평균 ${avgIn.toFixed(0)}  ★ 회차마다 같다. 프롬프트가 고정이니 당연하다`)
    console.log(`\n  ★ 172건 예산은 최대로 잡아라: $${f(costs[costs.length - 1] * 172)}`)
    console.log(`    172×3 은 $${f(costs[costs.length - 1] * 516)}`)
  }

  // ── delete 가 혼자 기여하는 것이 있는가 (D-1 / D-2) ──────────────
  //
  // ★★ 한 갈래가 서고 둘이 무너지는 것은 `연산이 죽었다` 와 **다른 모양**이다.
  //   죽은 연산은 세 갈래에 고르게 안 선다. `낱낱 나열` 이 load0 8/8 로 뚜렷하면
  //   그 축에 신호가 있다는 뜻이고, 그 신호가 무엇인지에 후보가 둘이다.
  //
  // ```
  // D-1  delete 가 그 갈래를 실제로 재고 있다        → 물음을 바꿀 자리다
  // D-2  ★ 다른 성질이 그 갈래를 가르고 delete 는 따라만 간다
  //      낱낱 나열은 1~3줄이 전부 독립 동작이라 has_actor·어휘 반복 같은
  //      다른 축으로도 갈린다. 그러면 delete 는 부산물이고 폐기다
  // ```
  //
  // 설계안 2-4 의 `delete 단독 9건` 이 여기서 갈린다. **안 세고 문서에
  // `9가 빈다` 를 박으면 다음 사람이 그걸 사실로 읽는다.**
  console.log('\n[delete 의 독자 기여]  D-1(재고 있다) / D-2(부산물이다)')
  {
    // 다수결로 눌러 갈래별 load0 을 낸 뒤, 같은 건들이 다른 관측으로도
    // 갈리는지 본다. 상관이 높으면 delete 가 더하는 것이 없다.
    const maj = (vals: boolean[]) => vals.filter(Boolean).length * 2 > vals.length
    const rowsOf = (kind: string) => base.filter((b) => b.kind === kind)
    const feature = (x: Row, f: 'load0' | 'actorFalse' | 'cue' | 'lineWords') => {
      const os = gather(keyOf(x))
      if (f === 'load0') return maj(os.map((o) => load(o) === 0))
      if (f === 'actorFalse') return maj(os.map((o) => !o.has_actor))
      if (f === 'cue') return maj(os.map((o) => o.cue_copied))
      // 어휘 반복 — 답안 1~3줄에 같은 어절이 여러 줄에 걸쳐 나오는가.
      // 낱낱 나열이 '~가 ~했다' 를 세 번 되풀이하는 꼴을 잡으려는 것이다.
      const ls = x.text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3)
      const words = ls.map((l) => new Set(l.replace(/[.,!?]/g, '').split(/\s+/)))
      let shared = 0
      for (const w of words[0] ?? []) if (words[1]?.has(w) || words[2]?.has(w)) shared++
      return shared >= 1
    }

    for (const kind of [...new Set(base.map((x) => x.kind))]) {
      const g = rowsOf(kind)
      const l0 = g.filter((x) => feature(x, 'load0')).length
      const af = g.filter((x) => feature(x, 'actorFalse')).length
      const cu = g.filter((x) => feature(x, 'cue')).length
      const lw = g.filter((x) => feature(x, 'lineWords')).length
      console.log(`  ${kind.padEnd(26)} n=${g.length}  load0=${l0}  actor=false ${af}  cue=${cu}  어휘반복=${lw}`)
    }

    // ★ 핵심 물음 하나. `load0` 이 다른 축과 얼마나 겹치는가.
    //   36건 전체에서 재야 갈래 하나에 속지 않는다.
    const agree = (f: 'actorFalse' | 'cue' | 'lineWords') => {
      let same = 0
      for (const x of base) if (feature(x, 'load0') === feature(x, f)) same++
      return same
    }
    console.log(`\n  load0 과 값이 같은 건수 (${base.length}건 중)`)
    console.log(`    has_actor=false 와  ${agree('actorFalse')}`)
    console.log(`    cue_copied 와       ${agree('cue')}`)
    console.log(`    어휘반복 과          ${agree('lineWords')}`)
    console.log(`  ★ ${Math.round(base.length / 2)} 근처면 무관하다(D-1 쪽). ${Math.round(base.length * 0.85)} 이상이면 겹친다(D-2 쪽)`)
    console.log(`  ★★ 이 수는 힌트다. 겹친다고 인과가 아니고, 안 겹친다고 delete 가`)
    console.log(`     서는 것도 아니다 — 흔들림 22/36 은 그대로다`)
  }

  // ── delete[0] ────────────────────────────────────────────────────
  // v1·v2 에서 0/36 이었다. 회차를 늘려도 0이면 문안이 아니라 연산 문제다.
  let d0 = 0
  let total = 0
  for (const x of base) {
    for (const o of gather(keyOf(x))) {
      total++
      if (o.delete[0]) d0++
    }
  }
  console.log(`\n[delete[0]]  ${d0}/${total}  ★ 0이면 1번 줄은 재지는 자리가 아니다`)
}

const inFile = arg('in', 'ai-probe.json')
const runs = arg('runs', '')
if (runs) {
  // 회차 여럿 — 흔들림만 낸다. 개별 회차 표는 --in 으로 따로 봐라.
  shake(runs.split(',').map((s) => s.trim()).filter(Boolean))
} else {
  report(inFile)
  const vs = arg('vs', '')
  if (vs) {
    report(vs)
    compare(inFile, vs)
  }
}
