import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyze } from '@/lib/scoring/remote'
import { combine, countChars } from '@/lib/scoring'
import type { Answer, ScoringConfig, Submission } from '@/lib/scoring/types'
import { readFlags, sumSpendTodayUsd } from '@/lib/ai/flags'
import { checkGate, DAILY_CALL_LIMIT } from '@/lib/ai/gate'
import { consumeAiQuota } from '@/lib/quota'
import { callGemini, DEFAULT_MODEL } from '@/lib/ai/gemini'
import { judgeSupportWith } from '@/lib/ai/observe'
import { PROMPT_VERSION_SUPPORT, verifySupportJudgment, type SupportObservation, type SupportVerdict } from '@/lib/ai/prompt'

// TODO(다음 단계): needsAi(ai/hybrid scoring_mode) 문항의 AI 채점.
//   결정타 빌드업 섀도(ai_shadow: 'support')와는 다른 자리다 — 저건 통과에
//   안 쓰는 섀도, 이건 통과 판정 자체를 AI 에 맡기는 자리(원칙 4 재개 전까지 보류).

/**
 * 결정타 빌드업 섀도(support-v3) 판정. **섀도 모드다** — 결과가 submissions.
 * is_passed·진도에 안 실린다(세션 32 섀도 모드 원칙). 실패해도 응답은 정상
 * 반환한다: gate 가 닫혔거나 호출이 깨지면 조용히 pending 이다.
 *
 * 순서: 캐시 조회(hash) → 없으면 gate → judgeSupportWith → verifySupportJudgment
 * → beat_mismatch·quote_mismatch 면 재시도 1회 → 그래도 안 서면 pending.
 * 실제 판정(buildup·none·support_not_before·no_beat)만 캐시에 적는다 —
 * pending 을 캐시하면 같은 답안이 다음에도 재시도할 기회를 영영 못 얻는다.
 * no_beat 는 재시도 대상이 아니다(verifySupportJudgment 주석 참고) — AI 가
 * "결정타가 없다"고 정직하게 답한 것이라 그대로 최종 판정으로 캐시한다.
 */
interface ShadowResult {
  verdict: SupportVerdict | 'pending'
  beat_line?: number | null
  support_line?: number | null
  quote?: string
}

async function computeShadow(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  problemId: string,
  normalized: string
): Promise<ShadowResult> {
  const model = DEFAULT_MODEL
  const hash = createHash('sha256')
    .update(`${normalized} ${problemId} ${PROMPT_VERSION_SUPPORT} ${model}`)
    .digest('hex')

  const { data: cached } = await admin
    .from('ai_shadow_cache')
    .select('verdict, judgment')
    .eq('hash', hash)
    .maybeSingle()
  if (cached) {
    const j = cached.judgment as SupportObservation
    return { verdict: cached.verdict as SupportVerdict, beat_line: j.beat_line, support_line: j.support_line, quote: j.quote }
  }

  const flags = await readFlags()
  let quotaRemaining: number | null = null
  try {
    quotaRemaining = await consumeAiQuota(userId, DAILY_CALL_LIMIT)
  } catch {
    quotaRemaining = null
  }
  const gate = checkGate({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    killSwitch: flags.killSwitch,
    dailySpendCapUsd: flags.dailySpendCapUsd,
    spentTodayUsd: await sumSpendTodayUsd(),
    quotaRemaining,
  })
  if (!gate.allow) return { verdict: 'pending' }

  let verdict: SupportVerdict | 'pending' = 'pending'
  let observation: SupportObservation | null = null

  // 재시도 1회 — beat_mismatch·quote_mismatch 일 때만. call_failed·not_json·
  // bad_shape 는 여기서 다시 안 건다(gemini.ts 의 네트워크 재시도와 다른 층이다).
  for (let attempt = 0; attempt < 2; attempt++) {
    const outcome = await judgeSupportWith(callGemini, normalized, model)

    // 돈을 태웠으면 먼저 적는다 — 관측이 깨져도 토큰은 나갔다.
    if (outcome.usage) {
      const { error } = await admin.from('ai_usage_log').insert({
        user_id: userId,
        submission_id: null,
        model: outcome.model,
        input_tokens: outcome.usage.inputTokens,
        cached_tokens: outcome.usage.cachedTokens,
        output_tokens: outcome.usage.outputTokens,
        cost_usd: outcome.costUsd,
      })
      if (error) console.error('ai_usage_log insert failed(shadow)', 'message=' + error.message)
    }

    if (!outcome.ok || !outcome.observation) break // pending

    const v = verifySupportJudgment(normalized, outcome.observation)
    if (v.verdict === 'beat_mismatch' || v.verdict === 'quote_mismatch') continue // 재시도

    verdict = v.verdict
    observation = outcome.observation
    break
  }

  if (observation && (verdict === 'buildup' || verdict === 'none' || verdict === 'support_not_before' || verdict === 'no_beat')) {
    const { error } = await admin.from('ai_shadow_cache').insert({
      hash,
      problem_id: problemId,
      prompt_version: PROMPT_VERSION_SUPPORT,
      model,
      judgment: observation,
      verdict,
    })
    if (error) console.error('ai_shadow_cache insert failed', 'message=' + error.message)
  }

  return observation
    ? { verdict, beat_line: observation.beat_line, support_line: observation.support_line, quote: observation.quote }
    : { verdict: 'pending' }
}

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

  // 8.5. 결정타 빌드업 섀도(support-v2) — **섀도 모드다.** 위 result.status ·
  //      submissions.insert(passed) 는 이 블록과 무관하게 이미 끝났다. 규칙
  //      판정이 pass 이고 이 문항이 ai_shadow: 'support' 를 켰을 때만 잰다.
  let shadow: { verdict: SupportVerdict | 'pending'; beat_line?: number | null; support_line?: number | null; quote?: string } | undefined
  const cfg = (problem.scoring_config ?? {}) as ScoringConfig
  if (result.status === 'pass' && cfg.ai_shadow === 'support' && text && text.trim()) {
    try {
      shadow = await computeShadow(createAdminClient(), user.id, problemId, text.trim())
    } catch (err) {
      console.error('결정타 빌드업 섀도 실패(조용히 pending 취급)', err)
      shadow = { verdict: 'pending' }
    }
  }

  // 9. 응답 — checks와 status만. 정답·scoring_config는 실리지 않는다.
  return Response.json({
    status: result.status,
    checks: result.checks,
    needsAi: result.needsAi,
    morphAvailable: morph !== null,
    reference,
    shadow,
  })
}
