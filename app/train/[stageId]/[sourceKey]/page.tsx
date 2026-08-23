import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrainClient from '@/components/train/TrainClient'
import type { ProblemType } from '@/lib/scoring/types'

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
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-6 pt-6">
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
        }}
      />
    </>
  )
}
