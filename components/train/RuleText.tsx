'use client'

import { useState } from 'react'

// 규칙 한 줄. forbidWords 검사에 forbidLabel/forbidDisplay 가 있으면 rule 은
// 범주 한 줄이고, 기본형 전체는 기본으로 숨긴다 — '전체 보기'를 누르면 그 아래
// 줄에 펼친다(화나다 · 분노 · …). '무엇을 봅니다'(제출 전)와 CheckRow(제출 후)가
// 같이 쓴다. forbidLabel 없는 문항은 rule 만 나온다(다른 단계 안 깨짐).

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

  return (
    <span style={{ display: 'block', textAlign: align }}>
      <span>{rule}</span>
      {list.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
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
            <span style={{ display: 'block', marginTop: 4 }}>{list.join(' · ')}</span>
          )}
        </>
      )}
    </span>
  )
}
