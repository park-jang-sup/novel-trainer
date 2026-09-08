/**
 * 한 건을 재는 흐름. **SDK 를 주입받는다** — 그래서 순수 Node 에서 돈다.
 *
 * 이 갈래가 remote.ts / morph.ts 와 같은 모양이다. 네트워크는 gemini.ts 에
 * 두고, 판정과 조립은 여기 둔다. verify.ts 가 가짜 호출을 넣어 프롬프트 조립 ·
 * 파싱 · 비용 환산 · 실패 갈래를 전부 문다. 세션 10 §6 `물기 시험` 이다.
 *
 * ★ **비용은 성공/실패와 무관하게 나온다.** 모델이 헛소리를 뱉어도 토큰은
 *   태웠다. 그래서 usage 는 결과 종류와 상관없이 늘 실려 나간다 — 호출부가
 *   그걸 ai_usage_log 에 적어야 지출 상한이 다음 호출에서 맞는다.
 */
import {
  buildHintPrompt,
  buildHintPromptV2,
  buildHintPromptV3,
  buildPoint2Prompt,
  buildPointPrompt,
  buildPrompt,
  buildSignalPrompt,
  buildSupportPrompt,
  buildTellPrompt,
  buildTellPromptV2,
  parseHintObservation,
  parseObservation,
  parsePointObservation,
  parseSignalObservation,
  parseSupportObservation,
  parseTellObservation,
  parseTellV2Observation,
  verifyHintV3,
  type HintObservation,
  type HintV2Verdict,
  type HintV3Check,
  type Observation,
  type PointObservation,
  type PromptInput,
  type SignalObservation,
  type SupportDomain,
  type SupportObservation,
  type TellObservation,
  type TellV2Observation,
} from './prompt'
import { costUsd, type TokenUsage } from './pricing'

export interface GeminiReply {
  text: string
  usage: TokenUsage
  /** 실제로 응답한 모델. 요청한 것과 다를 수 있다(별칭) */
  model: string
}

/** gemini.ts 가 이 꼴을 채운다. 던질 수 있다 — 아래가 잡는다. */
export type GeminiCall = (prompt: string, model: string) => Promise<GeminiReply>

export interface ObserveOutcome {
  /** 관측이 섰는가. false 여도 usage 가 있을 수 있다 */
  ok: boolean
  observation: Observation | null
  /** 왜 못 섰는가. ok 면 null */
  error: 'call_failed' | 'not_json' | 'bad_shape' | null
  /** 호출이 실제로 나갔으면 채워진다. 안 나갔으면 null */
  usage: TokenUsage | null
  costUsd: number | null
  model: string
  /** 파싱이 깨졌을 때만. 사람이 보려고 남긴다 */
  raw: string | null
  /**
   * 실패의 내용. **`error` 만으로는 왜 실패했는지 모른다.**
   * ★ 4-7장에서 고친 것과 같은 병을 이 파일이 저지르고 있었다 —
   *   `call_failed` 만 내고 던진 것을 통째로 버렸다. 오류가 오는데 내용이 없다.
   */
  detail: string | null
}

