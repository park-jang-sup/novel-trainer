import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// order_no는 트랙마다 번호 구간이 달라 전역 번호가 성립하지 않는다.
// structure는 11부터 시작하고 sentence도 11까지 있어 11번이 두 개다.
// 그래서 화면에는 order_no를 그대로 내지 않고, 같은 트랙 안에서의
// 상대 순번을 다시 세어 보여준다.
const TRACK_LABEL: Record<string, string> = {
  sentence: '문장',
  structure: '구성',
  start: '도입',
}

// 목록에서 문항을 구분하는 라벨은 instruction이 아니라 첫 문장이다.
// instruction은 유형끼리 문구가 같은 경우가 많고(4단계는 8문항 중 6개가
// 글자 그대로 같다), 있을 때는 passage가 더 구체적으로 문항을 구분해 준다.
function firstSentence(text: string): string {
  const m = text.match(/[^.?!]*[.?!]/)
  return (m ? m[0].slice(0, -1) : text).trim()
}

export default async function TrainStagePage(props: PageProps<'/train/[stageId]'>) {
  const { stageId } = await props.params

  if (!/^\d+$/.test(stageId)) {
    notFound()
  }

  const supabase = await createClient()

  const { data: stage, error: stageError } = await supabase
    .from('stages')
    .select('id, track, order_no, title, summary')
    .eq('id', stageId)
    .maybeSingle()

  if (stageError) {
    throw stageError
  }
  if (!stage) {
    notFound()
  }

  const { data: trackStages, error: trackError } = await supabase
    .from('stages')
    .select('id, order_no')
    .eq('track', stage.track)
    .order('order_no')

  if (trackError) {
    throw trackError
  }

  const relativeNo = (trackStages ?? []).findIndex((s) => s.id === stage.id) + 1
  const trackLabel = TRACK_LABEL[stage.track] ?? stage.track

  // scoring_config·choices는 목록에 실릴 이유가 없다. 채점 설정과 선택지는
  // 문항 하나를 열었을 때만 필요하다.
  //
  // is_active 가드는 RLS 정책("is_active is not false")과 같은 모양을 쓴다.
  // .eq('is_active', true)를 쓰면 is_active가 null인 행이 정책은 통과하고
  // 쿼리에서만 빠지는 어긋남이 생긴다.
  const { data: problems, error: problemsError } = await supabase
    .from('problems')
    .select('id, source_key, type, difficulty, instruction, passage')
    .eq('stage_id', stageId)
    .not('is_active', 'is', false)
    .order('difficulty')
    .order('source_key')

  if (problemsError) {
    throw problemsError
  }

  // submissions는 RLS "own submissions read"(auth.uid() = user_id)가 이미
  // 자기 행만 준다. user_id를 코드에서 또 거르면 정책이 도는지 안 도는지
  // 구분이 안 된다.
  //
  // 같은 문항을 여러 번 통과했을 수 있어 행 수가 아니라 서로 다른
  // problem_id의 개수를 센다. 진도를 못 읽었다고 목록이 죽으면 안 되므로
  // 에러는 throw하지 않고 "표시하지 않음" 상태로 남긴다.
  const { data: passedSubmissions, error: submissionsError } = await supabase
    .from('submissions')
    .select('problem_id')
    .eq('passed', true)

  const progressAvailable = !submissionsError
  if (submissionsError) {
    console.error(
      'submissions select failed',
      'code=' + submissionsError.code,
      'message=' + submissionsError.message,
      'details=' + submissionsError.details,
      'hint=' + submissionsError.hint,
      'raw=' + JSON.stringify(submissionsError)
    )
  }
  const passedProblemIds = new Set((passedSubmissions ?? []).map((s) => s.problem_id))

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
          {trackLabel} {relativeNo}
        </p>
        <h1
          className="text-xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {stage.title}
        </h1>
        {stage.summary && (
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            {stage.summary}
          </p>
        )}
      </div>

      {problems && problems.length > 0 ? (
        <div>
          {problems.map((p, i) => (
            <Link
              key={p.id}
              href={`/train/${stageId}/${p.source_key}`}
              className="flex items-center gap-3 py-3"
              style={{ borderBottom: '1px solid var(--rule)' }}
            >
              <span
                className="font-mono"
                style={{ color: 'var(--ink-soft)', width: '2ch' }}
              >
                {i + 1}
              </span>
              <span
                className="font-mono"
                style={{ color: 'var(--pass)', width: '1em' }}
                aria-hidden
              >
                {progressAvailable && passedProblemIds.has(p.id) ? '○' : ''}
              </span>
              {/* 자르는 길이는 CSS가 정한다. 글자 수로 자르면 화면 폭과 어긋나
                  어떤 줄만 두 줄이 된다. */}
              <span
                className="min-w-0 flex-1 truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {firstSentence(p.passage ?? p.instruction)}
              </span>
              <span
                className="whitespace-nowrap font-mono text-sm"
                style={{ color: 'var(--ink-soft)' }}
              >
                {p.source_key}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          아직 문항이 없습니다
        </p>
      )}
    </main>
  )
}
