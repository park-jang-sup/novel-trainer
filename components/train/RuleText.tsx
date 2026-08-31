'use client'

import { useEffect, useRef, useState } from 'react'

// 규칙 한 줄. forbidWords 검사에 forbidLabel/forbidDisplay 가 있으면 rule 은
// 범주 한 줄이고, 기본형 전체는 '전체 보기'를 앵커로 한 absolute 팝오버로 띄운다
// — 문서 흐름에 안 들어가 접기/펼치기 때 아래 행이 밀리지 않는다. 바깥 클릭 ·
// Esc · '접기' 로 닫힌다. '무엇을 봅니다'(제출 전)와 CheckRow(제출 후)가 같이
// 쓴다. forbidLabel 없는 문항은 rule 만 나온다(다른 단계 안 깨짐).

export default function RuleText({
  rule,
  examples,
  align = 'left',
}: {
  rule: string
  examples?: string[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const list = examples ?? []

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'block', textAlign: align }}>
      <span>{rule}</span>
      {list.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            style={{
              marginLeft: 8,
              textDecoration: 'underline',
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {open ? '접기' : '전체 보기'}
          </button>
          {open && (
            <span
              role="group"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 30,
                width: 'max-content',
                maxWidth: 'min(22rem, 88vw)',
                padding: '8px 10px',
                textAlign: 'left',
                whiteSpace: 'normal',
                wordBreak: 'keep-all',
                background: 'var(--panel)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.14)',
              }}
            >
              {list.join(' · ')}
            </span>
          )}
        </>
      )}
    </span>
  )
}
