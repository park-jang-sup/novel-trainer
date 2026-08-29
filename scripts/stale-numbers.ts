/**
 * 낡은 수 감시 — 주석과 md 는 test:scoring 이 안 본다.
 *
 * `3/11` 이 열두 곳에 살아 있는 것을 사람 눈이 찾았다. 1597/0 이 나와도
 * 안 걸린다. 세션 11 §9 의 `patch 가 붙었는지를 test:scoring 으로 보기` 와
 * 같은 자리다 — 검사가 안 보는 곳은 검사가 통과해도 모른다.
 *
 * ★ 값을 박지 않는다. 지금 값은 픽스처에서 계산하고, 이 감시는 **옛 표기가
 *   남아 있는지만** 잡는다. 갈래가 13종이 되면 STALE 목록만 갱신하면 된다.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { AT_ITEMS, AT_D2_EXTRA, BYPASS_KINDS } from '../lib/scoring/fixtures/action-turn'

const kinds = BYPASS_KINDS.length
const goods = AT_ITEMS.reduce((n, i) => n + i.goods.length, 0)
const bypasses = AT_ITEMS.reduce((n, i) => n + i.bypasses.length, 0)
const knownIn = AT_ITEMS.reduce((n, i) => n + i.bypasses.filter((b) => b.known).length, 0)
const extra = Object.keys(AT_D2_EXTRA).length

console.log(`실측  갈래 ${kinds} · goods ${goods} · bypasses ${bypasses}`)
console.log(`      known ${knownIn}+${extra}=${knownIn + extra} · AI 행 ${goods + knownIn + extra} · 총계 ${goods + bypasses + extra}`)

/** 옛 표기. 왼쪽이 걸리면 오른쪽으로 고친다. */
const STALE: [string, string][] = [
  ['3/11', '3/12'],
  ['4/12', '4/13'],
  ['미검출/88', '미검출/96'],
  ['뚫기 11', '뚫기 12'],
  ['11건 안', '12건 안'],
  ['11건 밖', '12건 밖'],
  ['11건에 섞', '12건에 섞'],
  ['표본 288', '표본 244'],
  ['171건', '172건'],
  ['513 호출', '516 호출'],
]

/**
 * 일부러 옛 수를 적은 줄. **왜 봐주는지를 여기 적어라.**
 * 봐주는 줄이 늘면 이 감시가 뚫린 것이다.
 */
const ALLOW = [
  '처음에 `27 · 171 · 288` 로 적혀 있었다', // 세션 11 §8-1 의 정정 기록
  '`3/11` 이 아니라', //                     세션 11 §8-1 의 정정 문장
  "'미검출 3/11 · 뚫기 11건'", //            지문요건 12장의 정정 사례 제목
  '3/12 가 3/11 이 될 뿐이라', //            갈래가 빠졌을 때의 가정. 현재 값 아님
]

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p)
    return /\.(ts|tsx|md)$/.test(e.name) ? [p] : []
  })

let hits = 0
for (const file of [...walk('lib'), ...walk('docs')]) {
  readFileSync(file, 'utf-8')
    .split('\n')
    .forEach((line, i) => {
      if (ALLOW.some((a) => line.includes(a))) return
      for (const [old, now] of STALE)
        if (line.includes(old)) {
          console.log(`${file}:${i + 1}  '${old}' → '${now}'`)
          hits++
        }
    })
}

console.log(hits === 0 ? '\n낡은 수 0건' : `\n낡은 수 ${hits}건`)
process.exit(hits === 0 ? 0 : 1)
