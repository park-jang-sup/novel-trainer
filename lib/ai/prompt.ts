/**
 * 프롬프트 v1 과 관측 파싱. **순수하다** — 네트워크도 SDK 도 여기 없다.
 *
 * 문안은 `docs/AI심사_설계안.md` 2-2 장이 출처다. 그 문서가 단일 출처이고
 * 여기는 옮긴 것이다. 고칠 때 둘을 함께 고쳐라 — 세션 9 §1
 * (`재료 문서가 코드와 갈리면 코드를 문서에 맞추게 된다`).
 *
 * ★ 프롬프트가 pass/fail 을 안 뱉는다. **사실 넷만 뱉는다.** 합격선은 코드에
 *   있다(설계안 2-1). 그리고 지금은 그 합격선조차 안 건다 — `T` 가 미결이고
 *   `T 를 지금 정하기` 는 설계안 7장 `하지 말 것` 에 있다.
 *
 * ★ 규칙을 다시 검사하게 하지 않는다. 여기 오는 답안은 이미 4줄·줄당 30자·
 *   요소 있음·요소가 마지막 줄·대괄호 없음을 통과했다. 또 물으면 세션 6 §12 의
 *   `AI 는 마지막 관문이다` 가 무너진다.
 */
import { z } from 'zod'
import type { ScoringConfig } from '../scoring/types'

/** 치환자를 뺀 틀. 설계안 8-1 이 이 길이를 실측해서 비용을 냈다. */
export const PROMPT_FRAME = `너는 웹소설 습작 4줄을 읽고 **사실 넷을 보고한다.** 합격 여부는 판정하지 않는다.
합격선은 사람이 코드에서 건다. 네가 할 일은 재는 것뿐이다.

[지문]
{passage}

[답안]
1 {line1}
2 {line2}
3 {line3}
4 {line4}

[결정타 요소] {element}

아래 다섯을 판정해서 JSON 하나만 출력한다. JSON 앞뒤에 아무 말도 쓰지 않는다.

1. delete — 길이 3의 boolean 배열
   i번 줄(i=1,2,3)만 지우고 남은 세 줄을 읽는다.
   4번 줄이 '앞에서 준비된 결과'로 더는 읽히지 않으면 true, 그대로 읽히면 false.
   ★ 문장 연결이 어색해지는 것은 세지 않는다. 4번 줄의 근거가 사라지는지만 본다.
   ★ 지웠는데 오히려 매끄럽게 읽히면 그 줄은 false 다.

2. cue_copied — boolean
   4번 줄이 지문의 [결정타] 줄을 옮겨 놓은 것이면 true.
   ★ [결정타] 줄의 낱말을 가져다 쓰는 것 자체는 true 가 아니다. 그러라고 준 것이다.
     그 낱말을 자기 문장으로 만들었으면 false, 구절째 놔뒀으면 true.
   ★ 4번 줄이 짧은 것은 true 의 근거가 아니다. 짧게 끊는 것은 권장되는 마무리다.

3. foreshadow_used — boolean 또는 null
   지문에 [복선] 줄이 있을 때만 판정한다. 없으면 null.
   1~3번 줄 중 하나라도 그 복선을 집어 쓰면 true, 한 번도 안 쓰면 false.

4. has_actor — boolean
   4번 줄에 인물의 행동이나 상태가 있으면 true, 사물·상황만 있는 명사구면 false.
   ★ 이것만으로 합격이 갈리지 않는다. 사실만 적어라.

5. why — 한국어 한 줄. 40자 이내. 위 넷 중 가장 갈리기 쉬운 하나의 근거만 적는다.

출력 형식(이 꼴 그대로):
{"delete":[false,true,false],"cue_copied":false,"foreshadow_used":null,
 "has_actor":true,"why":"..."}`

/** 치환자 다섯을 뺀 순수 틀의 길이. 설계안 8-1 의 실측 자리다. */
export const PROMPT_FRAME_CHARS = PROMPT_FRAME.replace(
  /\{(passage|line1|line2|line3|line4|element)\}/g,
  ''
).length

