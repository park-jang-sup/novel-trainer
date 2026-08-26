// 지문 규칙 검사. 단계에 무관하다 — 9단계·10단계 지문도 이걸 통과해야 한다.
//
// 기계가 못 잡는 것(대사가 논리적으로 이어지는가)은 여기서 보지 않는다.
// 그건 chain 같은 장치로 사람이 스스로 강제해야 한다(monologue-insert.ts).
// 여기서 보는 것은 기계로 잴 수 있는 형식적 규칙뿐이다.
//
// 세션 7: mo-heungbu-swallow의 대사 셋이 서로 이어지지 않았는데(거두자는
// 말이 없이 먹이 걱정이 나옴), 쓴 사람이 흥부전을 알아서 빈칸을 머릿속으로
// 메워 읽었고 화면에 올릴 때까지 아무도 못 봤다. keyword가 흔한 말에 새는
// 것도 같은 종류의 실수다 — 쓴 사람 눈에는 안 보인다.

export interface PassageRuleInput {
  sourceKey: string
  keyword: string
  passage: string
  /** 종결어미 비교 대상. 호출자가 자기 지문 형식에서 뽑아 넘긴다 */
  dialogueLines: string[]
  difficulty: number
  tone: string
}

// keyword가 부분 문자열로 새는지 보는 대조군. 늘려도 된다.
export const LEAK_PROBE = [
  '시간이 없다', '간다고 했다', '간신히 버텼다', '혹시 모르니', '혹은 그러하다',
  '신중하게 굴어라', '신하들이 모였다', '다리를 건넜다', '도끼눈을 떴다',
  '오늘 장이 열린다', '쌀값이 올랐다', '비가 그치지 않는다', '내일 다시 오겠다',
]

/** 종결어미 꼬리 두 글자. 한글만 남기고 본다 — 말투가 갈리는지의 근사다 */
export function ending(line: string): string {
  const hangulOnly = line.replace(/[^가-힣]/g, '')
  return hangulOnly.slice(-2)
}

const sortedJson = (o: Record<string, number>) =>
  JSON.stringify(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)))

/** 항목 하나에 대한 규칙. 실패 메시지 목록을 낸다(빈 배열이면 통과) */
export function checkPassageRules(item: PassageRuleInput): string[] {
  const fails: string[] = []
  const { keyword, passage, dialogueLines } = item

  if (keyword.length < 2) fails.push(`keyword가 한 글자다 (${keyword})`)
  if (!passage.includes(keyword)) fails.push(`keyword가 지문에 없다 (${keyword})`)
  const leaked = LEAK_PROBE.filter((s) => s.includes(keyword))
  if (leaked.length > 0) fails.push(`keyword가 흔한 말에 샌다 (${keyword} → ${leaked.join(', ')})`)

  // 1부 12-1: 배경이 정해지면 말투가 따라 나온다. 규칙으로 못 재니 종결어미로 근사한다.
  const endings = dialogueLines.map(ending)
  if (new Set(endings).size !== endings.length) {
    fails.push(`대사 종결어미가 겹친다 (${JSON.stringify(endings)})`)
  }
  // [SE-03]이 종결어미가 전부 ~다인 문체를 지루하다고 지목했다.
  if (endings.length > 0 && endings.every((e) => e.endsWith('다'))) {
    fails.push(`종결어미가 전부 다로 끝난다 (${JSON.stringify(endings)})`)
  }

  return fails
}

/** 문항 집합 전체에 대한 규칙(분포·중복). 실패 메시지 목록을 낸다 */
export function checkPassageSetRules(
  items: PassageRuleInput[],
  expected: { difficulty: Record<number, number>; tone: Record<string, number>; maxLengthSpread: number }
): string[] {
  const fails: string[] = []
  const countChars = (t: string) => t.replace(/\s/g, '').length

  const lens = items.map((i) => countChars(i.passage))
  const spread = Math.max(...lens) - Math.min(...lens)
  if (spread > expected.maxLengthSpread) {
    fails.push(`지문 길이 폭이 ${spread}자다 (${expected.maxLengthSpread} 이하로)`)
  }

  const diffCounts: Record<string, number> = {}
  for (const i of items) diffCounts[i.difficulty] = (diffCounts[i.difficulty] ?? 0) + 1
  const wantDiff: Record<string, number> = {}
  for (const [k, v] of Object.entries(expected.difficulty)) wantDiff[k] = v
  if (sortedJson(diffCounts) !== sortedJson(wantDiff)) {
    fails.push(`난이도 분포가 ${JSON.stringify(diffCounts)}다 (기대 ${JSON.stringify(wantDiff)})`)
  }

  const toneCounts: Record<string, number> = {}
  for (const i of items) toneCounts[i.tone] = (toneCounts[i.tone] ?? 0) + 1
  if (sortedJson(toneCounts) !== sortedJson(expected.tone)) {
    fails.push(`tone 분포가 ${JSON.stringify(toneCounts)}다 (기대 ${JSON.stringify(expected.tone)})`)
  }

  const keys = new Set(items.map((i) => i.sourceKey))
  if (keys.size !== items.length) fails.push('sourceKey가 중복이다')

  return fails
}
