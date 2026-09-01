'use client'

// choice 문항의 선택지별 해설. reference_answers 를 재활용한다 —
// source_key = sc-* · ord = 선택지 번호(1~4) · blank_key '' · content = 해설.
// (세션 28) 스키마·정책 변경 없음. RLS "reference after submit" 이 제출 기준이라
// 오답 뒤에도 읽힌다.
//
// 오답: 방금 고른 선택지의 해설 한 줄만. 다른 해설·정답은 감춘다(재도전 여지).
// 정답: 선택지 4개를 해설과 함께 전부 보여주고, 고른(=정답) 선택지에 표식.
//
// 가/나(SelfCheck) 렌더 경로는 건드리지 않는다. 캡션도 choice 전용이다.

interface RefRow {
  ord: number
  blank_key: string
  content: string
}

const CAPTION = '각 문장이 통하는지, 왜 안 통하는지.'

export default function ChoiceExplain({
  choices,
  reference,
  chosenIndex,
  passed,
}: {
  choices: string[]
  reference: RefRow[]
  chosenIndex: number
  passed: boolean
}) {
  const explainOf = (i: number) => reference.find((r) => r.ord === i + 1)?.content ?? ''

  if (!passed) {
    const c = explainOf(chosenIndex)
    if (!c) return null
    return (
      <div
        className="space-y-1 p-3 text-sm"
        style={{ background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 4 }}
      >
        <p style={{ fontFamily: 'var(--font-display)' }}>{choices[chosenIndex]}</p>
        <p style={{ color: 'var(--ink-soft)' }}>{c}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p style={{ fontWeight: 700 }}>해설</p>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        {CAPTION}
      </p>
      {choices.map((ch, i) => {
        const correct = i === chosenIndex
        return (
          <div
            key={i}
            className="space-y-1 p-3 text-sm"
            style={{
              background: 'var(--panel)',
              border: `1px solid ${correct ? 'var(--ink)' : 'var(--rule)'}`,
              borderRadius: 4,
            }}
          >
            <p style={{ fontFamily: 'var(--font-display)' }}>
              {correct && (
                <span className="font-mono" style={{ color: 'var(--pass)' }}>
                  정답{' '}
                </span>
              )}
              {ch}
            </p>
            <p style={{ color: 'var(--ink-soft)' }}>{explainOf(i)}</p>
          </div>
        )
      })}
    </div>
  )
}
