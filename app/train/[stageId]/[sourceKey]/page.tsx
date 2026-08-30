import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrainClient from '@/components/train/TrainClient'
import { nextStageId } from '@/lib/train-nav'
import type { BlankSpec, ProblemType } from '@/lib/scoring/types'

export default async function TrainProblemPage(
  props: PageProps<'/train/[stageId]/[sourceKey]'>
) {
  const { stageId, sourceKey } = await props.params
  const supabase = await createClient()

  // source_key에는 유니크 인덱스가 있어 그것만으로 문항이 정해진다.
  // URL의 stageId는 중복 정보다 — 어긋난 주소가 만들어질 수 있으므로
  // 여기서 찾은 뒤 아래에서 실제 stage_id와 비교한다.
  const { data: problem, error } = await supabase
    .from('problems')
    .select('id, stage_id, type, instruction, passage, scoring_config, choices')
    .eq('source_key', sourceKey)
    .not('is_active', 'is', false)
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!problem) {
    notFound()
  }

  // 오타 하나로 학습자를 막지 않고, 동시에 어긋난 주소가 살아남지 않게 한다.
  const actualStageId = String(problem.stage_id)
  if (actualStageId !== stageId) {
    redirect(`/train/${actualStageId}/${sourceKey}`)
  }

  const cfg = problem.scoring_config ?? {}

  // 화면 표시에 필요한 것만 넘긴다. forbidWords · maxAdverbs · minVerbs ·
  // maxRepeat 는 여기서 걸러진다 — 채점 결과(evidence)에 어차피 나온다.
  const publicConfig = {
    maxChars: cfg.maxChars ?? null,
    cards: cfg.cards ?? null,
    count: cfg.count ?? null,
    minLen: cfg.minLen ?? null,
    maxLen: cfg.maxLen ?? null,
    inputs: cfg.inputs ?? null,
    // 화면 표시용이 아니다 — 입력창 높이(rows)를 정하는 데만 쓴다.
    minLines: cfg.minLines ?? null,
    // fill: 빈칸 명세. key·label·글자수·문장수는 화면이 입력칸을 그리는 데
    // 쓴다. fixedLines·forbidWords 는 안 보낸다 — 채점 결과에 어차피 나온다.
    blanks:
      (cfg.blanks as BlankSpec[] | undefined)?.map((b) => ({
        key: b.key,
        label: b.label,
        maxChars: b.maxChars ?? null,
        minSentences: b.minSentences ?? null,
        maxSentences: b.maxSentences ?? null,
        optional: b.optional ?? false,
      })) ?? null,
  }

  // 두 칸 레이아웃 대상인가. cards·inputs는 order/count의 재료지 채점
  // 임계값이 아니라서 안 센다(answer·answerIndex도 같은 이유로 뺀다 —
  // 지금 스키마엔 없지만 채점 키로 취급하면 안 되는 이름이다).
  // choice·order·count·coinage는 remove/convert가 아니라서 이 조건에서
  // 이미 걸러진다 — coinage가 채점 키 4개(count·minLen·maxLen·distinctInitial)를
  // 넘겨도 두 칸이 되지 않는 이유다.
  const NON_SCORING_KEYS = new Set(['cards', 'inputs', 'answer', 'answerIndex'])
  const scoringKeyCount = Object.keys(cfg).filter((k) => !NON_SCORING_KEYS.has(k)).length
  const isTextInputType = problem.type === 'convert' || problem.type === 'remove'
  const twoColumnEligible = isTextInputType && scoringKeyCount >= 4

  // 두 칸일 때만 원본 cfg를 그대로 넘긴다 — 오른쪽 칸이 gradeLocal(빈 문자열,
  // cfg)로 제출 전 기준 목록을 직접 만든다(지시서 5). 한 칸 문항은 지금까지처럼
  // publicConfig로 걸러진 값만 받는다.
  const scoringConfig = twoColumnEligible ? cfg : null

  // ── 학습 루프 재료 ──────────────────────────────────────────────
  // 활성 문항 전부를 한 번에 가져온다(53행뿐이라 왕복이 싸다). 이 단계의
  // 목록 · 다른 단계에 문항이 있는지 · 두 곳(app/page.tsx)과 같은 통과 수를
  // 여기서 모두 뽑는다.
  const [{ data: activeProblems }, { data: passedRows }, { data: allStages }] =
    await Promise.all([
      supabase.from('problems').select('id, source_key, difficulty, stage_id').not('is_active', 'is', false),
      supabase.from('submissions').select('problem_id').eq('passed', true),
      supabase.from('stages').select('id, track, order_no'),
    ])

  const stageProblems = (activeProblems ?? [])
    .filter((p) => String(p.stage_id) === actualStageId)
    .map((p) => ({ id: String(p.id), source_key: p.source_key as string, difficulty: p.difficulty as number }))
  const passedIds = new Set((passedRows ?? []).map((r) => String(r.problem_id)))

  // 다음 단계는 전체 순서(sentence → structure → start)에서 문항 있는 다음 것.
  const stagesWithProblems = new Set((activeProblems ?? []).map((p) => String(p.stage_id)))
  const navStages = (allStages ?? []).map((s) => ({
    id: String(s.id),
    track: s.track as string,
    order_no: s.order_no as number,
  }))

  const loop = {
    stageId: actualStageId,
    currentSourceKey: sourceKey,
    stageProblems,
    passedIds: [...passedIds],
    nextStageId: nextStageId(navStages, actualStageId, stagesWithProblems),
  }

  return (
    <>
      <div className={`mx-auto px-6 pt-6 ${twoColumnEligible ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <Link href={`/train/${actualStageId}`} className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          ← 목록으로
        </Link>
      </div>
      <TrainClient
        problem={{
          id: problem.id,
          type: problem.type as ProblemType,
          instruction: problem.instruction,
          passage: problem.passage,
          choices: problem.choices ?? null,
          publicConfig,
          twoColumnEligible,
          scoringConfig,
        }}
        loop={loop}
      />
    </>
  )
}
