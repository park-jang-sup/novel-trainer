/**
 * 답안의 문형을 센다. 새 호출 없음 · $0.
 *
 * ★ 축과 판정선은 재기 전에 정했다(10단계_재설계안 7-9장).
 *   여기서 축을 늘리거나 선을 옮기지 마라 — 결과에 맞춰 고르는 것이 된다.
 *
 *   npx tsx scripts/lineshape.ts [파일.json]
 *   인자가 없으면 기존 goods 144 를 잰다.
 */
import { readFileSync } from 'node:fs'
import { AT_ITEMS } from '../lib/scoring/fixtures/action-turn'

const strip = (s: string) => s.replace(/[.,!?"“”‘’]/g, '')
const lines = (t: string) => t.split('\n').map(l => l.trim()).filter(Boolean)
const chars = (s: string) => s.replace(/\s/g, '').length

/** 완전문 — 용언 종결로 끝난다 */
const isFull = (l: string) => /(다|요|까|네|지|군|랴|나)[.!?]?$/.test(l.trim())
/** 명사형 — 서술어 없이 끝난다 */
const isNoun = (l: string) => !isFull(l)

const headRepeat = (t: string) => {
  const h = lines(t).slice(0, 3).map(l => strip(l).split(/\s+/)[0]).filter(Boolean)
  return h.length >= 2 && new Set(h).size !== h.length
}

const arg = process.argv[2]
const texts: string[] = arg
  ? JSON.parse(readFileSync(arg, 'utf-8'))
  : AT_ITEMS.flatMap(i => i.goods)

let full = 0, noun = 0, total = 0, rep = 0
const lastLens: number[] = []
for (const t of texts) {
  const ls = lines(t)
  for (const l of ls) { total++; if (isFull(l)) full++; if (isNoun(l)) noun++ }
  if (headRepeat(t)) rep++
  lastLens.push(chars(ls[ls.length - 1] ?? ''))
}
lastLens.sort((a, b) => a - b)
const med = lastLens[Math.floor(lastLens.length / 2)]
const pct = (n: number, d: number) => (n / d * 100).toFixed(1) + '%'

console.log(`표본 ${texts.length}건 · 줄 ${total}`)
console.log(`1 완전문 비율   ${pct(full, total)}`)
console.log(`2 명사형 비율   ${pct(noun, total)}`)
console.log(`3 첫어절 반복   ${pct(rep, texts.length)}  (${rep}/${texts.length}건)`)
console.log(`4 마지막 줄 길이 중앙값 ${med}자 (공백 제외)`)
