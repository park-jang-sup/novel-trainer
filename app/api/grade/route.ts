import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyze } from '@/lib/scoring/remote'
import { combine, countChars } from '@/lib/scoring'
import { shadowKinds, type Answer, type Check, type ScoringConfig, type Submission } from '@/lib/scoring/types'
import { diffChecks, resubmitLine } from '@/lib/scoring/resubmit'
import { readFlags, sumSpendTodayUsd, type SystemFlags } from '@/lib/ai/flags'
import { checkGate, DAILY_CALL_LIMIT } from '@/lib/ai/gate'
import { consumeAiQuota } from '@/lib/quota'
import { callGemini, DEFAULT_MODEL } from '@/lib/ai/gemini'
import { judgeHintV2With, judgeHintV3WithRetry, judgeHintWith, judgeSignalWith, judgeSupportWith, judgeTellWith } from '@/lib/ai/observe'
import {
  PROMPT_VERSION_HINT,
  PROMPT_VERSION_HINT_V2,
  PROMPT_VERSION_HINT_V3,
  PROMPT_VERSION_SIGNAL,
  PROMPT_VERSION_SUPPORT,
  PROMPT_VERSION_TELL,
  verifyHintJudgment,
  verifyHintV2,
  verifySignalJudgment,
  verifySupportJudgment,
  verifyTellJudgment,
  type HintObservation,
  type HintV2Verdict,
  type SignalObservation,
  type SignalVerdict,
  type SupportObservation,
  type SupportVerdict,
  type TellObservation,
  type TellVerdict,
} from '@/lib/ai/prompt'
import { buildNoBeatGateCardText, buildSignalCardText, buildTellCardText, resolveHintMaterial } from '@/lib/ai/hint-text'

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
 * 절단 신호(signal) 관측(세션 47) — 구성 16 cliffhanger_adv(ca-) 전용.
 * **gating 없다** — computeTellShadow() 와 순서·캐시 규칙이 글자까지
 * 같다(세션 44 킬스위치→캐시 순서를 그대로 복제). 다른 것은 verdict
 * 종류(signal·no_signal)와 재시도 조건(quote_mismatch 하나)뿐이다.
 */
interface SignalResult {
  verdict: SignalVerdict | 'pending'
  signal_line?: number | null
  quote?: string
}

async function computeSignalShadow(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  problemId: string,
  normalized: string,
  flags: SystemFlags
): Promise<SignalResult> {
  const model = DEFAULT_MODEL

  // ★ 킬스위치가 캐시보다 먼저다(세션 44 순서를 signal 에도 그대로 쓴다 — 세션 47).
  if (flags.killSwitch === null || flags.killSwitch) return { verdict: 'pending' }

  const hash = createHash('sha256')
    .update(`${normalized} ${problemId} ${PROMPT_VERSION_SIGNAL} ${model}`)
    .digest('hex')

  const { data: cached } = await admin
    .from('ai_shadow_cache')
    .select('verdict, judgment')
    .eq('hash', hash)
    .maybeSingle()
  if (cached) {
    const j = cached.judgment as SignalObservation
    return { verdict: cached.verdict as SignalVerdict, signal_line: j.signal_line, quote: j.quote }
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

  let verdict: SignalVerdict | 'pending' = 'pending'
  let observation: SignalObservation | null = null

  // 재시도 1회 — quote_mismatch 일 때만(tell 과 같은 자리).
  for (let attempt = 0; attempt < 2; attempt++) {
    const outcome = await judgeSignalWith(callGemini, normalized, model)

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
      if (error) console.error('ai_usage_log insert failed(signal)', 'message=' + error.message)
    }

    if (!outcome.ok || !outcome.observation) break // pending

    const v = verifySignalJudgment(normalized, outcome.observation)
    if (v.verdict === 'quote_mismatch') continue // 재시도

    verdict = v.verdict
    observation = outcome.observation
    break
  }

  if (observation && (verdict === 'signal' || verdict === 'no_signal')) {
    const { error } = await admin.from('ai_shadow_cache').insert({
      hash,
      problem_id: problemId,
      prompt_version: PROMPT_VERSION_SIGNAL,
      model,
      judgment: observation,
      verdict,
    })
    if (error) console.error('ai_shadow_cache insert failed(signal)', 'message=' + error.message)
  }

  return observation
    ? { verdict, signal_line: observation.signal_line, quote: observation.quote }
    : { verdict: 'pending' }
}

