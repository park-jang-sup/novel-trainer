// 10단계 배정표를 픽스처에서 뽑는다.
//
// 실행: npx tsx scripts/at-table.ts
//
// ★ 기대값을 들고 있지 않다. 뽑아서 보여주기만 한다.
//   난이도·tone 분포와 지문 길이 폭은 verify.ts 의 checkPassageSetRules 가
//   이미 잰다. 여기가 값을 또 들고 있으면 두 곳이 갈리고, 다음 사람이
//   지문을 고쳤을 때 스크립트를 맞추려고 지문을 되돌리게 된다 —
//   겹침 감시를 값이 아니라 사실로 세운 것과 같은 이유다.
//
//   장르는 checkPassageSetRules 의 인자에 없다(그 검사는 난이도·tone·길이·
//   sourceKey 중복만 본다). 그래서 장르만은 여기서 세어 눈으로 본다.
//
// 문서 10단계_지문요건.md 6장의 표가 이 출력이다. 손으로 고치지 마라.

import { AT_ITEMS, AT_TONE, AT_GENRE, passageOf } from '../lib/scoring/fixtures/action-turn'

const noSpace = (t: string) => t.replace(/\s/g, '').length
const pad = (s: string | number, n: number) => String(s).padEnd(n)

console.log(
  pad('sourceKey', 17) + pad('난', 3) + pad('장르', 9) + pad('톤', 11) + pad('길이', 5) + '요소 / 복선'
)
console.log('-'.repeat(78))
for (const i of AT_ITEMS) {
  console.log(
    pad(i.sourceKey, 17) +
      pad(i.difficulty, 3) +
      pad(AT_GENRE[i.sourceKey] ?? '?', 9) +
      pad(AT_TONE[i.sourceKey] ?? '?', 11) +
      pad(noSpace(passageOf(i)), 5) +
      i.element +
      (i.foreshadow ? ' / ' + i.foreshadow : '')
  )
}
console.log('-'.repeat(78))

const tally = (f: (i: (typeof AT_ITEMS)[number]) => string | number) => {
  const m: Record<string, number> = {}
  for (const i of AT_ITEMS) {
    const k = String(f(i))
    m[k] = (m[k] ?? 0) + 1
  }
  return JSON.stringify(m)
}
const lens = AT_ITEMS.map((i) => noSpace(passageOf(i)))
console.log('난이도 ' + tally((i) => i.difficulty))
console.log('tone   ' + tally((i) => AT_TONE[i.sourceKey] ?? '?'))
console.log('장르   ' + tally((i) => AT_GENRE[i.sourceKey] ?? '?') + '   ← 검사가 안 잰다. 눈으로 본다')
console.log(`길이   최소 ${Math.min(...lens)} · 최대 ${Math.max(...lens)} · 폭 ${Math.max(...lens) - Math.min(...lens)}`)
console.log(`좋은 답안 ${AT_ITEMS.reduce((n, i) => n + i.goods.length, 0)}건 · 뚫기 ${AT_ITEMS.reduce((n, i) => n + i.bypasses.length, 0)}건`)
