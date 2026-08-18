import { useMemo, useRef, type CSSProperties } from 'react'
import type { Check } from '@/lib/scoring/types'

interface Mark {
  start: number
  end: number
  className: string
}

// 검사 key → 밑줄 종류. minVerbs는 부족을 알리는 표시가 아니라
// "이만큼 찾았다"는 안내라서 mark(교정)가 아닌 rule 색을 쓴다.
function markClassFor(key: string): string | null {
  if (key === 'minVerbs') return 'mk-verb'
  if (key === 'maxModifiers' || key === 'maxAdverbs' || key === 'maxRepeat' || key === 'forbidWords') {
    return 'mk-mark'
  }
  return null
}

function buildMarks(text: string, checks: Check[] | undefined): Mark[] {
  if (!checks?.length) return []
  const raw: Mark[] = []

  for (const c of checks) {
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderHighlight(text: string, marks: Mark[]): string {
  let html = ''
  let cursor = 0
  for (const m of marks) {
    html += escapeHtml(text.slice(cursor, m.start))
    html += `<span class="${m.className}">${escapeHtml(text.slice(m.start, m.end))}</span>`
    cursor = m.end
  }
  html += escapeHtml(text.slice(cursor))
  // 마지막 줄바꿈 뒤 빈 줄이 접히지 않게 한 칸 더한다.
  return html + (text.endsWith('\n') ? '&nbsp;' : '')
}

// 두 레이어의 fontFamily·fontSize·lineHeight·padding·letterSpacing이
// 완전히 같아야 밑줄 위치가 원문 글자와 어긋나지 않는다.
const shared: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontSize: '1rem',
  lineHeight: 1.8,
  padding: 12,
  letterSpacing: '0.01em',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  boxSizing: 'border-box',
  width: '100%',
}

export default function Editor({
  value,
  onChange,
  checks,
  disabled,
  placeholder,
  rows = 6,
}: {
  value: string
  onChange: (v: string) => void
  checks?: Check[]
  disabled?: boolean
  placeholder?: string
  rows?: number
}) {
  const marks = useMemo(() => buildMarks(value, checks), [value, checks])
  const html = useMemo(() => renderHighlight(value, marks), [value, marks])
  const hlRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="relative"
      style={{ background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 4 }}
    >
      <div
        ref={hlRef}
        aria-hidden
        style={{
          ...shared,
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          color: 'var(--ink)',
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (hlRef.current) {
            hlRef.current.scrollTop = e.currentTarget.scrollTop
            hlRef.current.scrollLeft = e.currentTarget.scrollLeft
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...shared,
          position: 'relative',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'var(--ink)',
          resize: 'none',
          outline: 'none',
          border: 'none',
        }}
      />
    </div>
  )
}
