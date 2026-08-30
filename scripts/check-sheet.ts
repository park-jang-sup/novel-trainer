/**
 * 경계 표본 작성 시트 검사 — `data/boundary/A_write.md`
 *
 * 짜면서 확인한다. 짠 뒤가 아니다(설계안 4-5).
 * 하나라도 blocked 되면 AI 에 안 가고, 빠진 줄 모르면 `경계에서 오탐 0` 이
 * 또 게이팅이 만든 수가 된다.
 *
 * ★ 이 스크립트는 규칙 통과만 본다. **L 이 몇인지는 안 잰다** —
 *   그건 사람이 나 면(B_label.md)에 적는다. 여기서 재면 축 1 라벨을
 *   숨긴 뜻이 없어진다.
 *
 *   npx tsx scripts/check-sheet.ts
 */

import { readFileSync } from 'node:fs'
import { AT_ITEMS, actionCfgOf } from '../lib/scoring/fixtures/action-turn'
import { gradeLocal } from '../lib/scoring/local'
import type { Problem } from '../lib/scoring/types'

const SHEET = 'data/boundary/A_write.md'

type Slot = { key: string; slot: string; lines: string[] }

function parse(text: string): Slot[] {
  const out: Slot[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^@@\s*(\S+)\s*\/\s*(\S+)\s*$/)
    if (!m) continue
    // @@ 바로 아래 코드펜스 안만 읽는다. 펜스가 없으면 그 자리는 못 읽는다 —
    // 지시문을 답안으로 먹는 것보다 못 읽었다고 말하는 쪽이 낫다.
    let j = i + 1
    while (j < lines.length && !lines[j].trim()) j++
    if (lines[j]?.trim() !== '```') {
      console.error(`\u2605 ${m[1]} / ${m[2]} — 자리에 코드펜스가 없다`)
      out.push({ key: m[1], slot: m[2], lines: [] })
      continue
    }
    const body: string[] = []
    for (let k = j + 1; k < lines.length; k++) {
      if (lines[k].trim() === '```') break
      if (lines[k].trim()) body.push(lines[k].trim())
    }
    out.push({ key: m[1], slot: m[2], lines: body })
  }
  return out
}

const slots = parse(readFileSync(SHEET, 'utf-8'))
let empty = 0
let bad = 0

for (const s of slots) {
  const item = AT_ITEMS.find(i => i.sourceKey === s.key)
  if (!item) {
    console.error(`★ 모르는 지문: ${s.key}`)
    bad++
    continue
  }
  if (s.lines.length === 0) {
    empty++
    continue
  }
  const problem = {
    id: item.sourceKey,
    type: 'convert',
    scoring_mode: 'auto',
    scoring_config: actionCfgOf(item),
  } as unknown as Problem
  const checks = gradeLocal(problem, { text: s.lines.join('\n') })
  const failed = checks.filter(c => c.status !== 'pass')
  if (failed.length) {
    bad++
    console.log(`★ ${s.key} / ${s.slot}`)
    for (const c of failed) console.log(`    ${c.label} — ${c.detail}`)
  }
}

const filled = slots.length - empty
console.log('')
console.log(`자리 ${slots.length} · 채움 ${filled} · 빈칸 ${empty} · 막힘 ${bad}`)
if (bad === 0 && filled > 0) console.log('채운 것은 전부 규칙을 통과한다')
if (empty > 0) console.log('★ 빈칸이 남았다. 한 칸 채울 때마다 다시 돌려라')
process.exit(bad === 0 ? 0 : 1)
