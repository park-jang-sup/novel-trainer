// 학습 루프 — '다음 문항' 계산. 순수 함수라 verify 가 문다.
//
// 목록 순서는 app/train/[stageId]/page.tsx 의 .order('difficulty').order('source_key')
// 와 같아야 한다. 두 곳이 다른 순서를 내면 '다음 →' 이 목록과 어긋난다.

export interface NavProblem {
  id: string
  source_key: string
  difficulty: number
}

function ordered(problems: NavProblem[]): NavProblem[] {
  return [...problems].sort(
    (a, b) => a.difficulty - b.difficulty || a.source_key.localeCompare(b.source_key)
  )
}

/**
 * 같은 단계 안에서 다음으로 갈 문항의 source_key.
 *   - 목록 순서를 따른다(difficulty → source_key).
 *   - 이미 통과한 문항은 건너뛴다.
 *   - 뒤가 없거나(마지막) 뒤가 다 통과면 null.
 *   - 지금 문항이 목록에 없으면 null(방어).
 */
export function nextProblemKey(
  problems: NavProblem[],
  currentSourceKey: string,
  passedIds: ReadonlySet<string>
): string | null {
  const list = ordered(problems)
  const i = list.findIndex((p) => p.source_key === currentSourceKey)
  if (i === -1) return null
  for (let j = i + 1; j < list.length; j++) {
    if (!passedIds.has(list[j].id)) return list[j].source_key
  }
  return null
}