/** 던져진 것에서 사람이 읽을 줄을 뽑는다. SDK 는 Error 가 아닌 것도 던진다. */
function detailOf(e: unknown): string {
  if (e instanceof Error) {
    // SDK 가 status·code 를 얹어 오는 경우가 있다. 있으면 함께 낸다.
    const extra = e as Error & { status?: unknown; code?: unknown }
    const bits = [e.message]
    if (extra.status !== undefined) bits.push(`status=${String(extra.status)}`)
    if (extra.code !== undefined) bits.push(`code=${String(extra.code)}`)
    return bits.join(' · ')
  }
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

export async function observeWith(
  call: GeminiCall,
  input: PromptInput,
  model: string
): Promise<ObserveOutcome> {
  const prompt = buildPrompt(input)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    // 호출이 못 나갔다. 태운 토큰이 없으니 usage 도 없다.
    // ★ 부분 실패(응답은 왔는데 끊김)는 gemini.ts 가 usage 를 채워 던지지 않는다.
    return {
      ok: false, observation: null, error: 'call_failed',
      usage: null, costUsd: null, model, raw: null,
      detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const parsed = parseObservation(reply.text)

  if (!parsed.ok) {
    return {
      ok: false,
      observation: null,
      error: parsed.reason,
      usage: reply.usage,
      costUsd: cost,
      model: reply.model,
      raw: parsed.raw.slice(0, 500),
      detail: parsed.reason === 'not_json' ? 'JSON 이 아니다' : '꼴이 다르다',
    }
  }

  return {
    ok: true,
    observation: parsed.observation,
    error: null,
    usage: reply.usage,
    costUsd: cost,
    model: reply.model,
    raw: null,
    detail: null,
  }
}

/**
 * 지목(point) 관측. **`observeWith` 를 안 건드리고 곁에 둔다.**
 *
 * ★★ 마개(gate)와 비용 경로는 그대로다. 이 함수는 `buildPointPrompt` 로 틀을
 *   짜고 `parsePointObservation` 으로 읽을 뿐, 나머지는 `observeWith` 와 같다.
 * ★ 둘을 하나로 묶지 않았다. 묶으면 한쪽 문안을 고칠 때 다른 쪽이 조용히
 *   따라 움직인다 — 세션 13이 `서 있는 관측을 같이 고치면 못 가린다` 로
 *   적은 자리와 같다.
 */
export interface PointOutcome extends Omit<ObserveOutcome, 'observation'> {
  observation: PointObservation | null
}

/**
 * ★ `variant` 로 틀만 고른다. 나머지는 같다 — 파싱 꼴이 같기 때문이다.
 *   `point` 와 `point2` 는 `C-1` 마개 한 문장만 다르다(prompt.ts).
 */
export async function observePointWith(
  call: GeminiCall,
  input: PromptInput,
  model: string,
  variant: 'point' | 'point2' = 'point'
): Promise<PointOutcome> {
  const prompt = variant === 'point2' ? buildPoint2Prompt(input) : buildPointPrompt(input)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, observation: null, error: 'call_failed',
      usage: null, costUsd: null, model, raw: null,
      detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const parsed = parsePointObservation(reply.text)

  if (!parsed.ok) {
    return {
      ok: false,
      observation: null,
      error: parsed.reason,
      usage: reply.usage,
      costUsd: cost,
      model: reply.model,
      raw: parsed.raw.slice(0, 500),
      detail: parsed.reason === 'not_json' ? 'JSON 이 아니다' : '꼴이 다르다',
    }
  }

  return {
    ok: true,
    observation: parsed.observation,
    error: null,
    usage: reply.usage,
    costUsd: cost,
    model: reply.model,
    raw: null,
    detail: null,
  }
}

/**
 * 결정타 빌드업 섀도(support-v3, 도메인 일반화 v4 는 세션 43) 관측.
 * **`observeWith` 를 안 건드리고 곁에 둔다** — `observePointWith` 와 같은
 * 이유다. `buildSupportPrompt` 는 지문 없이 답안 하나만 받는다(prompt.ts
 * 주석) — `PromptInput`(passage·lines·element)이 아니라 답안 문자열 하나가
 * 입력이다.
 *
 * domain 기본값 'battle' — 안 주면 기존 호출부(route.ts)는 그대로 v3 다.
 * 'general' 은 골든셋 하네스가 set A 를 재는 데만 쓴다 — bt- 엔 안 붙는다.
 */
export interface SupportOutcome extends Omit<ObserveOutcome, 'observation'> {
  observation: SupportObservation | null
}

export async function judgeSupportWith(
  call: GeminiCall,
  answer: string,
  model: string,
  domain: SupportDomain = 'battle'
): Promise<SupportOutcome> {
  const prompt = buildSupportPrompt(answer, domain)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, observation: null, error: 'call_failed',
      usage: null, costUsd: null, model, raw: null,
      detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const parsed = parseSupportObservation(reply.text)

  if (!parsed.ok) {
    return {
      ok: false,
      observation: null,
      error: parsed.reason,
      usage: reply.usage,
      costUsd: cost,
      model: reply.model,
      raw: parsed.raw.slice(0, 500),
      detail: parsed.reason === 'not_json' ? 'JSON 이 아니다' : '꼴이 다르다',
    }
  }

  return {
    ok: true,
    observation: parsed.observation,
    error: null,
    usage: reply.usage,
    costUsd: cost,
    model: reply.model,
    raw: null,
    detail: null,
  }
}

/**
 * 느낌어 판정(tell) 관측. **`observeWith` 를 안 건드리고 곁에 둔다** —
 * `observePointWith`·`judgeSupportWith` 와 같은 이유(prompt.ts 주석 참고,
 * 세션 45).
 */
export interface TellOutcome extends Omit<ObserveOutcome, 'observation'> {
  observation: TellObservation | null
}

export async function judgeTellWith(
  call: GeminiCall,
  answer: string,
  model: string
): Promise<TellOutcome> {
  const prompt = buildTellPrompt(answer)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, observation: null, error: 'call_failed',
      usage: null, costUsd: null, model, raw: null,
      detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const parsed = parseTellObservation(reply.text)

  if (!parsed.ok) {
    return {
      ok: false,
      observation: null,
      error: parsed.reason,
      usage: reply.usage,
      costUsd: cost,
      model: reply.model,
      raw: parsed.raw.slice(0, 500),
      detail: parsed.reason === 'not_json' ? 'JSON 이 아니다' : '꼴이 다르다',
    }
  }

  return {
    ok: true,
    observation: parsed.observation,
    error: null,
    usage: reply.usage,
    costUsd: cost,
    model: reply.model,
    raw: null,
    detail: null,
  }
}

/**
 * 절단 신호(signal) 관측(세션 47) — 구성 16 ca- 전용. **`observeWith` 를
 * 안 건드리고 곁에 둔다** — `judgeTellWith` 와 같은 이유(observe.ts 관례).
 */
export interface SignalOutcome extends Omit<ObserveOutcome, 'observation'> {
  observation: SignalObservation | null
}

export async function judgeSignalWith(
  call: GeminiCall,
  answer: string,
  model: string
): Promise<SignalOutcome> {
  const prompt = buildSignalPrompt(answer)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, observation: null, error: 'call_failed',
      usage: null, costUsd: null, model, raw: null,
      detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const parsed = parseSignalObservation(reply.text)

  if (!parsed.ok) {
    return {
      ok: false,
      observation: null,
      error: parsed.reason,
      usage: reply.usage,
      costUsd: cost,
      model: reply.model,
      raw: parsed.raw.slice(0, 500),
      detail: parsed.reason === 'not_json' ? 'JSON 이 아니다' : '꼴이 다르다',
    }
  }

  return {
    ok: true,
    observation: parsed.observation,
    error: null,
    usage: reply.usage,
    costUsd: cost,
    model: reply.model,
    raw: null,
    detail: null,
  }
}

/**
 * 느낌어 판정 v2(tell-v2) 관측(세션 47) — gating 후보 실험, 골든셋 전용
 * (route.ts 미배선). tell-v1 과 프롬프트·스키마만 다르고 나머지(마개·비용·
 * 파싱 실패 처리)는 같다.
 */
export interface TellV2Outcome extends Omit<ObserveOutcome, 'observation'> {
  observation: TellV2Observation | null
}

export async function judgeTellV2With(
  call: GeminiCall,
  answer: string,
  model: string
): Promise<TellV2Outcome> {
  const prompt = buildTellPromptV2(answer)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, observation: null, error: 'call_failed',
      usage: null, costUsd: null, model, raw: null,
      detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const parsed = parseTellV2Observation(reply.text)

  if (!parsed.ok) {
    return {
      ok: false,
      observation: null,
      error: parsed.reason,
      usage: reply.usage,
      costUsd: cost,
      model: reply.model,
      raw: parsed.raw.slice(0, 500),
      detail: parsed.reason === 'not_json' ? 'JSON 이 아니다' : '꼴이 다르다',
    }
  }

  return {
    ok: true,
    observation: parsed.observation,
    error: null,
    usage: reply.usage,
    costUsd: cost,
    model: reply.model,
    raw: null,
    detail: null,
  }
}

/**
 * 힌트(hint) 관측. `buildHintPrompt` 는 답안 하나가 아니라 답안·원문
 * 둘을 받는다(prompt.ts 주석 참고) — 그래서 시그니처가 `judgeSupportWith`·
 * `judgeTellWith` 와 다르다. 나머지(마개·비용·파싱 실패 처리)는 같다.
 */
export interface HintOutcome extends Omit<ObserveOutcome, 'observation'> {
  observation: HintObservation | null
}

export async function judgeHintWith(
  call: GeminiCall,
  answer: string,
  passage: string,
  model: string
): Promise<HintOutcome> {
  const prompt = buildHintPrompt(answer, passage)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, observation: null, error: 'call_failed',
      usage: null, costUsd: null, model, raw: null,
      detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const parsed = parseHintObservation(reply.text)

  if (!parsed.ok) {
    return {
      ok: false,
      observation: null,
      error: parsed.reason,
      usage: reply.usage,
      costUsd: cost,
      model: reply.model,
      raw: parsed.raw.slice(0, 500),
      detail: parsed.reason === 'not_json' ? 'JSON 이 아니다' : '꼴이 다르다',
    }
  }

  return {
    ok: true,
    observation: parsed.observation,
    error: null,
    usage: reply.usage,
    costUsd: cost,
    model: reply.model,
    raw: null,
    detail: null,
  }
}

/**
 * 힌트 v2(세션 46) 관측. **자유 텍스트라 JSON 파싱이 없다** — hint-v1(위
 * judgeHintWith)과 나란히 둔다(observe.ts 관례, 묶지 않는다). 코드펜스를
 * 두르고 오는 경우에 대비해 벗기기만 하고, 나머지는 그대로 믿는다 — 실제
 * 제약 검증(길이·인용·문체)은 prompt.ts 의 verifyHintV2 가 순수 함수로 한다.
 */
export interface HintV2Outcome {
  ok: boolean
  text: string | null
  error: 'call_failed' | 'empty' | null
  usage: TokenUsage | null
  costUsd: number | null
  model: string
  detail: string | null
  /** v3 전용(세션 49). judgeHintV3With 가 JSON 껍데기를 벗겼는지 —
   *  true: {"feedback":"…"} 에서 feedback 값만 뽑아 text 로 썼다.
   *  false: 벗길 게 없었다(평문 그대로, 또는 JSON 이지만 feedback 이 없어
   *  원문을 그대로 뒀다). 'malformed_json': '{' 로 시작하는데 파싱이
   *  깨져(예: JSON 뒤에 말이 더 붙음) 벗기기를 포기했다 — 이번 세션은
   *  이 경우도 폐기하지 않고 원문 그대로 흘려보낸다, 보이게만 한다.
   *  v2(judgeHintV2With)는 이 필드를 안 채운다 — 기존 호출부 무영향. */
  unwrapped?: boolean | 'malformed_json'
}

export async function judgeHintV2With(
  call: GeminiCall,
  answer: string,
  material: string,
  person: string,
  opponent: string,
  verdict: HintV2Verdict,
  model: string
): Promise<HintV2Outcome> {
  const prompt = buildHintPromptV2(answer, material, person, opponent, verdict)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, text: null, error: 'call_failed',
      usage: null, costUsd: null, model, detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const text = reply.text.trim().replace(/^```(?:\w+)?\s*/i, '').replace(/```$/, '').trim()

  if (!text) {
    return {
      ok: false, text: null, error: 'empty',
      usage: reply.usage, costUsd: cost, model: reply.model, detail: '빈 응답',
    }
  }

  return {
    ok: true, text, error: null,
    usage: reply.usage, costUsd: cost, model: reply.model, detail: null,
  }
}

/**
 * 힌트 v3 가 JSON 껍데기를 쓰고 오는 경우를 벗긴다(세션 49 실측 — --hint
 * 50건 중 32건이 {"feedback":"…"} 꼴이었는데 verifyHintV3 다섯 제약을
 * 전부 통과해서 통과율만으로는 안 보였다). **고쳐 읽지 않는다** —
 * parseObservation 류의 관례와 같다.
 *
 * ★ 세션 50 — 규칙을 키 이름과 무관하게 넓혔다(세션 49 실측 구멍: 36번이
 *   {"message":"…"} 로 와서 feedback 만 보던 규칙을 피해 갔다). **키 이름을
 *   안 본다** — JSON 으로 파싱되고 객체(배열 아님)이며 문자열 필드가
 *   **정확히 하나**면 키가 무엇이든 그 값을 trim 해서 쓴다(unwrapped: true).
 *   문자열 필드가 둘 이상이거나 하나도 없으면(숫자·객체·배열 필드는 안 센다)
 *   어느 것을 벗겨야 할지 알 수 없다 — 원문을 그대로 두고 unwrapped:
 *   'malformed_json'(파싱은 됐지만 못 벗긴 것). ★ {"other":"x"} 는 문자열
 *   필드가 하나뿐이라 이제 벗긴다 — 키 이름을 안 보기로 한 규칙의 의도한
 *   결과다(세션 49 는 feedback 만 봐서 원문을 그대로 뒀었다).
 *
 * ★ 세션 51 — 세션 50 재측정에서 "벗기지 못한 JSON 8/50"이 전부 bare
 *   string(`"「…」 … 봐."`)이었다. JSON 에서 문자열도 유효한 값이라
 *   JSON.parse 는 성공하는데, 객체 분기 앞에서 걸러지지 않아 원문(따옴표
 *   포함)이 그대로 남았다 — **문자열이면 객체 분기보다 먼저 벗긴다.**
 *   숫자·불리언·null 같은 다른 스칼라와 배열은 여전히 원문 유지·
 *   'malformed_json'(벗길 대상이 아니다).
 *   ★ 파싱 자체가 실패했을 때의 'malformed_json' 판정도 넓혔다 — 원문이
 *   '{' 뿐 아니라 **'"' 로 시작할 때도** 건다(따옴표가 하나만 남거나 안쪽
 *   이스케이프가 깨진 응답 — 세션 49 "깨진 껍데기 0/50"과 같은 계열의
 *   거짓 안심을 막는다). **폐기하지 않는다** — text 는 원문 그대로
 *   흘려보내고 결과에만 보이게 한다.
 */
function unwrapHintV3Feedback(text: string): { text: string; unwrapped: boolean | 'malformed_json' } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { text, unwrapped: text.startsWith('{') || text.startsWith('"') ? 'malformed_json' : false }
  }
  if (typeof parsed === 'string') {
    return { text: parsed.trim(), unwrapped: true }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { text, unwrapped: 'malformed_json' }
  }
  const stringFields = Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === 'string')
  if (stringFields.length === 1) {
    return { text: (stringFields[0][1] as string).trim(), unwrapped: true }
  }
  return { text, unwrapped: 'malformed_json' }
}

