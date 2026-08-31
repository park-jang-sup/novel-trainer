import { useMemo, useRef, type CSSProperties } from 'react'
import type { Check } from '@/lib/scoring/types'
import { buildMarks, type Mark } from './marks'

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
//
// 폭도 같아야 한다. 내용이 넘쳐 textarea에 세로 스크롤바가 생기면 그만큼
// 안쪽 폭이 좁아져 줄바꿈 지점이 highlight div(overflow: hidden이라
// 스크롤바가 안 생긴다)와 어긋난다. scrollbar-gutter: stable로 두 레이어
// 모두 스크롤바 자리를 항상 미리 비워 둔다 — 실측: 이 속성 없이는
// textarea.clientWidth가 highlight div보다 스크롤바 너비(15px)만큼 좁았다.
const shared: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontSize: '1.125rem', // text-lg — 유형마다 입력 글씨 크기가 다르면 안 된다
  lineHeight: 1.8,
  padding: 20, // p-5
  letterSpacing: '0.01em',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  boxSizing: 'border-box',
  width: '100%',
  scrollbarGutter: 'stable',
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
