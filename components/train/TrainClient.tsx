'use client'

import { useMemo, useState } from 'react'
import { countChars, mergeForbidChecks, gradeLocal, pendingMorphChecks } from '@/lib/scoring'
import type { Check, CheckStatus, CountInput, ProblemType, ScoringConfig } from '@/lib/scoring/types'
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
  minLines: number | null
}

interface PublicProblem {
  id: string
  type: ProblemType
  instruction: string
  passage: string | null
  choices: string[] | null
  publicConfig: PublicConfig
  // lg 이상 + 텍스트 입력형 + 채점 키 4개 이상일 때만 true. page.tsx가 잰다 —
  // scoring_config 전체가 클라이언트로 안 넘어오니 개수는 서버에서만 셀 수 있다.
  twoColumnEligible: boolean
  // twoColumnEligible일 때만 원본 cfg가 들어온다(그 밖엔 null) — 오른쪽 칸의
  // 제출 전 기준 목록을 gradeLocal로 직접 만들 때만 필요하다.
  scoringConfig: ScoringConfig | null
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

// 지시문이 45자에서 220자로 늘면서 h1 하나에 담기던 것이 벽이 됐다.
// 첫 문장만 제목으로 두고 나머지는 아래에 옅은 글씨로 내린다.
//
// app/train/[stageId]/page.tsx의 firstSentence와 비슷하지만 그것은
// 목록 라벨용이라 40자에서 자르고 구두점을 뗀다. 여기서는 자르지도
// 떼지도 않는다 — 지시문 전체를 보여줘야 하므로 따로 둔다.
function splitInstruction(instruction: string): { first: string; rest: string } {
  const m = instruction.match(/[^.?!]*[.?!]/)
  const first = (m ? m[0] : instruction).trim()
  const rest = (m ? instruction.slice(m[0].length) : '').trim()
  return { first, rest }
}

export default function TrainClient({ problem }: { problem: PublicProblem }) {
  const { publicConfig: cfg } = problem

  const [text, setText] = useState('')
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [values, setValues] = useState<Record<string, number | undefined>>({})

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<GradeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const displayChecks = useMemo(
    () => (result ? mergeForbidChecks(result.checks) : undefined),
    [result]
  )

  // 제출 전 기준 목록. gradeLocal('', cfg) + pendingMorphChecks(cfg)가 유일한
  // 출처다 — cfg를 사람 말로 옮기는 표를 따로 짜지 않는다. 답안이 빈 문자열
  // 이라 status는 전부 'fail'로 나오지만 여기서는 label·rule만 쓴다.
  //
  // 제출 후 combine()도 같은 두 함수(gradeLocal + pendingMorphChecks 또는
  // gradeMorph)를 같은 순서로 부르므로 항목 순서·개수가 그대로 유지된다 —
  // forbidWords와 forbidLemmas를 둘 다 쓰는 문항이 생기면 mergeForbidChecks가
  // 둘을 하나로 합쳐 이 순서가 깨질 수 있다. 지금 두 칸 문항 중에는 없다.
  const criteriaChecks = useMemo(() => {
    if (!problem.twoColumnEligible || !problem.scoringConfig) return []
    const dummy = {
      id: problem.id,
      type: problem.type,
      scoring_mode: 'auto' as const,
      scoring_config: problem.scoringConfig,
    }
    return [
      ...gradeLocal(dummy, { text: '' }, undefined),
      ...pendingMorphChecks(problem.scoringConfig),
    ]
  }, [problem])

  const { first: instructionFirst, rest: instructionRest } = useMemo(
    () => splitInstruction(problem.instruction),
    [problem.instruction]
  )

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

  const leftContent = (
    <>
      <div className="space-y-2">
        <p className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
          {problem.type}
        </p>
        <h1
          className="text-xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {instructionFirst}
        </h1>
        {instructionRest !== '' && (
          // 지시문에 개행이 있다(8단계 예시 다섯 줄). pre-wrap이 없으면 HTML이
          // 개행을 공백으로 접어 예시가 본문에 녹는다 — 화면에서 실제로 그랬다.
          // 바로 아래 지문 상자와 같은 처리다.
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            {instructionRest}
          </p>
        )}
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
          {/* 13의 근거: rh-heungbu-yard 모범답안 3건이 화면에서 차지하는 줄 수가
              (빈 줄 포함) 11 · 13 · 11줄이었다. 그중 최대인 13을 쓴다 — 추측이
              아니라 실측값이다. minLines 없는 38문항은 6 그대로다. */}
          <Editor
            value={text}
            onChange={setText}
            checks={displayChecks}
            rows={cfg.minLines != null ? 13 : 6}
            disabled={submitting}
          />
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
    </>
  )

  // 제출 전: 기준만 보여준다. 통과·실패 표시(○ ×)는 없다 — 판정이 아니다.
  // "무엇을 봅니다" 정도로만 제목을 단다. "아직 미달"처럼 판정처럼 들리면
  // 안 된다. label은 CheckRow와 같은 자리에, rule은 detail이 있던 자리에
  // 놓아서 제출 순간 아이콘·detail만 채워지고 재배치가 없게 한다.
  const criteriaContent = criteriaChecks.length > 0 && (
    <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
      <p style={{ fontWeight: 700 }}>무엇을 봅니다</p>
      <div>
        {criteriaChecks.map((c) => (
          <div key={c.key} style={{ borderBottom: '1px solid var(--rule)' }}>
            <div className="flex w-full items-center gap-3 py-2">
              <span className="font-mono" style={{ width: '1em' }} aria-hidden />
              <span className="flex-1">{c.label}</span>
              <span className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
                {c.rule}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const rightContent = result ? (
    <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
      <p style={{ color: STATUS_COLOR[result.status], fontWeight: 700 }}>
        {STATUS_LABEL[result.status]}
      </p>
      {/* morphAvailable이 아니라 pending 유무로 띄운다. 형태소 서버가 없는
          동안 morph는 항상 null이라 morphAvailable만 보면 이 문구가 모든
          문항에 뜬다 — 선택형 · 순서형, 7단계 개행처럼 형태소 검사가 하나도
          없어 서버 없이도 판정이 끝나는 문항까지 "아직 덜 봤다"고 말하게 된다.
          gradeMorph와 pendingMorphChecks가 만드는 키 집합은 maxAdverbs ·
          maxModifiers · minVerbs · maxProperNouns · maxRepeat · forbidLemmas
          6개로 정확히 같으므로, pending이 있다는 것이 곧 형태소 검사가 있다는
          뜻이다. 한쪽에 키를 더하면 다른 쪽에도 더해야 이 조건이 유지된다. */}
      {result.checks.some((c) => c.status === 'pending') && (
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          일부 검사는 문장 분석 서버가 연결되면 표시됩니다.
        </p>
      )}
      {/* needsAi 는 "규칙은 끝났고 AI 차례"라는 뜻이다. AI 심사가 아직 없으므로
          이 문항의 판정은 끝나지 않았다. 통과로만 표시하면 학습자가 자기 답안이
          좋다고 배운다. AI 심사가 붙으면 이 안내를 실제 결과로 갈아끼운다. */}
      {result.needsAi && (
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          규칙 검사는 통과했습니다. 내용 심사는 아직 준비 중입니다.
        </p>
      )}
      <div>
        {displayChecks?.map((c) => (
          <CheckRow key={c.key} check={c} />
        ))}
      </div>
    </div>
  ) : (
    criteriaContent
  )

  // 두 칸(lg 이상 · convert/remove · 채점 키 4개 이상)일 때만 좌우로 나눈다.
  // page.tsx가 이미 세 조건을 다 걸러 twoColumnEligible로 넘긴다 — 여기서는
  // lg 미디어쿼리만 CSS로 더한다. 그 밖의 38문항과 좁은 화면은 지금까지의
  // 한 칸 쌓기 그대로다.
  if (!problem.twoColumnEligible) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        {leftContent}
        {rightContent}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-6">{leftContent}</div>
        {/* 제출 전에는 비어 있다 — result가 없으면 rightContent 자체가 false다.
            판정을 보며 왼쪽을 스크롤해도 안 따라 올라가게 sticky로 붙이고,
            판정 목록이 화면보다 길어질 수 있어 이 칸 안에서 따로 스크롤한다. */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {rightContent}
        </div>
      </div>
    </main>
  )
}