/**
 * 힌트 v3(세션 47) 관측. v2 와 시그니처가 같다 — 프롬프트(few-shot·비계
 * 용어/메타 지시 금지)와 검증(verifyHintV3)만 바뀌었다. `judgeHintV2With`
 * 를 안 건드리고 곁에 둔다(observe.ts 관례). 세션 49 — 코드펜스를 벗긴
 * 뒤 JSON 껍데기도 벗긴다(unwrapHintV3Feedback). verifyHintV3·캐시·
 * route.ts 는 안 고친다 — 벗긴 본문이 그대로 흐른다.
 */
export async function judgeHintV3With(
  call: GeminiCall,
  answer: string,
  material: string,
  person: string,
  opponent: string,
  verdict: HintV2Verdict,
  model: string
): Promise<HintV2Outcome> {
  const prompt = buildHintPromptV3(answer, material, person, opponent, verdict)

  let reply: GeminiReply
  try {
    reply = await call(prompt, model)
  } catch (e) {
    return {
      ok: false, text: null, error: 'call_failed',
      usage: null, costUsd: null, model, detail: detailOf(e),
    }
  }

  const cost = costUsd(reply.model, reply.usage)
  const stripped = reply.text.trim().replace(/^```(?:\w+)?\s*/i, '').replace(/```$/, '').trim()
  const { text, unwrapped } = unwrapHintV3Feedback(stripped)

  if (!text) {
    return {
      ok: false, text: null, error: 'empty',
      usage: reply.usage, costUsd: cost, model: reply.model, detail: '빈 응답',
    }
  }

  return {
    ok: true, text, error: null,
    usage: reply.usage, costUsd: cost, model: reply.model, detail: null,
    unwrapped,
  }
}