export interface PromptInput {
  /** problems.passage. [상황]·[복선]·[결정타] 줄이 들어 있다 */
  passage: string
  /** 답안 네 줄. 규칙이 이미 4줄을 보장했다 */
  lines: [string, string, string, string]
  /** scoring_config.requireInLastLine[0] */
  element: string
}

export function buildPrompt(i: PromptInput): string {
  return PROMPT_FRAME.replace('{passage}', i.passage)
    .replace('{line1}', i.lines[0])
    .replace('{line2}', i.lines[1])
    .replace('{line3}', i.lines[2])
    .replace('{line4}', i.lines[3])
    .replace('{element}', i.element)
}

/**
 * 답안을 네 줄로 가른다. 넷이 아니면 null — 규칙이 이미 걸렀어야 하는 자리다.
 * 여기서 조용히 채우거나 자르지 않는다. 넷이 아닌 것이 오면 그게 규칙의 구멍이다.
 */
export function fourLines(text: string): [string, string, string, string] | null {
  const ls = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return ls.length === 4 ? [ls[0], ls[1], ls[2], ls[3]] : null
}

/**
 * 지문에 주는 요소. `requireInLastLine` 이 단일 출처다.
 * `requireAny` 와 목록이 같지만(index.ts 주석 참고) 화면 두 단계용이라 쓰지 않는다.
 */
export function elementOf(cfg: ScoringConfig): string | null {
  const e = cfg.requireInLastLine?.[0]
  return e && e.length > 0 ? e : null
}

/**
 * 관측 넷 + why.
 *
 * ★ `foreshadow_used` 는 `boolean | null` 이다. 난이도 1 지문에는 [복선] 줄이
 *   없어 null 이 온다. `=== true` 로 재면 난이도 1 전량이 떨어진다(설계안 2-6).
 */
export const ObservationSchema = z.object({
  delete: z.array(z.boolean()).length(3),
  cue_copied: z.boolean(),
  foreshadow_used: z.boolean().nullable(),
  has_actor: z.boolean(),
  why: z.string().max(200),
})
export type Observation = z.infer<typeof ObservationSchema>

export type ParseResult =
  | { ok: true; observation: Observation }
  | { ok: false; reason: 'not_json' | 'bad_shape'; raw: string }

/**
 * 모델이 낸 글자를 관측으로 바꾼다.
 *
 * responseMimeType 을 application/json 으로 주지만 그것만 믿지 않는다 —
 * 코드펜스를 두르는 경우가 있다. 다만 **고쳐 읽지는 않는다.** 꼴이 틀리면
 * 틀렸다고 낸다. 조용히 기워 넣으면 흔들림 측정에서 그 건이 정상으로 보인다.
 */
export function parseObservation(raw: string): ParseResult {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  let json: unknown
  try {
    json = JSON.parse(trimmed)
  } catch {
    return { ok: false, reason: 'not_json', raw }
  }
  const parsed = ObservationSchema.safeParse(json)
  if (!parsed.success) return { ok: false, reason: 'bad_shape', raw }
  return { ok: true, observation: parsed.data }
}

/**
 * 합격선. **지금 부르지 않는다.**
 *
 * 설계안 2-6 의 식 그대로다. `T` 는 경계 36건이 정한다(설계안 4장, 세션 12 §8).
 * 여기 둔 이유는 셋이다.
 *   1  식이 문서에만 있으면 문서와 코드가 갈린다 — 세션 9 §1
 *   2  `has_actor` 가 식에 없다는 것이 코드에 남는다 — 설계안 3-4
 *   3  T 가 정해지면 저장된 관측으로 다시 세면 된다. 172건을 다시 안 돌린다
 *
 * ★ 라우트가 이걸 부르면 T 를 정한 것이다. 설계안 7장이 그걸 막는다.
 */
export function passesAt(o: Observation, T: number): boolean {
  const load = o.delete.filter(Boolean).length
  return load >= T && !o.cue_copied && o.foreshadow_used !== false
}
