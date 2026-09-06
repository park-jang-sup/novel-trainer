import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyze } from '@/lib/scoring/remote'
import { combine, countChars } from '@/lib/scoring'
import { splitSentences } from '@/lib/scoring/local'
import { shadowKinds, type Answer, type ScoringConfig, type Submission } from '@/lib/scoring/types'
import { readFlags, sumSpendTodayUsd, type SystemFlags } from '@/lib/ai/flags'
import { checkGate, DAILY_CALL_LIMIT } from '@/lib/ai/gate'
import { consumeAiQuota } from '@/lib/quota'
import { callGemini, DEFAULT_MODEL } from '@/lib/ai/gemini'
import { judgeHintWith, judgeSupportWith, judgeTellWith } from '@/lib/ai/observe'
import {
  PROMPT_VERSION_HINT,
  PROMPT_VERSION_SUPPORT,
  PROMPT_VERSION_TELL,
  verifyHintJudgment,
  verifySupportJudgment,
  verifyTellJudgment,
  type HintObservation,
  type SupportObservation,
  type SupportVerdict,
  type TellObservation,
  type TellVerdict,
} from '@/lib/ai/prompt'
import { buildHintCardText } from '@/lib/ai/hint-text'

// TODO(다음 단계): needsAi(ai/hybrid scoring_mode) 문항의 AI 채점.
//   결정타 빌드업 섀도(ai_shadow: 'support')와는 다른 자리다 — 저건 통과에
//   안 쓰는 섀도, 이건 통과 판정 자체를 AI 에 맡기는 자리(원칙 4 재개 전까지 보류).

/**
 * 결정타 빌드업 섀도(support-v3) 판정. **기본은 섀도 모드다** — 결과가
 * submissions.is_passed·진도에 안 실린다(세션 32 섀도 모드 원칙). 세션 43 이
 * 그 원칙에 **정확히 한 갈래**(no_beat, system_flags.shadow_gate_no_beat 가
 * true 일 때만) 예외를 열었다 — 호출부(POST)가 그 gating 판단을 한다, 이
 * 함수는 판정만 낸다. 실패해도 응답은 정상 반환한다: gate 가 닫혔거나
 * 호출이 깨지면 조용히 pending 이다.
 *
 * 순서: **kill_switch 확인(캐시보다 먼저!) → 캐시 조회(hash) → 없으면 나머지
 * gate(api_key·spend_cap·quota) → judgeSupportWith → verifySupportJudgment
 * → beat_mismatch·quote_mismatch 면 재시도 1회 → 그래도 안 서면 pending.**
 * 실제 판정(buildup·none·support_not_before·no_beat)만 캐시에 적는다 —
 * pending 을 캐시하면 같은 답안이 다음에도 재시도할 기회를 영영 못 얻는다.
 * no_beat 는 재시도 대상이 아니다(verifySupportJudgment 주석 참고) — AI 가
 * "결정타가 없다"고 정직하게 답한 것이라 그대로 최종 판정으로 캐시한다.
 *
 * ★ 킬스위치가 캐시보다 먼저인 이유(세션 44, 박 님 실사용 발견). 킬스위치를
 * 켜고 시험하다가 이전에 캐시된 판정이 그대로 나오는 것을 봤다 — **캐시된
 * 판정도 AI 판정이다.** 킬스위치는 "AI 판정 전면 정지"이지 "새 호출만 정지"가
 * 아니다. spend_cap·quota 는 비용 문제라 캐시 사용(비용 0)을 막을 이유가
 * 없어 그대로 캐시 뒤에 둔다 — 킬스위치만 방향이 다르다. flags.killSwitch 가
 * null(못 읽음)이어도 닫힌 것으로 친다 — gate.ts checkGateBeforeQuota 와
 * 같은 방향(못 읽으면 막는다). ★★ 세션 45 — 이 순서를 tell(computeTellShadow)·
 * 힌트(computeHint) 에도 그대로 복제한다. 세 함수를 하나로 묶지 않았다 —
 * `observeWith`·`observePointWith`·`judgeSupportWith` 가 이미 그렇듯, 묶으면
 * 한쪽을 고칠 때 다른 쪽이 조용히 따라 움직인다(observe.ts 관례).
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
  normalized: string,
  flags: SystemFlags
): Promise<ShadowResult> {
  const model = DEFAULT_MODEL

  // ★ 킬스위치가 캐시보다 먼저다(세션 44) — 캐시된 판정도 AI 판정이라
  //   킬스위치를 캐시가 앞지르면 안 된다. null(못 읽음)도 닫힌 것으로 친다.
  if (flags.killSwitch === null || flags.killSwitch) return { verdict: 'pending' }

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

/**
 * 느낌어 판정(tell) 관측. **gating 없다** — support 의 no_beat 부분
 * gating(세션 43)과 다른 층이다. computeShadow() 와 순서·캐시 규칙이
 * 글자까지 같다(세션 45 — 세션 44 의 킬스위치→캐시 순서를 그대로 복제).
 * 다른 것은 verdict 종류(show·tell)와 재시도 조건(quote_mismatch 하나)뿐이다.
 */
