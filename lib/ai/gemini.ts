import 'server-only'
import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import type { GeminiCall, GeminiReply } from './observe'
import { backoffMs, isRetryable, statusOf } from './retry'

/**
 * Gemini 호출. **네트워크만 담당한다** — 판정도 조립도 observe.ts 에 있다.
 * remote.ts 가 형태소 서버에 대해 하는 일과 같은 자리다.
 *
 * ★ `@google/genai` 가 저장소에 들어오는 **유일한 자리**다. 세션 12 §6 이
 *   `gate 만 만들고 호출을 미루기` 를 하지 말 것에 넣은 이유가 이것이다 —
 *   `@anthropic-ai/sdk` 는 package.json 한 줄에 import 0건으로 여섯 세션을
 *   버텼다. 그 줄은 이번에 뺐다.
 */

/**
 * 설계안 9장이 고른 등급. **값으로 고른 게 아니라 Flash 한 등급으로 먼저 재고
 * 못 잡으면 Pro 로 올린다** 는 순서다. 172×3 을 가장 비싼 등급으로 돌려도
 * $1.80 라서 값이 등급을 안 가른다(설계안 8-3).
 */
export const DEFAULT_MODEL = 'gemini-3.7-flash'

/**
 * ★ 30초였다가 늘렸다. `gemini-3.7-flash` 가 몰릴 때 **503 이 63초 만에**
 *   왔다 — 30초에 자르면 그 503 을 못 보고 `call_failed` 만 남는다.
 *   마개를 세우려고 짧게 잡은 것이 진단을 가렸다.
 */
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 90_000)

/** 재시도 횟수. 첫 시도를 뺀 수다. */
const MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES || 4)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * ★ 흔들림 측정의 축이 여기다. `temperature` 자리를 이것이 대신한다.
 *   `low` 에서 흔들리고 `high` 에서 안 흔들리면 그 흔들림은 아낀 값이 만든 것이다.
 *   하니스가 `--level=` 로 바꿔 잰다.
 */
export const THINKING_LEVEL: ThinkingLevel =
  (process.env.GEMINI_THINKING_LEVEL as ThinkingLevel) || ThinkingLevel.LOW

/**
 * ★★ **`temperature` 를 안 준다.** 출처가 둘이고 세기가 다르다. 둘 다 적는다.
 *
 * ```
 * 3.7 Flash 이관 문서   Remove deprecated sampling parameters:
 *                      Strip temperature, top_p, and top_k from generation configs
 *                      ai.google.dev/gemini-api/docs/latest-model   확인 2026-08-30
 *                      ★ 우리가 쓰는 모델에 대해 '뺐다' 고 적는 쪽
 *
 * Gemini 3 프롬프트 지침  temperature 를 기본값 1.0 으로 유지할 것을 적극 권장한다.
 *                      1.0 미만은 예기치 않은 동작·루핑·성능 저하를 부른다
 *                      docs.cloud.google.com/vertex-ai/.../gemini-3-prompting-guide
 *                      ★ 세대 전체에 대해 '쓰지 말라고 권한다' 고 적는 쪽
 * ```
 *
 * 세기를 섞지 마라. `없어졌다` 로 적으면 나중에 `있는데?` 로 뒤집힌다.
 * **우리 모델(3.7 Flash)에 대해서는 이관 문서가 빼라고 적는다** 가 근거이고,
 * 세대 지침은 설령 남아 있어도 내리면 안 된다고 말한다. 결론은 하나로 모인다.
 *
 * ★ 설계안 5장 2번과 세션 11 §8-1 의 `temperature 0 에서도 흔들리는지 함께
 *   본다` 는 **못 한다.** 그리고 이건 설계안을 약화시키는 게 아니라 **강화한다** —
 *
 * ```
 * 전   temperature 0 이면 흔들림이 없을 수도 있다. 그때는 1회로 족하다
 * 후   ★ 흔들림을 죽일 수단이 없다. 10건 5회는 선택이 아니라 필수다
 * ```
 *
 *   빈자리에 `thinkingLevel` 이 들어간다. 흔들림 측정의 축은 온도가 아니라
 *   `low` 대 `high` 다 — low 에서 흔들리고 high 에서 안 흔들리면 그 흔들림은
 *   아낀 값이 만든 것이다. 인수인계 §4 에 적었다.
 *
 * ★ `thinkingLevel: 'low'`. 3.7 Flash 의 기본은 `medium` 이고, **출력 단가가
 *   생각 토큰을 포함한다.** 기본으로 두면 설계안 8-1 이 잡은 `출력 ~100 토큰`
 *   이 몇 배가 된다. 그래도 이건 **아낀 것이지 잰 것이 아니다** — thinking level
 *   은 토큰 수를 보장하는 값이 아니라 상대적 지침이다. 진짜 수는 재야 나온다.
 */
export const callGemini: GeminiCall = async (prompt, model): Promise<GeminiReply> => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 없음')

  const ai = new GoogleGenAI({ apiKey })

  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt - 1))
    try {
      return await once(ai, prompt, model)
    } catch (e) {
      lastError = e
      if (!isRetryable(e)) throw e
      const s = statusOf(e)
      console.error(`  Gemini ${s ?? '?'} — ${attempt + 1}/${MAX_RETRIES + 1} 시도`)
    }
  }
  throw lastError
}

async function once(ai: GoogleGenAI, prompt: string, model: string): Promise<GeminiReply> {
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      // 프롬프트가 이미 'JSON 하나만' 이라고 못 박는다. responseSchema 는 안 건다 —
      // 스키마를 걸면 설계안이 재려던 것과 다른 조건에서 재게 된다. 꼴이 틀리면
      // parseObservation 이 틀렸다고 낸다(설계안 2-2 의 출력 형식이 곧 계약이다).
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: THINKING_LEVEL },
      // 넉넉히 준다. 과금은 실제 사용량으로 나가고, 좁게 주면 생각 토큰에 밀려
      // 본문이 잘린 채로 와서 파싱 실패가 프롬프트 탓처럼 보인다.
      maxOutputTokens: 2048,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  })

  const u = res.usageMetadata
  return {
    text: res.text ?? '',
    model: res.modelVersion ?? model,
    usage: {
      // promptTokenCount 는 캐시 적중분을 포함한다 — pricing.ts 가 그렇게 센다.
      inputTokens: u?.promptTokenCount ?? 0,
      cachedTokens: u?.cachedContentTokenCount ?? 0,
      // candidatesTokenCount 는 생각 토큰을 안 센다. 과금은 세니 더해야 한다.
      outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
    },
  }
}
