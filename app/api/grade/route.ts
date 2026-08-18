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
  const { problemId, text, choiceIndex, order, values } = parsed.data

  // 3. 문항 조회 — 사용자 세션으로 읽는다. RLS가 is_active를 걸러준다.
  const { data: problem } = await supabase
    .from('problems')
    .select('id, type, scoring_mode, scoring_config')
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
  const morph = text ? await analyze(text) : null

  // 6. combine() 실행 — 규칙 채점
  const sub: Submission = { text, choiceIndex, order, values }
  const result = combine(problem, sub, answer, morph)

  // 7. submissions 저장 — 실패해도 응답은 정상 반환
  try {
    const { error } = await supabase.from('submissions').insert({
      user_id: user.id,
      problem_id: problemId,
      content: text ?? null,
      char_count: text ? countChars(text) : null,
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

  // 8. 응답 — checks와 status만. 정답·scoring_config는 실리지 않는다.
  return Response.json({
    status: result.status,
    checks: result.checks,
    needsAi: result.needsAi,
    morphAvailable: morph !== null,
  })
}