interface TellResult {
  verdict: TellVerdict | 'pending'
  tell_line?: number | null
  quote?: string
}

async function computeTellShadow(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  problemId: string,
  normalized: string,
  flags: SystemFlags
): Promise<TellResult> {
  const model = DEFAULT_MODEL

  // ★ 킬스위치가 캐시보다 먼저다(세션 44 순서를 tell 에도 그대로 쓴다 — 세션 45).
  if (flags.killSwitch === null || flags.killSwitch) return { verdict: 'pending' }

  const hash = createHash('sha256')
    .update(`${normalized} ${problemId} ${PROMPT_VERSION_TELL} ${model}`)
    .digest('hex')

  const { data: cached } = await admin
    .from('ai_shadow_cache')
    .select('verdict, judgment')
    .eq('hash', hash)
    .maybeSingle()
  if (cached) {
    const j = cached.judgment as TellObservation
    return { verdict: cached.verdict as TellVerdict, tell_line: j.tell_line, quote: j.quote }
  }

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

  let verdict: TellVerdict | 'pending' = 'pending'
  let observation: TellObservation | null = null

  // 재시도 1회 — quote_mismatch 일 때만(support 와 같은 자리).
  for (let attempt = 0; attempt < 2; attempt++) {
    const outcome = await judgeTellWith(callGemini, normalized, model)

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
      if (error) console.error('ai_usage_log insert failed(tell)', 'message=' + error.message)
    }

    if (!outcome.ok || !outcome.observation) break // pending

    const v = verifyTellJudgment(normalized, outcome.observation)
    if (v.verdict === 'quote_mismatch') continue // 재시도

    verdict = v.verdict
    observation = outcome.observation
    break
  }

  if (observation && (verdict === 'show' || verdict === 'tell')) {
    const { error } = await admin.from('ai_shadow_cache').insert({
      hash,
      problem_id: problemId,
      prompt_version: PROMPT_VERSION_TELL,
      model,
      judgment: observation,
      verdict,
    })
    if (error) console.error('ai_shadow_cache insert failed(tell)', 'message=' + error.message)
  }

  return observation
    ? { verdict, tell_line: observation.tell_line, quote: observation.quote }
    : { verdict: 'pending' }
}

/**
 * 힌트(hint) 2·3층 관측. support 판정이 실패 세 verdict(none·no_beat·
 * support_not_before) 중 하나일 때만 호출부가 부른다(비용 절약). 킬스위치→
 * 캐시 순서는 computeShadow() 와 같다(세션 44 순서 재사용, 세션 45).
 *
 * ★ 재시도가 없다 — "인용 검증 없이는 판정 폐기"가 원칙이다. 힌트는
 *   실패해도 학습자에게 티 나지 않는다(1층 문구만 남는다) — 재시도로
 *   억지로 세울 이유가 없다. verifyHintJudgment 가 'discard' 를 내면
 *   그대로 'pending' 으로 접는다 — 'ok' 만 캐시한다.
 */