/** judgeHintV3WithRetry 의 한 시도. check 는 outcome 이 자체로 실패(call_failed·
 *  empty)면 null 이다 — 검증할 텍스트가 없다. */
export interface HintV3Attempt {
  outcome: HintV2Outcome
  check: HintV3Check | null
}

/**
 * 힌트 v3 재시도 루프(세션 50, 2-A). verifyHintV3 가 실패하면(문장 번호
 * 누출 등) 같은 프롬프트·같은 모델로 **한 번만** 다시 부른다 —
 * "재시도해도 안 되는 답안은 세 번째도 안 될 확률이 높다"(박 님). outcome
 * 이 자체로 실패(call_failed·empty)한 경우는 재시도하지 않는다 — 재시도
 * 대상은 "검증 실패"뿐이다(호출 실패까지 다시 부르면 비용만 는다).
 *
 * ★ **DB 를 안 만진다.** 캐시 조회·insert·ai_usage_log insert 는 전부
 *   호출부(route.ts computeHintV3) 몫이다 — 여기는 몇 번 불렀고 각 시도가
 *   어땠는지만 순서대로 돌려준다. 그래야 verify.ts 가 가짜 call 로 재시도
 *   횟수·최종 본문을 문다(observe.ts 관례, 세션 10 §6 물기 시험).
 * 반환 배열은 1건(첫 시도가 통과했거나 자체로 실패) 또는 2건(첫 시도가
 * 검증에 실패해 재시도까지 돎)이다 — 배열 길이 자체가 "재시도가 돌았는가"다.
 */
export async function judgeHintV3WithRetry(
  call: GeminiCall,
  answer: string,
  material: string,
  person: string,
  opponent: string,
  verdict: HintV2Verdict,
  model: string
): Promise<HintV3Attempt[]> {
  const first = await judgeHintV3With(call, answer, material, person, opponent, verdict, model)
  const firstCheck = first.ok && first.text ? verifyHintV3(first.text, answer) : null
  if (!first.ok || !first.text || firstCheck!.ok) return [{ outcome: first, check: firstCheck }]

  const second = await judgeHintV3With(call, answer, material, person, opponent, verdict, model)
  const secondCheck = second.ok && second.text ? verifyHintV3(second.text, answer) : null
  return [{ outcome: first, check: firstCheck }, { outcome: second, check: secondCheck }]
}
