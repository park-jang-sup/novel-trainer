'use client'

import { useState } from 'react'
import { countChars } from '@/lib/scoring'
import type { Check, CheckStatus, CountInput, ProblemType } from '@/lib/scoring/types'
import RuleGauge from './RuleGauge'
import CheckRow from './CheckRow'
import Editor from './Editor'

interface PublicConfig {
  maxChars: number | null
  cards: string[] | null
  count: number | null
  minLen: number | null
  maxLen: number | null
  inputs: CountInput[] | null
}

interface PublicProblem {
  id: string
  type: ProblemType
  instruction: string
  passage: string | null
  choices: string[] | null
  publicConfig: PublicConfig
}

interface GradeResponse {
  status: CheckStatus
  checks: Check[]
  needsAi: boolean
  morphAvailable: boolean
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: '통과',
  fail: '아직 미달',
  pending: '일부 항목 확인 중',
}

const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: 'var(--pass)',
  fail: 'var(--mark)',
  pending: 'var(--ink-soft)',
}

const TEXT_TYPES: ProblemType[] = ['remove', 'convert', 'continue']

export default function TrainClient({ problem }: { problem: PublicProblem }) {
  const { publicConfig: cfg } = problem

  const [text, setText] = useState('')
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [values, setValues] = useState<Record<string, number | undefined>>({})

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<GradeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isTextType = TEXT_TYPES.includes(problem.type)
  const passageLabel = problem.type === 'coinage' || problem.type === 'count' ? '힌트' : '원문'

  const canSubmit = (() => {
    if (submitting) return false
    switch (problem.type) {
      case 'remove':
      case 'convert':
      case 'continue':
      case 'coinage':
        return text.trim().length > 0
      case 'choice':
        return choiceIndex !== null
      case 'order':
        return !!cfg.cards && order.length === cfg.cards.length
      case 'count':
        return !!cfg.inputs && cfg.inputs.every((i) => typeof values[i.key] === 'number')
      default:
        return false
    }
  })()

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { problemId: problem.id }
      if (isTextType || problem.type === 'coinage') body.text = text
      if (problem.type === 'choice') body.choiceIndex = choiceIndex
      if (problem.type === 'order') body.order = order
      if (problem.type === 'count') body.values = values

      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 401) {
        setError('로그인이 필요합니다.')
        return
      }
      if (!res.ok) {
        setError('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      setResult((await res.json()) as GradeResponse)
    } catch {
      setError('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
          {problem.type}
        </p>
        <h1
          className="text-xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {problem.instruction}
        </h1>
      </div>

      {problem.passage && (
        <div className="space-y-1">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{passageLabel}</p>
          <div
            className="whitespace-pre-wrap p-4 text-sm leading-relaxed"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'var(--panel)',
              border: '1px solid var(--rule)',
              borderRadius: 4,
            }}
          >
            {problem.passage}
          </div>
        </div>
      )}

      {isTextType && (
        <div className="space-y-2">
          <Editor value={text} onChange={setText} checks={result?.checks} rows={6} disabled={submitting} />
          {cfg.maxChars != null && (
            <>
              <RuleGauge count={countChars(text)} max={cfg.maxChars} />
              <p className="text-right font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
                {countChars(text)} / {cfg.maxChars}
              </p>
            </>
          )}
        </div>
      )}

      {problem.type === 'coinage' && (
        <Editor
          value={text}
          onChange={setText}
          rows={4}
          disabled={submitting}
          placeholder="한 줄에 하나씩"
        />
      )}

      {problem.type === 'choice' && problem.choices && (
        <div className="space-y-2">
          {problem.choices.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setChoiceIndex(i)}
              className="w-full p-3 text-left"
              style={{
                fontFamily: 'var(--font-display)',
                background: choiceIndex === i ? 'var(--panel)' : 'transparent',
                border: `1px solid ${choiceIndex === i ? 'var(--ink)' : 'var(--rule)'}`,
                borderRadius: 4,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {problem.type === 'order' && cfg.cards && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm" style={{ color: 'var(--ink-soft)' }}>세운 순서</p>
            <div className="space-y-2">
              {order.map((idx, pos) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setOrder(order.filter((i) => i !== idx))}
                  className="flex w-full items-center gap-3 p-3 text-left"
                  style={{ background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 4 }}
                >
                  <span className="font-mono" style={{ color: 'var(--ink-soft)' }}>{pos + 1}</span>
                  <span style={{ fontFamily: 'var(--font-display)' }}>{cfg.cards![idx]}</span>
                </button>
              ))}
              {order.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>아래에서 카드를 탭해 순서를 세운다</p>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm" style={{ color: 'var(--ink-soft)' }}>아직 안 쓴 카드</p>
            <div className="space-y-2">
              {cfg.cards.map((c, idx) =>
                order.includes(idx) ? null : (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOrder([...order, idx])}
                    className="w-full p-3 text-left"
                    style={{
                      fontFamily: 'var(--font-display)',
                      background: 'var(--paper)',
                      border: '1px solid var(--rule)',
                      borderRadius: 4,
                    }}
                  >
                    {c}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {problem.type === 'count' && cfg.inputs && (
        <div className="space-y-3">
          {cfg.inputs.map((inp) => (
            <label key={inp.key} className="flex items-center justify-between gap-4">
              <span>{inp.label}</span>
              <input
                type="number"
                min={inp.min}
                max={inp.max}
                value={values[inp.key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [inp.key]: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
                className="font-mono"
                style={{
                  width: 100,
                  padding: '4px 8px',
                  border: '1px solid var(--rule)',
                  borderRadius: 4,
                  background: 'var(--panel)',
                }}
              />
            </label>
          ))}
        </div>
      )}

      {error && <p style={{ color: 'var(--mark)' }}>{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="px-6 py-3"
        style={{
          background: canSubmit ? 'var(--ink)' : 'var(--rule)',
          color: canSubmit ? 'var(--paper)' : 'var(--ink-soft)',
          borderRadius: 4,
        }}
      >
        제출
      </button>

      {result && (
        <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
          <p style={{ color: STATUS_COLOR[result.status], fontWeight: 700 }}>
            {STATUS_LABEL[result.status]}
          </p>
          {!result.morphAvailable && (
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
              부사·반복 검사는 문장 분석 서버가 연결되면 표시됩니다.
            </p>
          )}
          <div>
            {result.checks.map((c) => (
              <CheckRow key={c.key} check={c} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
