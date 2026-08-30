// fill 지문(passage)을 머리(힌트)와 본문(고정 줄·빈칸 표식)으로 가른다.
//
// scripts/gen-seed.ts(scoring_config.fixedLines 를 생성하는 쪽) ·
// lib/scoring/verify.ts(그것을 재는 쪽) · components/train(화면)이 다 여기를
// 쓴다 — 사본을 만들지 않는다. fixedLines 를 시드 JSON 에 손으로 적지 않는
// 것이 규칙이라(재설계안 11-3), 그 값이 passage 하나에서만 나오게 묶는다.

export interface FillParts {
  /** 힌트 줄([상황] 등)도 빈칸 표식(①②)도 아닌 줄. trim 된다. */
  fixedLines: string[]
  /** 빈칸 표식이 passage 에 나온 순서. */
  markers: string[]
}

/** 본문을 화면에 그리려면 고정 줄과 빈칸이 나온 순서가 필요하다. */
export type FillSegment =
  | { kind: 'line'; text: string }
  | { kind: 'blank'; key: string }

// 힌트 줄: 여는 대괄호로 시작하는 줄. [상황]·[복선]·[결정타].
const HINT_LINE = /^\[[^\]]+\]/
// 빈칸 표식 줄: 동그라미 숫자 하나만 있는 줄(①..⑳). blankKeys 와 무관하게
// 잡는다 — 선언하지 않은 표식(③ 을 남겨 둔 것)도 여기서 드러나야 한다.
const MARKER_LINE = /^[①-⑳]$/

/**
 * passage 를 머리와 본문으로 가른다.
 *   head  맨 앞에 이어지는 [상황]/[복선]/[결정타] 줄
 *   body  그 뒤 — 고정 줄과 빈칸이 번갈아. 빈 줄은 버린다
 */
export function fillPassageParts(passage: string): {
  head: string[]
  body: FillSegment[]
} {
  const lines = passage.split('\n')
  const head: string[] = []
  let i = 0
  while (i < lines.length && HINT_LINE.test(lines[i].trim())) {
    head.push(lines[i].trim())
    i++
  }
  const body: FillSegment[] = []
  for (; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    body.push(MARKER_LINE.test(line) ? { kind: 'blank', key: line } : { kind: 'line', text: line })
  }
  return { head, body }
}

export function deriveFillParts(passage: string): FillParts {
  const { body } = fillPassageParts(passage)
  return {
    fixedLines: body.filter((s): s is { kind: 'line'; text: string } => s.kind === 'line').map((s) => s.text),
    markers: body.filter((s): s is { kind: 'blank'; key: string } => s.kind === 'blank').map((s) => s.key),
  }
}

/** [상황] 머리 문장. 목록 라벨에 쓴다(머리표를 뗀 첫 문장). */
export function fillSituation(passage: string): string {
  const { head } = fillPassageParts(passage)
  const situ = head.find((l) => l.startsWith('[상황]')) ?? head[0] ?? ''
  const stripped = situ.replace(/^\[[^\]]+\]\s*/, '')
  const m = stripped.match(/[^.?!]*[.?!]/)
  return (m ? m[0].slice(0, -1) : stripped).trim()
}

/**
 * passage 의 빈칸 표식이 blanks 의 key 와 순서까지 같은가.
 * 어긋나면 이유 문자열, 맞으면 null.
 */
export function fillMarkerMismatch(
  passage: string,
  blankKeys: string[]
): string | null {
  const { markers } = deriveFillParts(passage)
  if (markers.length !== blankKeys.length) {
    return `표식 ${markers.length}개 / 빈칸 ${blankKeys.length}개`
  }
  for (let i = 0; i < markers.length; i++) {
    if (markers[i] !== blankKeys[i]) {
      return `${i + 1}번째 표식 '${markers[i]}' ≠ 빈칸 '${blankKeys[i]}'`
    }
  }
  return null
}
