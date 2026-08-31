'use client'

import { useState } from 'react'

// stage2 자기점검. 재설계안 11-2 4번.
// 규칙을 통과하면 모범답안 몇 가지를 보여주고, 학습자가 스스로 확인한다.
// ★ AI 도 사람도 아니다 — 채점하지 않는다. 체크는 학습자 눈에만 있다.
//
// 자기점검 문구는 단계마다 다르다(stages.self_checks). 여기서 하드코딩하지
// 않는다 — 빈 배열이면 '스스로 확인' 칸 자체가 안 뜨고 모범답안만 보인다.
// fill(10단계)은 blank_key 가 ①②③, 비-fill(1단계 등)은 '' 라 표식을 안 붙인다.

interface RefRow {
  ord: number
  blank_key: string
  content: string
}

const SET_LABEL = ['가', '나', '다', '라', '마']

export default function SelfCheck({
  reference,
  selfChecks,
}: {
  reference: RefRow[]
  selfChecks: string[]
}) {
  const [checked, setChecked] = useState<boolean[]>(selfChecks.map(() => false))
  const ords = [...new Set(reference.map((r) => r.ord))].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p style={{ fontWeight: 700 }}>다르게 쓴 답 {ords.length}가지</p>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          정해진 답은 없다. 같은 자리를 다른 방식으로 채운 예다.
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
                <p key={r.blank_key || 'x'} style={{ fontFamily: 'var(--font-display)' }}>
                  {r.blank_key && (
                    <>
                      <span className="font-mono" style={{ color: 'var(--ink-soft)' }}>
                        {r.blank_key}
                      </span>{' '}
                    </>
                  )}
                  {r.content}
                </p>
              ))}
          </div>
        ))}
      </div>

      {selfChecks.length > 0 && (
        <div className="space-y-2 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
          <p style={{ fontWeight: 700 }}>스스로 확인</p>
          {selfChecks.map((q, i) => (
            <label key={i} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked[i] ?? false}
                onChange={() =>
                  setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
                }
                style={{ marginTop: 3 }}
              />
              <span>{q}</span>
            </label>
          ))}
          {checked.length > 0 && checked.every(Boolean) && (
            <p className="text-sm" style={{ color: 'var(--pass)' }}>
              확인을 마쳤습니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
