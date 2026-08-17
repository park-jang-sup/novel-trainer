import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function TrainStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>
}) {
  const { stageId } = await params
  const supabase = await createClient()

  const { data: problem, error } = await supabase
    .from('problems')
    .select('*')
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

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-sm text-gray-500">{problem.type}</p>
        <h1 className="text-xl font-semibold">{problem.instruction}</h1>
      </div>

      {problem.passage && (
        <div className="whitespace-pre-wrap rounded-md border border-gray-200 p-4 text-sm leading-relaxed">
          {problem.passage}
        </div>
      )}

      {/* 채점은 아직 붙이지 않음 — app/api/grade/route.ts 참고 */}
    </main>
  )
}
