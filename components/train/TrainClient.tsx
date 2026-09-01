'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { countChars, countSentences, mergeForbidChecks, mergeRepeatChecks, gradeLocal, pendingMorphChecks } from '@/lib/scoring'
import { nextProblemKey, stageProgress, type NavProblem } from '@/lib/train-nav'
import type { Check, CheckStatus, CountInput, ProblemType, ScoringConfig } from '@/lib/scoring/types'
import RuleGauge from './RuleGauge'
import CheckRow from './CheckRow'
import Editor from './Editor'
import FillBody from './FillBody'
import SelfCheck from './SelfCheck'
import ChoiceExplain from './ChoiceExplain'
import RuleText from './RuleText'
import CoachBubble from './CoachBubble'
import type { FillBlank } from './FillBlank'

interface PublicConfig {
  maxChars: number | null
  cards: string[] | null
  count: number | null
  minLen: number | null
  maxLen: number | null
  inputs: CountInput[] | null
  minLines: number | null
  blanks: FillBlank[] | null
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
  // fill: 규칙 통과 뒤 화면에 보여줄 모범답안(재설계안 11-2 4번). 채점 정답이 아니다.
  reference?: { ord: number; blank_key: string; content: string }[]
  // choice: 제출 순간의 선택지. 서버가 아니라 submit()이 결과 객체에 함께
  // 싣는다 — 별도 상태로 두면 setResult 뒤 async 연속부에서 갱신돼, 결과가
  // 뜨는 첫 렌더에 아직 반영이 안 돼 해설이 안 나왔다(세션 28 버그). 한
  // 번의 setResult 로 원자화한다. 오답 뒤 다른 선택지를 눌러도 안 흔들린다.
  submittedChoiceIndex?: number
}

interface LoopProps {
  stageId: string
  currentSourceKey: string
  stageProblems: NavProblem[]
  passedIds: string[]
  nextStageId: string | null
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
//
// rest 안에 두 칸 들여쓴 줄 덩어리가 있으면 example로, 그 바로 위 마지막
// 비어있지 않은 줄을 caption으로 뗀다(8단계의 "이렇게 됩니다." + 예시
// 다섯 줄). 8단계를 이름으로 지목하지 않고 들여쓰기로만 판단한다 —
// 9·10단계도 같은 꼴을 쓸 것이다. 들여쓴 줄이 없으면(지금 61문항)
// example·caption은 빈 문자열이고 rest는 예전과 완전히 같다.
function splitInstruction(instruction: string): {
  first: string
  caption: string
  example: string
  rest: string
} {
  const m = instruction.match(/[^.?!]*[.?!]/)
  const first = (m ? m[0] : instruction).trim()
  const afterFirst = (m ? instruction.slice(m[0].length) : '').trim()

  const lines = afterFirst.split('\n')
  let exStart = -1
  let exEnd = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('  ')) {
      if (exStart === -1) exStart = i
      exEnd = i
    } else if (exStart !== -1) {
      break
    }
  }

  if (exStart === -1) {
    return { first, caption: '', example: '', rest: afterFirst }
  }

  const example = lines
    .slice(exStart, exEnd + 1)
    .map((l) => l.slice(2))
    .join('\n')

  // example 바로 앞의 마지막 비어있지 않은 줄이 caption이다.
  let capIdx = exStart - 1
  while (capIdx >= 0 && lines[capIdx].trim() === '') capIdx--
  const caption = capIdx >= 0 ? lines[capIdx].trim() : ''

  const otherLines = [...lines.slice(0, capIdx >= 0 ? capIdx : exStart), ...lines.slice(exEnd + 1)]
  while (otherLines.length && otherLines[0].trim() === '') otherLines.shift()
  while (otherLines.length && otherLines[otherLines.length - 1].trim() === '') otherLines.pop()
  const rest = otherLines.join('\n').trim()

  return { first, caption, example, rest }
}

