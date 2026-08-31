import type { Check } from '@/lib/scoring/types'

// 채점 근거(evidence) → 본문 밑줄. Editor.tsx 가 그리고, verify.ts 가 문다.
// React 를 안 쓴다 — 순수 함수라 둘 다 import 할 수 있게 여기 뗀다.

export interface Mark {
  start: number
  end: number
  className: string
}

// 검사 key → 밑줄 종류. minVerbs는 부족을 알리는 표시가 아니라
// "이만큼 찾았다"는 안내라서 mark(교정)가 아닌 rule 색을 쓴다.
export function markClassFor(key: string): string | null {
  if (key === 'minVerbs') return 'mk-verb'
  if (
    key === 'maxModifiers' ||
    key === 'maxAdverbs' ||
    key === 'maxRepeat' ||
    key === 'forbidWords' ||
    key === 'maxLineChars' ||
    key === 'maxDuplicateLines' ||
    key === 'maxLineWordRepeat'
  ) {
    return 'mk-mark'
  }
  return null
}

export function buildMarks(text: string, checks: Check[] | undefined): Mark[] {
  if (!checks?.length) return []
  const raw: Mark[] = []

  for (const c of checks) {
    // 통과·확인중인 검사의 근거는 본문에 안 칠한다. 통과 화면에 밑줄이
    // 남아 있으면 학습자가 "아직 틀렸다"로 읽는다(실사용 혼동). 근거는
    // 오른쪽 검사 목록(펼침)의 칩으로만 남는다.
    if (c.status !== 'fail') continue
    if (!c.evidence?.length) continue
    const className = markClassFor(c.key)
    if (!className) continue

    for (const item of c.evidence) {
      // maxRepeat의 evidence는 "제비 3회" 형태다. 표면형만 떼어낸다.
      const word = c.key === 'maxRepeat' ? item.replace(/ \d+회$/, '') : item
      if (!word) continue
      let from = 0
      while (true) {
        const i = text.indexOf(word, from)
        if (i === -1) break
        raw.push({ start: i, end: i + word.length, className })
        from = i + word.length
      }
    }
  }

  raw.sort((a, b) => a.start - b.start)
  const out: Mark[] = []
  let lastEnd = -1
  for (const m of raw) {
    if (m.start < lastEnd) continue // 겹치면 먼저 걸린 표시를 우선한다
    out.push(m)
    lastEnd = m.end
  }
  return out
}
