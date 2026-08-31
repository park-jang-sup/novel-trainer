'use client'

import { useState } from 'react'

// 규칙 표시. forbidWords 검사에 forbidLabel/forbidDisplay 가 있으면:
//   기본(펼침)  1줄 범주(forbidLabel) + '접기' · 2줄 기본형 전체(forbidDisplay)
//   접으면      1줄 범주 + '전체 보기' — 2줄째는 visibility:hidden 으로 자리만 남긴다
// 행 높이는 늘 펼친 크기 그대로다 — 접기/펼치기를 눌러도 아래 행이 1px 도 안
// 움직인다(박 님 요청). useState 하나. forbidLabel 없는 문항은 rule 한 줄만
// (다른 단계 안 깨짐). '무엇을 봅니다'와 CheckRow 가 공유.

export default function RuleText({
  rule,
  examples,
  align = 'left',
}: {
  rule: string
  examples?: string[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(true)
  const list = examples ?? []

  return (
    <span style={{ display: 'block', textAlign: align }}>
      <span>{rule}</span>
      {list.length > 0 && (
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
      )}
      {list.length > 0 && (
        <span
          aria-hidden={!open}
          style={{
            display: 'block',
            marginTop: 3,
            color: 'var(--ink-soft)',
            wordBreak: 'keep-all',
            // 접어도 자리는 남긴다 — 행 높이 불변, 아래 행 안 밀림.
            visibility: open ? 'visible' : 'hidden',
          }}
        >
          {list.join(' · ')}
        </span>
      )}
    </span>
  )
}