interface HintResult {
  verdict: 'ok' | 'pending'
  insert_before?: number | null
  source_line?: number | null
  source_quote?: string
}

async function computeHint(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  problemId: string,
  normalized: string,
  passage: string,
  flags: SystemFlags
): Promise<HintResult> {
  const model = DEFAULT_MODEL

  // ★ 킬스위치가 캐시보다 먼저다(세션 44 순서를 힌트에도 그대로 쓴다 — 세션 45).
  if (flags.killSwitch === null || flags.killSwitch) return { verdict: 'pending' }

  const hash = createHash('sha256')
    .update(`${normalized} ${problemId} ${PROMPT_VERSION_HINT} ${model}`)
    .digest('hex')

  const { data: cached } = await admin
    .from('ai_shadow_cache')
    .select('verdict, judgment')
    .eq('hash', hash)
    .maybeSingle()
  if (cached) {
    const j = cached.judgment as HintObservation
    return { verdict: 'ok', insert_before: j.insert_before, source_line: j.source_line, source_quote: j.source_quote }
  }

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

  const outcome = await judgeHintWith(callGemini, normalized, passage, model)

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
    if (error) console.error('ai_usage_log insert failed(hint)', 'message=' + error.message)
  }

  if (!outcome.ok || !outcome.observation) return { verdict: 'pending' }

  const v = verifyHintJudgment(normalized, passage, outcome.observation)
  if (v.verdict !== 'ok') return { verdict: 'pending' } // 폐기 — 캐시 안 함

  const { error } = await admin.from('ai_shadow_cache').insert({
    hash,
    problem_id: problemId,
    prompt_version: PROMPT_VERSION_HINT,
    model,
    judgment: outcome.observation,
    verdict: 'ok',
  })
  if (error) console.error('ai_shadow_cache insert failed(hint)', 'message=' + error.message)

  return {
    verdict: 'ok',
    insert_before: outcome.observation.insert_before,
    source_line: outcome.observation.source_line,
    source_quote: outcome.observation.source_quote,
  }
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

  // 7. AI 섀도 셋(결정타 빌드업 support-v3 · 느낌어 판정 tell · 힌트) —
  //    **submissions.insert 보다 앞에 온다**(세션 43·45). no_beat 부분
  //    gating 이 is_passed 에 반영되려면 저장 전에 판정이 서 있어야 한다.
  //    규칙 판정이 pass 이고 scoring_config.ai_shadow(shadowKinds — 문자열도
  //    배열도 읽는다, 세션 45)가 켠 것만 잰다.
  //
  //    gating 조건은 **verdict === 'no_beat' 딱 하나**다 — pending(킬스위치·
  //    상한·키 없음·호출 실패 전부 포함)·beat_mismatch·quote_mismatch·none·
  //    support_not_before 는 지금처럼 안 막는다. flags.shadowGateNoBeat 가
  //    false(기본값, system_flags 행이 없어도 false)면 gating 자체가 안 선다
  //    — "AI 가 없으면 규칙 통과를 그대로 둔다"는 원칙의 반대쪽도 같다:
  //    이 스위치가 없어도 학습자 진도는 안 막힌다.
  //
  //    tell·힌트는 **gating 이 없다** — 관측 층이다. 힌트는 support 가 실패
  //    세 verdict(none·no_beat·support_not_before) 중 하나일 때만 별도로
  //    부른다(buildup·pending·beat_mismatch·quote_mismatch 면 안 부른다 —
  //    비용 절약). 힌트 카드 문구는 AI 가 안 짓는다 — buildHintCardText
  //    (순수 함수, lib/ai/hint-text.ts)가 지목된 사실만으로 짓는다.
  let shadow: ShadowResult | undefined
  let gatedNoBeat = false
  let tell: TellResult | undefined
  let hintText: string | null = null

  const cfg = (problem.scoring_config ?? {}) as ScoringConfig
  const kinds = shadowKinds(cfg)

  if (result.status === 'pass' && kinds.length > 0 && text && text.trim()) {
    const normalized = text.trim()
    const flags = await readFlags()
    const admin = createAdminClient()

    if (kinds.includes('support')) {
      try {
        shadow = await computeShadow(admin, user.id, problemId, normalized, flags)
      } catch (err) {
        console.error('결정타 빌드업 섀도 실패(조용히 pending 취급)', err)
        shadow = { verdict: 'pending' }
      }
      if (flags.shadowGateNoBeat && shadow.verdict === 'no_beat') {
        gatedNoBeat = true
      }
    }

    if (kinds.includes('tell')) {
      try {
        tell = await computeTellShadow(admin, user.id, problemId, normalized, flags)
      } catch (err) {
        console.error('느낌어 판정(tell) 실패(조용히 pending 취급)', err)
        tell = { verdict: 'pending' }
      }
    }

    if (
      shadow &&
      (shadow.verdict === 'none' || shadow.verdict === 'no_beat' || shadow.verdict === 'support_not_before') &&
      problem.passage &&
      cfg.requireAll?.[0]
    ) {
      try {
        const hint = await computeHint(admin, user.id, problemId, normalized, problem.passage, flags)
        if (hint.verdict === 'ok') {
          const S = splitSentences(normalized)
          hintText = buildHintCardText({
            supportVerdict: shadow.verdict,
            person: cfg.requireAll[0],
            beatText: shadow.beat_line != null ? (S[shadow.beat_line - 1] ?? null) : null,
            supportQuote: shadow.quote ?? null,
            sourceQuote: hint.source_quote ?? '',
            beforeText: hint.insert_before != null ? (S[hint.insert_before - 1] ?? null) : null,
          })
        }
      } catch (err) {
        console.error('힌트 실패(조용히 무시 — 1층 문구만 남는다)', err)
      }
    }
  }

  // 규칙 판정이 서고 gating 이 반영된 최종 통과 여부. combine() 의 result.status
  // 는 안 바꾼다(순수 규칙 판정 기록으로 남긴다) — passed 만 gating 을 반영한다.
  const passed = result.status === 'pass' && !gatedNoBeat

  // 8. submissions 저장 — 실패해도 응답은 정상 반환. auto_result 에 shadow·
  //    tell verdict 를 적어 둔다(세션 43·45 — 나중에 오판 추적용) · gating
  //    으로 막힌 제출은 no_beat_gate: true 로 표시한다.
  try {
    const { error } = await supabase.from('submissions').insert({
      user_id: user.id,
      problem_id: problemId,
      content,
      char_count: content ? countChars(content) : null,
      auto_result: {
        checks: result.checks,
        morphAvailable: morph !== null,
        ...(shadow ? { shadow: shadow.verdict } : {}),
        ...(gatedNoBeat ? { no_beat_gate: true } : {}),
        ...(tell ? { tell: tell.verdict } : {}),
        ...(hintText ? { hint: true } : {}),
      },
      passed,
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

  // 9. 모범답안을 읽어 함께 내려보낸다(stage2 자기점검이 화면에 보여줄 것).
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

  // 10. 응답. status 는 gating 이 걸리면 'fail' 로 낸다 — 화면이 통과 카드
  //     대신 gatedNoBeat 문구를 보여줄 신호다. 정답·scoring_config는 안 싣는다.
  //     hint 는 이미 완성된 한국어 문장이다(서버가 지었다) — 화면은 그대로
  //     보여주기만 한다.
  return Response.json({
    status: gatedNoBeat ? 'fail' : result.status,
    checks: result.checks,
    needsAi: result.needsAi,
    morphAvailable: morph !== null,
    reference,
    shadow,
    ...(gatedNoBeat ? { gatedNoBeat: true } : {}),
    ...(tell ? { tell: { verdict: tell.verdict, quote: tell.quote } } : {}),
    ...(hintText ? { hint: hintText } : {}),
  })
}
