import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyze } from '@/lib/scoring/remote'
import { combine, countChars } from '@/lib/scoring'
import type { Answer, Submission } from '@/lib/scoring/types'

// TODO(다음 단계): 킬스위치 확인
//   system_flags.kill_switch 가 true 면 AI 호출 차단
// TODO(다음 단계): 한도 차감
//   consume_ai_quota(user.id, LIMIT) 호출. needsAi 인 경우에만.

const GradeRequestSchema = z.object({
  problemId: z.uuid(),
  text: z.string().max(2000).optional(),
  choiceIndex: z.number().int().optional(),
  order: z.array(z.number().int()).optional(),
  values: z.record(z.string(), z.number()).optional(),
  // fill 유형. 빈칸 key(①②) → 채운 글. 한 칸 500자면 넉넉하다(maxChars 60).
  blanks: z.record(z.string(), z.string().max(500)).optional(),
})

export async function POST(request: NextRequest) {
  // 1. 인증 확인
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2. 입력 검증
  const json = await request.json().catch(() => null)
  const parsed = GradeRequestSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }
  const { problemId, text, choiceIndex, order, values, blanks } = parsed.data

  // 3. 문항 조회 — 사용자 세션으로 읽는다. RLS가 is_active를 걸러준다.
  const { data: problem } = await supabase
    .from('problems')
    .select('id, type, scoring_mode, scoring_config, passage')
    .eq('id', problemId)
    .single()
  if (!problem) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  // 4. 정답 조회 — service_role로만. choice/order/count만 정답이 있다.
  let answer: Answer | undefined
  if (problem.type === 'choice' || problem.type === 'order' || problem.type === 'count') {
    const admin = createAdminClient()
    const { data: answerRow, error } = await admin
      .from('problem_answers')
      .select('answer')
      .eq('problem_id', problemId)
      .single()
    if (error) {
      console.error(
        'problem_answers select failed',
        'code=' + error.code,
        'message=' + error.message,
        'details=' + error.details,
        'hint=' + error.hint,
        'raw=' + JSON.stringify(error)
      )
    }
    answer = answerRow?.answer as Answer | undefined
  }

  // 5. 형태소 분석 호출 — 실패해도 계속. morph = null
  //    fill 은 text 가 없고 형태소 검사도 없다 — analyze 를 부르지 않는다.
  const morph = text ? await analyze(text) : null

  // 6. combine() 실행 — 규칙 채점. passage 는 forbidPassageCopy 만 쓴다.
  const sub: Submission = { text, choiceIndex, order, values, blanks }
  const result = combine(problem, sub, answer, morph, problem.passage ?? undefined)

  // fill 은 빈칸을 선언 순서대로 이어 붙여 submissions.content 에 남긴다.
  // 나중에 사람이 답안을 되짚을 때 어느 칸에 뭘 썼는지 보이게 표식을 붙인다.
  let content = text ?? null
  if (problem.type === 'fill' && blanks) {
    const cfg = (problem.scoring_config ?? {}) as { blanks?: { key: string }[] }
    const order = (cfg.blanks ?? []).map((b) => b.key)
    const joined = order
      .map((k) => (blanks[k] ?? '').trim())
      .map((v, i) => (v ? `${order[i]}  ${v}` : null))
      .filter(Boolean)
      .join('\n')
    content = joined || null
  }

  // 7. submissions 저장 — 실패해도 응답은 정상 반환
  try {
    const { error } = await supabase.from('submissions').insert({
      user_id: user.id,
      problem_id: problemId,
      content,
      char_count: content ? countChars(content) : null,
      auto_result: { checks: result.checks, morphAvailable: morph !== null },
      passed: result.status === 'pass',
    })
    if (error) {
      console.error(
        'submissions insert failed',
        'code=' + error.code,
        'message=' + error.message,
        'details=' + error.details,
        'hint=' + error.hint,
        'raw=' + JSON.stringify(error)
      )
    }
  } catch (err) {
    console.error('submissions insert failed', err)
  }

  // 8. 모범답안을 읽어 함께 내려보낸다(stage2 자기점검이 화면에 보여줄 것).
  //    10단계 fill 만이 아니라 비-fill 문항(1단계 reduce_adverb 등)도 모범답안이
  //    있을 수 있어 유형을 안 가리고 읽는다 — reference_answers 에 행이 없으면
  //    빈 배열이다. RLS 정책이 방금 넣은 submissions 행을 보고 통과시킨다 —
  //    제출이 저장되지 않았으면 0행이 온다. 채점 정답이 아니므로 pass/fail 과
  //    무관하게 내려보내고, 언제 보여줄지는 화면이 정한다.
  const { data: refData, error: refError } = await supabase
    .from('reference_answers')
    .select('ord, blank_key, content')
    .eq('problem_id', problemId)
    .order('ord')
    .order('blank_key')
  if (refError) {
    console.error('reference_answers select failed', 'message=' + refError.message)
  }
  const reference: { ord: number; blank_key: string; content: string }[] = refData ?? []

  // 9. 응답 — checks와 status만. 정답·scoring_config는 실리지 않는다.
  return Response.json({
    status: result.status,
    checks: result.checks,
    needsAi: result.needsAi,
    morphAvailable: morph !== null,
    reference,
  })
}
