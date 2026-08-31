'use client'

import { useState } from 'react'

// 규칙 한 줄. forbidWords 검사에 forbidLabel/forbidDisplay 가 있으면 rule 은
// 범주 한 줄이고 examples 가 기본형 묶음이다 — 앞 몇 개만 보이고 펼치면 전체.
// '무엇을 봅니다'(제출 전)와 CheckRow(제출 후)가 같이 쓴다.

const PREVIEW = 4

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
  const list = examples ?? []
  const hasMore = list.length > PREVIEW
  const shown = open ? list : list.slice(0, PREVIEW)

  return (
    <span style={{ display: 'block', textAlign: align }}>
      <span>{rule}</span>
      {list.length > 0 && (
        <span style={{ display: 'block', marginTop: 2 }}>
          예: {shown.join(' · ')}
          {hasMore && !open && ' …'}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              style={{
                marginLeft: 6,
                textDecoration: 'underline',
                color: 'var(--ink-soft)',
                cursor: 'pointer',
              }}
            >
              {open ? '접기' : '더 보기'}
            </button>
          )}
        </span>
      )}
    </span>
  )
}
