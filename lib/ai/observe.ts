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
import { buildPrompt, parseObservation, type Observation, type PromptInput } from './prompt'
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
  } catch {
    // 호출이 못 나갔다. 태운 토큰이 없으니 usage 도 없다.
    // ★ 부분 실패(응답은 왔는데 끊김)는 gemini.ts 가 usage 를 채워 던지지 않는다.
    return { ok: false, observation: null, error: 'call_failed', usage: null, costUsd: null, model, raw: null }
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
  }
}