/**
 * 힌트(hint) v1 관측 — **세션 46 부터 안 부른다.** 박 님 실사용 반려
 * 사유: 템플릿 + 인용 조립이 "사람 말이 아니다", 결함 원문 문항에선
 * "지우라고 가르치는" 문장을 재료로 짚었다. 아래 computeHintV2 가
 * 대신한다(AI 가 직접 짧은 코칭 문장을 쓰고 제약만 검증). 함수는 지우지
 * 않고 둔다(박 님 지시 — hint-v1 코드·캐시는 보존) — verify.ts 의 기존
 * 픽스처가 계속 서 있고, prompt.ts·observe.ts 의 v1 조각도 그대로다.
 *
 * (세션 45 원문 주석) support 판정이 실패 세 verdict(none·no_beat·
 * support_not_before) 중 하나일 때만 호출부가 부른다(비용 절약). 킬스위치→
 * 캐시 순서는 computeShadow() 와 같다(세션 44 순서 재사용).
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

/**
 * 힌트 v2(세션 46) — AI 가 2~3문장 코칭 문장을 직접 쓴다. computeHint(v1)
 * 와 킬스위치→캐시 순서가 글자까지 같다(세션 44 순서를 그대로 복제). 다른
 * 것은 프롬프트(구조화 JSON 대신 자유 텍스트)와 검증(verifyHintV2 — 길이·
 * 인용·문체 네 제약)뿐이다.
 *
 * ★ **재시도가 없다** — v1 과 같은 이유("인용 검증 없이는 판정 폐기").
 * ★★ 이 함수는 **hint_visible 플래그를 안 본다** — 노출은 호출부(POST)의
 *   몫이다. 여기는 항상 계산·캐시한다(system_flags.hint_visible 이 false
 *   여도) — 세션 46 지시: "false 면 계산·기록만, 화면엔 안 띄움". 계산까지
 *   막는 건 이 함수가 아니라 킬스위치·gate 뿐이다.
 */
interface HintV2Result {
  verdict: 'ok' | 'pending'
  text?: string
}

async function computeHintV2(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  problemId: string,
  normalized: string,
  material: string,
  person: string,
  opponent: string,
  verdict: HintV2Verdict,
  flags: SystemFlags
): Promise<HintV2Result> {
  const model = DEFAULT_MODEL

  // ★ 킬스위치가 캐시보다 먼저다(세션 44 순서를 힌트 v2 에도 그대로 쓴다 — 세션 46).
  if (flags.killSwitch === null || flags.killSwitch) return { verdict: 'pending' }

  const hash = createHash('sha256')
    .update(`${normalized} ${problemId} ${PROMPT_VERSION_HINT_V2} ${model}`)
    .digest('hex')

  const { data: cached } = await admin
    .from('ai_shadow_cache')
    .select('verdict, judgment')
    .eq('hash', hash)
    .maybeSingle()
  if (cached) {
    const j = cached.judgment as { text: string }
    return { verdict: 'ok', text: j.text }
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

  const outcome = await judgeHintV2With(callGemini, normalized, material, person, opponent, verdict, model)

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
    if (error) console.error('ai_usage_log insert failed(hint-v2)', 'message=' + error.message)
  }

  if (!outcome.ok || !outcome.text) return { verdict: 'pending' }

  const check = verifyHintV2(outcome.text, normalized)
  if (!check.ok) return { verdict: 'pending' } // 폐기 — 캐시 안 함(인용 검증 없이는 판정 폐기)

  const { error } = await admin.from('ai_shadow_cache').insert({
    hash,
    problem_id: problemId,
    prompt_version: PROMPT_VERSION_HINT_V2,
    model,
    judgment: { text: outcome.text },
    verdict: 'ok',
  })
  if (error) console.error('ai_shadow_cache insert failed(hint-v2)', 'message=' + error.message)

  return { verdict: 'ok', text: outcome.text }
}

