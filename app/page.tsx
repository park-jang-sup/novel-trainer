import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// app/train/[stageId]/page.tsx 와 같은 규칙: order_no는 트랙마다 번호
// 구간이 달라 전역 번호가 성립하지 않는다. 화면에는 같은 track 안에서
// order_no 순으로 다시 센 상대 번호를 낸다.
const TRACKS = ['sentence', 'structure', 'start'] as const

const TRACK_LABEL: Record<(typeof TRACKS)[number], string> = {
  sentence: '문장',
  structure: '구성',
  start: '도입',
}

export default async function Home() {
  const supabase = await createClient()

  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select('id, track, order_no, title, summary')
    .order('order_no')

  if (stagesError) {
    throw stagesError
  }

  // 53행뿐이라 한 번에 가져와 Map으로 집계한다. 단계마다 count 쿼리를
  // 따로 날리면 25번 왕복한다.
  //
  // is_active 가드는 RLS 정책("is_active is not false")과 같은 모양을 쓴다.
  // .eq('is_active', true)를 쓰면 is_active가 null인 행이 정책은 통과하고
  // 쿼리에서만 빠지는 어긋남이 생긴다.
  const { data: problems, error: problemsError } = await supabase
    .from('problems')
    .select('id, stage_id')
    .not('is_active', 'is', false)

  if (problemsError) {
    throw problemsError
  }

  // submissions는 RLS "own submissions read"(auth.uid() = user_id)가 이미
  // 자기 행만 준다. user_id를 코드에서 또 거르면 정책이 도는지 안 도는지
  // 구분이 안 된다.
  //
  // 같은 문항을 여러 번 통과했을 수 있어 행 수가 아니라 서로 다른
  // problem_id의 개수를 센다. 진도를 못 읽었다고 홈이 죽으면 안 되므로
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

  const progressByStage = new Map<string, { total: number; passed: number }>()
  for (const p of problems ?? []) {
    const entry = progressByStage.get(p.stage_id) ?? { total: 0, passed: 0 }
    entry.total += 1
    if (passedProblemIds.has(p.id)) entry.passed += 1
    progressByStage.set(p.stage_id, entry)
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <h1
        className="text-2xl"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
      >
        웹소설 훈련
      </h1>

      {TRACKS.map((track) => {
        const trackStages = (stages ?? []).filter((s) => s.track === track)
        if (trackStages.length === 0) return null

        return (
          <section key={track} className="space-y-2">
            <h2
              className="text-lg"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              {TRACK_LABEL[track]}
            </h2>
            <div>
              {trackStages.map((s, i) => {
                const progress = progressByStage.get(s.id)
                const count = progress?.total ?? 0
                const relativeNo = i + 1

                const row = (
                  <>
                    <span
                      className="font-mono"
                      style={{ color: 'var(--ink-soft)', width: '2em' }}
                      aria-hidden
                    >
                      {relativeNo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span style={{ fontFamily: 'var(--font-display)' }}>{s.title}</span>
                      {s.summary && (
                        <span
                          className="block text-sm"
                          style={{ color: 'var(--ink-soft)' }}
                        >
                          {s.summary}
                        </span>
                      )}
                    </span>
                    <span
                      className="whitespace-nowrap font-mono text-sm"
                      style={{ color: 'var(--ink-soft)' }}
                    >
                      {count === 0
                        ? '준비 중'
                        : progressAvailable
                          ? `${progress?.passed ?? 0} / ${count}`
                          : `${count}문항`}
                    </span>
                  </>
                )

                // 화면에 내는 번호(relativeNo)와 주소에 쓰는 값(s.id)은 다르다.
                // stages.id와 order_no는 더 이상 일치하지 않는다 — 나중에
                // 삽입된 행이 큰 id를 받으면서 그 뒤 단계들의 id와 order_no가
                // 하나씩 어긋났다. order_no로 주소를 만들면 엉뚱한 단계로 간다.
                return count > 0 ? (
                  <Link
                    key={s.id}
                    href={`/train/${s.id}`}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: '1px solid var(--rule)' }}
                  >
                    {row}
                  </Link>
                ) : (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: '1px solid var(--rule)' }}
                  >
                    {row}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
