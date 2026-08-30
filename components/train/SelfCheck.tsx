'use client'

import { useState } from 'react'

// stage2 자기점검. 재설계안 11-2 4번.
// 규칙을 통과하면 모범답안 몇 가지를 보여주고, 학습자가 스스로 둘을 체크한다.
// ★ AI 도 사람도 아니다 — 채점하지 않는다. 체크는 학습자 눈에만 있다.

interface RefRow {
  ord: number
  blank_key: string
  content: string
}

const SET_LABEL = ['가', '나', '다', '라', '마']

const QUESTIONS = [
  '마지막에 채운 칸이 그 뒤 결정타 줄의 이유가 되는가',
  '채운 칸들이 앞뒤 고정 줄과 끊기지 않고 이어지는가',
]

export default function SelfCheck({ reference }: { reference: RefRow[] }) {
  const [checked, setChecked] = useState<boolean[]>(QUESTIONS.map(() => false))
  const ords = [...new Set(reference.map((r) => r.ord))].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p style={{ fontWeight: 700 }}>다르게 쓴 답 {ords.length}가지</p>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          정답이 아니다. 같은 자리를 다른 방식으로 채운 예다.
        </p>
        {ords.map((ord, i) => (
          <div
            key={ord}
            className="space-y-1 p-3 text-sm"
            style={{ background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 4 }}
          >
            <p className="font-mono" style={{ color: 'var(--ink-soft)' }}>
              {SET_LABEL[i] ?? ord}
            </p>
            {reference
              .filter((r) => r.ord === ord)
              .map((r) => (
                <p key={r.blank_key} style={{ fontFamily: 'var(--font-display)' }}>
                  <span className="font-mono" style={{ color: 'var(--ink-soft)' }}>
                    {r.blank_key}
                  </span>{' '}
                  {r.content}
                </p>
              ))}
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
        <p style={{ fontWeight: 700 }}>스스로 확인</p>
        {QUESTIONS.map((q, i) => (
          <label key={i} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() =>
                setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
              }
              style={{ marginTop: 3 }}
            />
            <span>{q}</span>
          </label>
        ))}
        {checked.every(Boolean) && (
          <p className="text-sm" style={{ color: 'var(--pass)' }}>
            확인을 마쳤습니다.
          </p>
        )}
      </div>
    </div>
  )
}