/**
 * 힌트 v3(세션 47) — computeHintV2 와 킬스위치→캐시 순서가 글자까지
 * 같다. **route.ts 는 이제 v3 를 부른다** — v2 함수는 지우지 않고 둔다
 * (v1→v2 전환 때와 같은 이유, 박 님 지시 — 옛 버전 코드·캐시는 보존).
 * 다른 것은 프롬프트(few-shot·비계 용어/메타 지시 금지)와 검증
 * (verifyHintV3 — 길이 160자·금지어·문장 번호 검사 추가)뿐이다.
 *
 * ★ 세션 50, 2-A — 재시도·캐시 정책을 새로 정했다("v2 와 같은 모양"이라던
 *   세션 47 주석은 틀렸다, 박 님이 채팅에서 정정). judgeHintV3WithRetry
 *   (observe.ts)가 검증 실패 시 1회 재시도한다 — **DB 는 여기서만 만진다**:
 *   두 시도 다 ai_usage_log 에 정상 기록하고, 최종 시도가 통과하면 그
 *   본문을 캐시(verdict 'ok'), 재시도까지 실패하면 캐시에 verdict
 *   'discarded' 를 남겨(judgment: {text:null, reasons}) 같은 답안을 다시
 *   안 부른다 — "재시도해도 안 되는 답안은 세 번째도 안 될 확률이 높다"
 *   (박 님). 캐시 조회는 'discarded' 를 보면 즉시 pending 으로 접는다.
 *   학습자 화면은 어느 쪽이든 같다(힌트 없이 1층 문구만) — 진도엔 무영향.
 *   ★ discarded 캐시는 프롬프트 **버전을 올려야** 풀린다(해시에 prompt_
 *   version 이 들어간다) — 문안만 손보고 버전을 그대로 두면 그 답안들은
 *   계속 힌트를 못 받는다. 문안을 고칠 땐 버전을 같이 올리거나
 *   `delete from ai_shadow_cache where verdict='discarded'` 를 같이 낸다.
 *   ★ ai_shadow_cache 권한은 select·insert 뿐(update·upsert 없음) — 같은
 *   해시 재삽입은 기본키 충돌이 나지만 캐시 조회가 먼저라 정상 흐름에선
 *   안 난다. 경합으로 충돌해도 기존처럼 console.error 만 남기고 진행한다
 *   (판정에 영향 없음).
 */