export default function TrainClient({
  problem,
  loop,
  selfChecks,
  configSummary,
  coachLine,
}: {
  problem: PublicProblem
  loop: LoopProps
  // 이 단계의 자기점검 문구(stages.self_checks). 빈 배열이면 SelfCheck 가
  // '스스로 확인' 칸을 안 그리고 모범답안만 보여준다.
  selfChecks: string[]
  // scoring_config 에서 파생한 한 줄 요약(page.tsx 가 만든다). '' 면 안 뜬다.
  configSummary: string
  // 코치 한 줄(stages.coach_line). '' 면 말풍선이 안 뜬다.
  coachLine: string
}) {
  const { publicConfig: cfg } = problem

  const [text, setText] = useState('')
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [values, setValues] = useState<Record<string, number | undefined>>({})
  const [blankValues, setBlankValues] = useState<Record<string, string>>({})

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<GradeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const displayChecks = useMemo(
    () => (result ? mergeRepeatChecks(mergeForbidChecks(result.checks)) : undefined),
    [result]
  )

  // 학습 루프. 제출 결과가 나온 뒤에만 쓴다.
  const passedThis = result?.status === 'pass'
  const currentId = useMemo(
    () => loop.stageProblems.find((p) => p.source_key === loop.currentSourceKey)?.id,
    [loop]
  )
  // 지금 문항을 방금 통과했으면 그것도 통과로 친다 — 안 그러면 '다음 →' 이
  // 방금 통과한 자기 자신을 가리키고, 완료 수도 하나 모자란다.
  const livePassed = useMemo(() => {
    const s = new Set(loop.passedIds)
    if (passedThis && currentId) s.add(currentId)
    return s
  }, [loop.passedIds, passedThis, currentId])
  const nextKey = useMemo(
    () => nextProblemKey(loop.stageProblems, loop.currentSourceKey, livePassed),
    [loop.stageProblems, loop.currentSourceKey, livePassed]
  )
  // 진도. 유형과 무관하게 통과한 problem_id 만 센다(lib/train-nav 의 stageProgress —
  // verify 가 문다). skipped = 통과 못 한 문항, 목록 순서.
  const progress = useMemo(
    () => stageProgress(loop.stageProblems, livePassed),
    [loop.stageProblems, livePassed]
  )
  const { passed: passedInStageNow, total: stageTotal, skipped } = progress

  // 제출 전 기준 목록. gradeLocal('', cfg) + pendingMorphChecks(cfg)가 유일한
  // 출처다 — cfg를 사람 말로 옮기는 표를 따로 짜지 않는다. 답안이 빈 문자열
  // 이라 status는 전부 'fail'로 나오지만 여기서는 label·rule만 쓴다.
  //
  // 제출 후 combine()도 같은 두 함수(gradeLocal + pendingMorphChecks 또는
  // gradeMorph)를 같은 순서로 부르므로 항목 순서·개수가 그대로 유지된다 —
  // forbidWords와 forbidLemmas / maxRepeat와 repeatTargets 를 둘 다 쓰는 문항이면
  // merge*가 둘을 한 행으로 합친다. 제출 후 displayChecks도 같은 병합을 거치므로
  // 순서가 유지된다.
  const criteriaChecks = useMemo(() => {
    if (!problem.twoColumnEligible || !problem.scoringConfig) return []
    const dummy = {
      id: problem.id,
      type: problem.type,
      scoring_mode: 'auto' as const,
      scoring_config: problem.scoringConfig,
    }
    return mergeRepeatChecks(
      mergeForbidChecks([
        ...gradeLocal(dummy, { text: '' }, undefined),
        ...pendingMorphChecks(problem.scoringConfig),
      ])
    )
  }, [problem])

  const {
    first: instructionFirst,
    caption: instructionCaption,
    example: instructionExample,
    rest: instructionRest,
  } = useMemo(() => splitInstruction(problem.instruction), [problem.instruction])

  // 두 칸: 왼쪽엔 rest만(caption·example은 오른쪽 exampleContent가 맡는다).
  // 한 칸: 오른쪽이 없으므로 caption·example을 rest 앞에 다시 이어 붙여
  // 지금과 같은 한 덩어리로 보여준다 — example엔 들여쓰기를 되살린다.
  // 지금 caption·example이 있는 문항(8단계)은 전부 twoColumnEligible이라
  // 이 분기는 아직 실제로 안 타지만, 언젠가 안 그런 문항이 생겨도
  // 화면이 지금 꼴을 유지하게 한다.
  const displayedInstructionRest = problem.twoColumnEligible
    ? instructionRest
    : [
        instructionCaption,
        instructionExample &&
          instructionExample
            .split('\n')
            .map((l) => `  ${l}`)
            .join('\n'),
        instructionRest,
      ]
        .filter(Boolean)
        .join('\n\n')

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
      case 'fill':
        return (
          !!cfg.blanks &&
          cfg.blanks
            .filter((b) => !b.optional)
            .every((b) => (blankValues[b.key] ?? '').trim().length > 0)
        )
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
      if (problem.type === 'fill') body.blanks = blankValues

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
      const data = (await res.json()) as GradeResponse
      setResult(
        problem.type === 'choice' && choiceIndex !== null
          ? { ...data, submittedChoiceIndex: choiceIndex }
          : data
      )
    } catch {
      setError('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const leftContent = (
    <>
      {/* 코치 말풍선 — 지시문 위. coach_line 이 '' 인 단계는 안 뜬다. */}
      <CoachBubble text={coachLine} />

      <div className="space-y-2">
        <p className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
          {problem.type}
        </p>
        <h1
          className="text-3xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {instructionFirst}
        </h1>
        {displayedInstructionRest !== '' && (
          // 지시문에 개행이 있다(8단계 예시 다섯 줄). pre-wrap이 없으면 HTML이
          // 개행을 공백으로 접어 예시가 본문에 녹는다 — 화면에서 실제로 그랬다.
          // 바로 아래 지문 상자와 같은 처리다.
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            {displayedInstructionRest}
          </p>
        )}
        {/* 조건 요약 한 줄 — scoring_config 파생(page.tsx). 상세는 오른쪽 패널. */}
        {configSummary !== '' && (
          <p className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
            {configSummary}
          </p>
        )}
      </div>

      {problem.passage && problem.type !== 'fill' && (
        <div className="space-y-1">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{passageLabel}</p>
          <div
            className="whitespace-pre-wrap p-5 text-lg leading-relaxed"
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

      {problem.type === 'fill' && problem.passage && cfg.blanks && (
        <FillBody
          passage={problem.passage}
          blanks={cfg.blanks}
          values={blankValues}
          onChange={(k, v) => setBlankValues((prev) => ({ ...prev, [k]: v }))}
          disabled={submitting || result?.status === 'pass'}
        />
      )}

      {isTextType && (
        <div className="space-y-2">
          {/* 페이지 스케일업(약 1.2배): 6→7 · 13→16. 13의 근거는 rh-heungbu-yard
              모범답안 3건이 화면에서 차지하던 줄 수(11·13·11) 최댓값이었다. */}
          <Editor
            value={text}
            onChange={setText}
            checks={displayChecks}
            rows={cfg.minLines != null ? 16 : 7}
            disabled={submitting}
          />
          {cfg.maxChars != null && <RuleGauge count={countChars(text)} max={cfg.maxChars} />}
          {/* 문장 수 + 자수 — 모든 텍스트 입력 유형 공통(fill 은 칸마다 이미 있다).
              maxChars 없는 문항은 상한 없이 현재 수만 보여준다. */}
          <p className="text-right font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
            {countSentences(text)}문장 · {countChars(text)}
            {cfg.maxChars != null ? ` / ${cfg.maxChars}` : ''}자
          </p>
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

  // 지시문의 예시. 두 칸일 때만 오른쪽으로 옮긴다 — 사람이 화면에서
  // "예시인지 문제인지 헷갈린다"고 했다(예시 다섯 줄과 원문 상자가 같은
  // 열에 세로로 쌓여 있었다). 안쪽은 지문 상자와 같은 처리(pre-wrap ·
  // 패널 배경 · 테두리)를 쓴다. example이 빈 문자열이면(지금 61문항)
  // 아예 만들지 않는다.
  //
  // 두 칸에서는 caption(예: '이렇게 됩니다.')을 화면에 띄우지 않는다.
  // 상자가 이미 예시를 감싸고 있어 이끄는 문장이 할 일이 없고, 아래
  // '무엇을 봅니다'와 층을 맞춰야 한다. caption 파싱은 그대로 둔다 —
  // 왼쪽 prose에서 그 문장을 떼어내는 데 계속 쓰인다.
  // 9·10단계에서 caption에 실제 정보를 담지 마라. 두 칸에서 사라진다.
  const exampleContent = instructionExample !== '' && (
    <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
      <p style={{ fontWeight: 700 }}>예시</p>
      <div
        className="whitespace-pre-wrap p-4 text-sm leading-relaxed"
        style={{
          fontFamily: 'var(--font-display)',
          background: 'var(--panel)',
          border: '1px solid var(--rule)',
          borderRadius: 4,
        }}
      >
        {instructionExample}
      </div>
    </div>
  )

  // 제출 전: 기준만 보여준다. 통과·실패 표시(○ ×)는 없다 — 판정이 아니다.
  // "무엇을 봅니다" 정도로만 제목을 단다. "아직 미달"처럼 판정처럼 들리면
  // 안 된다. label은 CheckRow와 같은 자리에, rule은 detail이 있던 자리에
  // 놓아서 제출 순간 아이콘·detail만 채워지고 재배치가 없게 한다.
  const criteriaContent = criteriaChecks.length > 0 && (
    <div className="space-y-4 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
      <p style={{ fontWeight: 700 }}>무엇을 봅니다</p>
      <div>
        {criteriaChecks.map((c) => (
          <div key={c.key} style={{ borderBottom: '1px solid var(--rule)' }}>
            {/* 라벨은 안 꺾이게 nowrap + 안 줄어들게. 긴 규칙 텍스트만 오른쪽
                칸에서 줄바꿈한다(min-w-0 이 있어야 flex 칸이 실제로 줄어든다).
                글씨는 본문 급, 라벨은 font-medium. 행 높이·간격은 CheckRow(제출 후)와
                같은 값이어야 한다 — 제출 전후 밀도가 안 바뀌게. */}
            <div className="flex w-full items-start gap-3 py-4" style={{ minHeight: '3.5rem' }}>
              <span className="font-mono" style={{ width: '1em', flexShrink: 0 }} aria-hidden />
              <span className="whitespace-nowrap font-medium" style={{ flexShrink: 0 }}>{c.label}</span>
              <span
                className="min-w-0 flex-1 text-right"
                style={{ color: 'var(--ink-soft)', wordBreak: 'keep-all' }}
              >
                <RuleText rule={c.rule} examples={c.examples} align="right" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // 예시가 위, 목록·판정이 아래다. 제출해도 예시는 그 자리에 그대로 있고
  // 아래 블록만 "무엇을 봅니다" → "통과"로 바뀐다 — 이 순서에서만 제출
  // 전후 재배치가 안 생긴다. 예시를 아래에 두면 목록이 판정으로 바뀔 때
  // 높이가 달라져 예시가 위아래로 움직인다. 한 칸에는 오른쪽이 없으므로
  // exampleContent를 twoColumnEligible일 때만 끼워 넣는다.
  const rightContent = (
    <>
      {problem.twoColumnEligible && exampleContent}
      {result ? (
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
          {/* choice: 선택지별 해설(reference_answers 재활용). 오답이면 고른 것
              한 줄만, 정답이면 4개 전부 + 정답 표식. 가/나(SelfCheck) 경로와
              분리한다 — 캡션·구조가 다르다. */}
          {problem.type === 'choice' ? (
            <>
              <div>
                {displayChecks?.map((c) => (
                  <CheckRow key={c.key} check={c} />
                ))}
              </div>
              {result.reference?.length && result.submittedChoiceIndex != null ? (
                <ChoiceExplain
                  choices={problem.choices ?? []}
                  reference={result.reference}
                  chosenIndex={result.submittedChoiceIndex}
                  passed={result.status === 'pass'}
                />
              ) : null}
            </>
          ) : /* 규칙을 통과하고 모범답안이 있으면(10단계 fill · 1단계 등) 모범답안 +
              자기점검이 판정을 대신한다. 규칙 목록(전부 ○)은 그 아래에 접어 둔다. */
          result.status === 'pass' && result.reference?.length ? (
            <>
              <SelfCheck reference={result.reference} selfChecks={selfChecks} />
              <details className="pt-2">
                <summary className="cursor-pointer text-sm" style={{ color: 'var(--ink-soft)' }}>
                  규칙 검사 {displayChecks?.length ?? 0}개
                </summary>
                <div>
                  {displayChecks?.map((c) => (
                    <CheckRow key={c.key} check={c} />
                  ))}
                </div>
              </details>
            </>
          ) : (
            <div>
              {displayChecks?.map((c) => (
                <CheckRow key={c.key} check={c} />
              ))}
            </div>
          )}

          {/* 학습 루프. 통과든 미달이든 앞으로 갈 자리를 준다 — 막히면
              넘어갈 수 있어야 한다. '단계 완료' 는 건너뛴 문항이 하나도
              없을 때만. */}
          <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--rule)' }}>
            {nextKey ? (
              <Link
                href={`/train/${loop.stageId}/${nextKey}`}
                style={{ color: passedThis ? 'var(--ink)' : 'var(--ink-soft)' }}
              >
                {passedThis ? '다음 문항 →' : '건너뛰기 →'}
              </Link>
            ) : passedThis && skipped.length === 0 ? (
              <>
                <p style={{ color: 'var(--pass)', fontWeight: 700 }}>
                  단계 완료 {passedInStageNow}/{stageTotal}
                </p>
                {loop.nextStageId ? (
                  <Link href={`/train/${loop.nextStageId}`} style={{ color: 'var(--ink)' }}>
                    다음 단계 →
                  </Link>
                ) : (
                  <Link href="/" style={{ color: 'var(--ink-soft)' }}>
                    홈으로 →
                  </Link>
                )}
              </>
            ) : passedThis ? (
              <>
                <p style={{ fontWeight: 700 }}>
                  {passedInStageNow}/{stageTotal} · 건너뛴 문항 {skipped.length}개
                </p>
                <Link
                  href={`/train/${loop.stageId}/${skipped[0].source_key}`}
                  style={{ color: 'var(--ink)' }}
                >
                  건너뛴 문항으로 →
                </Link>
              </>
            ) : (
              <Link href={`/train/${loop.stageId}`} style={{ color: 'var(--ink-soft)' }}>
                단계 목록으로 →
              </Link>
            )}
          </div>
        </div>
      ) : (
        criteriaContent
      )}
    </>
  )

  // 두 칸(lg 이상 · convert/remove · 채점 키 4개 이상)일 때만 좌우로 나눈다.
  // page.tsx가 이미 세 조건을 다 걸러 twoColumnEligible로 넘긴다 — 여기서는
  // lg 미디어쿼리만 CSS로 더한다. 그 밖의 38문항과 좁은 화면은 지금까지의
  // 한 칸 쌓기 그대로다.
  if (!problem.twoColumnEligible) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {leftContent}
        {rightContent}
      </main>
    )
  }

  return (
    // 7xl(1280). 페이지 스케일업 — 제목·원문·입력칸을 키우면서 컨테이너도 한
    // 단계 넓혀 여백을 줄인다. 왼쪽(문항)이 오른쪽에 안 눌리게 비율은 왼쪽
    // 우선(1.4fr) 으로 되돌리고, 오른쪽은 최소 22rem 바닥만 지킨다.
    <main className="mx-auto max-w-7xl p-6">
      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(22rem,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
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
