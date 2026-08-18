import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrainClient from '@/components/train/TrainClient'
import type { ProblemType } from '@/lib/scoring/types'

export default async function TrainStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>
}) {
  const { stageId } = await params
  const supabase = await createClient()

  const { data: problem, error } = await supabase
    .from('problems')
    .select('id, type, instruction, passage, scoring_config, choices')
    .eq('stage_id', stageId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!problem) {
    notFound()
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
  }

  return (
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
  )
}