async function computeHintV3(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  problemId: string,
  normalized: string,
  material: string,
  person: string,
  opponent: string,
  verdict: HintV2Verdict,
  flags: SystemFlags
): Promise<HintV2Result> {
  const model = DEFAULT_MODEL

  // ★ 킬스위치가 캐시보다 먼저다(세션 44 순서를 힌트 v3 에도 그대로 쓴다 — 세션 47).
  if (flags.killSwitch === null || flags.killSwitch) return { verdict: 'pending' }

  const hash = createHash('sha256')
    .update(`${normalized} ${problemId} ${PROMPT_VERSION_HINT_V3} ${model}`)
    .digest('hex')

  const { data: cached } = await admin
    .from('ai_shadow_cache')
    .select('verdict, judgment')
    .eq('hash', hash)
    .maybeSingle()
  if (cached) {
    if (cached.verdict === 'discarded') return { verdict: 'pending' }
    const j = cached.judgment as { text: string }
    return { verdict: 'ok', text: j.text }
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

  const attempts = await judgeHintV3WithRetry(callGemini, normalized, material, person, opponent, verdict, model)

  for (const attempt of attempts) {
    if (attempt.outcome.usage) {
      const { error } = await admin.from('ai_usage_log').insert({
        user_id: userId,
        submission_id: null,
        model: attempt.outcome.model,
        input_tokens: attempt.outcome.usage.inputTokens,
        cached_tokens: attempt.outcome.usage.cachedTokens,
        output_tokens: attempt.outcome.usage.outputTokens,
        cost_usd: attempt.outcome.costUsd,
      })
      if (error) console.error('ai_usage_log insert failed(hint-v3)', 'message=' + error.message)
    }
  }

  const last = attempts[attempts.length - 1]
  if (!last.outcome.ok || !last.outcome.text) return { verdict: 'pending' }

  if (last.check && last.check.ok) {
    const { error } = await admin.from('ai_shadow_cache').insert({
      hash,
      problem_id: problemId,
      prompt_version: PROMPT_VERSION_HINT_V3,
      model,
      judgment: { text: last.outcome.text },
      verdict: 'ok',
    })
    if (error) console.error('ai_shadow_cache insert failed(hint-v3)', 'message=' + error.message)
    return { verdict: 'ok', text: last.outcome.text }
  }

  // 재시도까지 실패 — 'discarded' 로 남겨 같은 답안을 다시 안 부른다.
  const { error } = await admin.from('ai_shadow_cache').insert({
    hash,
    problem_id: problemId,
    prompt_version: PROMPT_VERSION_HINT_V3,
    model,
    judgment: { text: null, reasons: last.check?.reasons ?? [] },
    verdict: 'discarded',
  })
  if (error) console.error('ai_shadow_cache insert failed(hint-v3 discarded)', 'message=' + error.message)
  return { verdict: 'pending' }
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
  //    tell·signal 은 **gating 이 없다** — 관측 층이다(signal 은 구성 16
  //    ca- 전용, 세션 47). 힌트(v3, 세션 47부터 v2 대신 이걸 부른다)는
  //    support 가 실패 세 verdict(none·no_beat·support_not_before) 중
  //    하나일 때만 별도로 부른다(buildup·pending·beat_mismatch·quote_
  //    mismatch 면 안 부른다 — 비용 절약). ★★ 힌트는 flags.hintVisible 과
  //    무관하게 **항상** 계산·캐시된다(세션 46) — hintVisible 이 gating
  //    하는 건 오직 응답에 싣느냐뿐이다(계산은 안 막는다, 화면 노출만
  //    막는다). 카드 문구는 tell·signal·gatedNoBeat 셋 다 서버가 순수
  //    함수(lib/ai/hint-text.ts)로 짓는다 — AI 는 지목·서술만, 프로즈는
  //    AI 가 안 쓴다는 원칙을 tell·no_beat·signal 카드에도 확장한다.
  let shadow: ShadowResult | undefined
  let gatedNoBeat = false
  let gatedNoBeatText: string | undefined
  let tell: TellResult | undefined
  let tellText: string | undefined
  let signal: SignalResult | undefined
  let signalText: string | undefined
  let hintText: string | undefined
  let hintComputedOk = false

  const cfg = (problem.scoring_config ?? {}) as ScoringConfig
  const kinds = shadowKinds(cfg)
  const person = cfg.requireAll?.[0]
  const opponent = cfg.requireAll?.[1]

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
        if (person && opponent) gatedNoBeatText = buildNoBeatGateCardText(person, opponent)
      }
    }

    if (kinds.includes('tell')) {
      try {
        tell = await computeTellShadow(admin, user.id, problemId, normalized, flags)
      } catch (err) {
        console.error('느낌어 판정(tell) 실패(조용히 pending 취급)', err)
        tell = { verdict: 'pending' }
      }
      if (tell.verdict === 'tell' && tell.quote) {
        tellText = buildTellCardText(tell.quote)
      }
    }

    if (kinds.includes('signal')) {
      try {
        signal = await computeSignalShadow(admin, user.id, problemId, normalized, flags)
      } catch (err) {
        console.error('절단 신호(signal) 판정 실패(조용히 pending 취급)', err)
        signal = { verdict: 'pending' }
      }
      if (signal.verdict === 'signal' || signal.verdict === 'no_signal') {
        signalText = buildSignalCardText(signal.verdict, signal.quote)
      }
    }

    if (
      shadow &&
      (shadow.verdict === 'none' || shadow.verdict === 'no_beat' || shadow.verdict === 'support_not_before') &&
      problem.passage &&
      person &&
      opponent
    ) {
      const material = resolveHintMaterial(cfg, problem.passage)
      if (material) {
        try {
          const hint = await computeHintV3(admin, user.id, problemId, normalized, material, person, opponent, shadow.verdict, flags)
          if (hint.verdict === 'ok' && hint.text) {
            hintComputedOk = true
            if (flags.hintVisible) hintText = hint.text
          }
        } catch (err) {
          console.error('힌트 v3 실패(조용히 무시 — 1층 문구만 남는다)', err)
        }
      }
    }
  }

  // 규칙 판정이 서고 gating 이 반영된 최종 통과 여부. combine() 의 result.status
  // 는 안 바꾼다(순수 규칙 판정 기록으로 남긴다) — passed 만 gating 을 반영한다.
  const passed = result.status === 'pass' && !gatedNoBeat

  // 7.5. 재제출 비교 피드백(세션 52) — 규칙 검사만 쓴다, AI·DB 스키마 변경
  //      없음. **submissions insert 보다 먼저 읽는다** — 순서가 뒤집히면
  //      방금 낸 것이 직전으로 잡힌다(세션 44 "킬스위치가 캐시보다 먼저"와
  //      같은 자리). 사용자 클라이언트(supabase)로 읽는다 — RLS 'own
  //      submissions read'(auth.uid() = user_id)가 자기 이력만 준다,
  //      admin 을 안 쓴다. prev 가 없거나(첫 제출) auto_result.checks 가
  //      배열이 아니면 아무것도 안 한다. 조회 실패는 조용히 무시(힌트 v3
  //      실패 처리와 같다 — 진도·판정에 무영향).
  //      ★ 통과한 직전 제출은 자동으로 침묵한다 — combine()이 fail 검사가
  //      하나라도 있으면 status 를 fail 로 놓으므로, passed 인 제출에는
  //      fail 검사가 없다. 정책이 아니라 산수다(별도 분기 없음).
  let resubmitLineText: string | null = null
  try {
    const { data: prevSub } = await supabase
      .from('submissions')
      .select('auto_result')
      .eq('user_id', user.id)
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const prevChecks = (prevSub?.auto_result as { checks?: unknown } | null)?.checks
    if (Array.isArray(prevChecks)) {
      const gained = diffChecks(prevChecks as Check[], result.checks)
      resubmitLineText = resubmitLine(gained, { hasForbidLabel: !!cfg.forbidLabel })
    }
  } catch (err) {
    console.error('재제출 비교 피드백 실패(조용히 무시)', err)
  }

  // 8. submissions 저장 — 실패해도 응답은 정상 반환. auto_result 에 shadow·
  //    tell verdict 를 적어 둔다(세션 43·45 — 나중에 오판 추적용) · gating
  //    으로 막힌 제출은 no_beat_gate: true 로 표시한다. 힌트는 hintVisible
  //    과 무관하게 **계산이 섰으면**(hintComputedOk) 적는다 — 노출 여부와
  //    별개로 오판 추적 재료가 쌓여야 한다(세션 46).
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
        ...(signal ? { signal: signal.verdict } : {}),
        ...(hintComputedOk ? { hint_v3: true } : {}),
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
  //     대신 gatedNoBeatText 를 보여줄 신호다. 정답·scoring_config는 안 싣는다.
  //     tell·gatedNoBeat·hint 문구는 전부 서버가 순수 함수로 이미 완성해
  //     보낸다(lib/ai/hint-text.ts) — 화면은 그대로 보여주기만 한다. hint
  //     는 flags.hintVisible 이 true 일 때만 실린다(계산은 항상 서지만
  //     노출만 막혀 있을 수 있다 — 세션 46).
  return Response.json({
    status: gatedNoBeat ? 'fail' : result.status,
    checks: result.checks,
    needsAi: result.needsAi,
    morphAvailable: morph !== null,
    reference,
    shadow,
    ...(gatedNoBeat ? { gatedNoBeat: true, gatedNoBeatText } : {}),
    ...(tell ? { tell: { verdict: tell.verdict, text: tellText } } : {}),
    ...(signal ? { signal: { verdict: signal.verdict, text: signalText } } : {}),
    ...(hintText ? { hint: hintText } : {}),
    ...(resubmitLineText ? { resubmit_line: resubmitLineText } : {}),
  })
}
