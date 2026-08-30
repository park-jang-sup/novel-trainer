// fill 지문(passage)에서 고정 줄과 빈칸 표식을 뽑는다.
//
// scripts/gen-seed.ts(scoring_config.fixedLines 를 생성하는 쪽)와
// lib/scoring/verify.ts(그것을 재는 쪽)가 둘 다 여기를 쓴다 — 사본을
// 만들지 않는다. fixedLines 를 시드 JSON 에 손으로 적지 않는 것이 규칙이라
// (재설계안 11-3), 그 값이 passage 하나에서만 나오게 이 함수로 묶는다.

export interface FillParts {
  /** 힌트 줄([상황] 등)도 빈칸 표식(①②)도 아닌 줄. trim 된다. */
  fixedLines: string[]
  /** 빈칸 표식이 passage 에 나온 순서. */
  markers: string[]
}

// 힌트 줄: 여는 대괄호로 시작하는 줄. [상황]·[복선]·[결정타].
const HINT_LINE = /^\[[^\]]+\]/
// 빈칸 표식 줄: 동그라미 숫자 하나만 있는 줄(①..⑳). blankKeys 와 무관하게
// 잡는다 — 선언하지 않은 표식(③ 을 남겨 둔 것)도 여기서 드러나야 한다.
const MARKER_LINE = /^[①-⑳]$/

export function deriveFillParts(passage: string): FillParts {
  const fixedLines: string[] = []
  const markers: string[] = []
  for (const rawLine of passage.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (HINT_LINE.test(line)) continue
    if (MARKER_LINE.test(line)) {
      markers.push(line)
      continue
    }
    fixedLines.push(line)
  }
  return { fixedLines, markers }
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
