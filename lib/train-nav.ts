// 학습 루프 — '다음 문항' 계산. 순수 함수라 verify 가 문다.
//
// 목록 순서는 app/train/[stageId]/page.tsx 의 .order('difficulty').order('source_key')
// 와 같아야 한다. 두 곳이 다른 순서를 내면 '다음 →' 이 목록과 어긋난다.

export interface NavProblem {
  id: string
  source_key: string
  difficulty: number
}

export interface NavStage {
  id: string
  track: string
  order_no: number
}

// 전체 단계 순서. app/page.tsx 의 TRACKS · scripts/gen-seed.ts 의 TRACK_ORDER
// 와 같아야 한다 — order_no 는 트랙마다 1부터라 트랙을 먼저 봐야 순서가 선다.
const TRACK_ORDER = ['sentence', 'structure', 'start']

/**
 * 전체 순서(sentence → structure → start, 트랙 안에선 order_no)에서 지금
 * 단계 다음으로 **문항이 있는** 단계. 없으면 null(홈으로).
 * 다음 단계는 같은 트랙에 매이지 않는다 — 문장 트랙을 끝내면 구성으로 넘어간다.
 */
export function nextStageId(
  stages: NavStage[],
  currentStageId: string,
  stagesWithProblems: ReadonlySet<string>
): string | null {
  const list = [...stages].sort(
    (a, b) =>
      TRACK_ORDER.indexOf(a.track) - TRACK_ORDER.indexOf(b.track) ||
      a.order_no - b.order_no
  )
  const i = list.findIndex((s) => s.id === currentStageId)
  if (i === -1) return null
  for (let j = i + 1; j < list.length; j++) {
    if (stagesWithProblems.has(list[j].id)) return list[j].id
  }
  return null
}

function ordered(problems: NavProblem[]): NavProblem[] {
  // difficulty 가 null 이나 문자열로 와도(유형마다 시드가 다르다) 순서가 서게
  // Number 로 눌러 둔다 — NaN 이면 0 으로 본다.
  const d = (p: NavProblem) => {
    const n = Number(p.difficulty)
    return Number.isFinite(n) ? n : 0
  }
  return [...problems].sort((a, b) => d(a) - d(b) || a.source_key.localeCompare(b.source_key))
}

/**
 * 한 단계의 진도. 유형과 무관하게 통과한 problem_id 만 센다 —
 * choice·order·count·fill 다 같은 식이다(app/page.tsx 의 집계와 같아야 한다).
 *   passed  통과한 문항 수 (정수)
 *   total   활성 문항 수
 *   skipped 통과 안 한 문항, 목록 순서로
 */
export function stageProgress(
  problems: NavProblem[],
  passedIds: ReadonlySet<string>
): { passed: number; total: number; skipped: NavProblem[] } {
  const list = ordered(problems)
  const skipped = list.filter((p) => !passedIds.has(p.id))
  return { passed: list.length - skipped.length, total: list.length, skipped }
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

/**
 * 단계를 전부 통과한 뒤 훑어보기용 — 통과 여부와 무관하게 목록 순서상
 * 다음 문항의 source_key. 마지막이면 첫 문항으로 돈다(순회). 문항이 하나뿐이면
 * 자기 자신. 지금 문항이 목록에 없으면 null(방어). nextProblemKey 와 같은
 * ordered() 정렬을 재사용한다 — 목록·'다음 →' 이 어긋나지 않게.
 */
export function cycleNextProblemKey(
  problems: NavProblem[],
  currentSourceKey: string
): string | null {
  const list = ordered(problems)
  if (list.length === 0) return null
  const i = list.findIndex((p) => p.source_key === currentSourceKey)
  if (i === -1) return null
  return list[(i + 1) % list.length].source_key
}
