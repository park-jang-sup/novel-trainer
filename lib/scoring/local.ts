// 형태소 분석이 필요 없는 검사만 둔다.
// 형태소가 필요한 검사(부사·수식어·고유명사)는 절대 여기에 구현하지 않는다.
// Day1 실행판 C장: "규칙 기반 채점을 두 군데 두지 않는다."

import type {
  Answer,
  Check,
  CountOp,
  Problem,
  ScoringConfig,
  Submission,
} from './types'

export const countChars = (t: string) => t.replace(/\s/g, '').length

/** 어간 매칭. "기뻤"은 기뻤다·기뻤고·기뻤지만을 모두 잡는다. */
export function findForbidden(text: string, stems: string[]): string[] {
  const hits: string[] = []
  for (const stem of stems) {
    let from = 0
    while (true) {
      const i = text.indexOf(stem, from)
      if (i === -1) break
      // 어절 전체를 근거로 보여준다
      let s = i
      while (s > 0 && /[가-힣]/.test(text[s - 1])) s--
      let e = i + stem.length
      while (e < text.length && /[가-힣]/.test(text[e])) e++
      const word = text.slice(s, e)
      if (!hits.includes(word)) hits.push(word)
      from = i + stem.length
    }
  }
  return hits
}

// 반복 어휘 검사는 여기 없다.
//
// "제비를 / 제비는 / 제비가"는 어절이 서로 달라 문자열 비교로는 반복을 잡지 못한다.
// 조사를 떼려면 형태소 분석이 필요하므로 이 검사는 Python 서버가 전담한다.
// 고유명사 검출에서 같은 실수를 한 적이 있다. 사전과 정규식으로 조사를
// 떼려는 시도는 오탐만 만든다.

function applyOp(op: CountOp, nums: number[]): number {
  switch (op) {
    case 'multiply':
      return nums.reduce((a, b) => a * b, 1)
    case 'add':
      return nums.reduce((a, b) => a + b, 0)
    case 'subtract':
      return nums.slice(1).reduce((a, b) => a - b, nums[0] ?? 0)
    case 'divide':
      return nums.slice(1).reduce((a, b) => (b === 0 ? NaN : a / b), nums[0] ?? 0)
  }
}

function lengthChecks(text: string, cfg: ScoringConfig): Check[] {
  const out: Check[] = []
  const n = countChars(text)
  if (cfg.maxChars !== undefined) {
    out.push({
      key: 'maxChars',
      label: '분량',
      status: n <= cfg.maxChars ? 'pass' : 'fail',
      detail: `${n}자 / ${cfg.maxChars}자 이하`,
      rule: `${cfg.maxChars}자 이하`,
      gating: true, // 넘치면 AI를 부르지 않는다
    })
  }
  if (cfg.minChars !== undefined && cfg.minChars > 0) {
    out.push({
      key: 'minChars',
      label: '최소 분량',
      status: n >= cfg.minChars ? 'pass' : 'fail',
      detail: `${n}자 / ${cfg.minChars}자 이상`,
      rule: `${cfg.minChars}자 이상`,
      gating: true,
    })
  }
  return out
}

/**
 * 줄 단위 검사. 형태소가 필요 없다.
 *
 * 줄의 정의: '\n'으로 쪼갠 뒤 trim해서 빈 줄은 버린다. 문단 사이를
 * 띄우는 관행(빈 줄)을 벌하면 안 되기 때문이다.
 */
function lineChecks(text: string, cfg: ScoringConfig): Check[] {
  const out: Check[] = []
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (cfg.minLines !== undefined) {
    out.push({
      key: 'minLines',
      label: '최소 줄 수',
      status: lines.length >= cfg.minLines ? 'pass' : 'fail',
      detail: `${lines.length}줄 / ${cfg.minLines}줄 이상`,
      rule: `${cfg.minLines}줄 이상`,
      gating: true,
    })
  }
  if (cfg.maxLines !== undefined) {
    out.push({
      key: 'maxLines',
      label: '최대 줄 수',
      status: lines.length <= cfg.maxLines ? 'pass' : 'fail',
      detail: `${lines.length}줄 / ${cfg.maxLines}줄 이하`,
      rule: `${cfg.maxLines}줄 이하`,
      gating: true,
    })
  }
  if (cfg.maxLineChars !== undefined) {
    const maxLineChars = cfg.maxLineChars
    const bad = lines.filter((l) => countChars(l) > maxLineChars)
    out.push({
      key: 'maxLineChars',
      label: '긴 줄',
      status: bad.length === 0 ? 'pass' : 'fail',
      detail: bad.length === 0 ? '없음' : `${bad.length}개`,
      rule: `한 줄 ${maxLineChars}자 이하`,
      evidence: bad,
      gating: true,
    })
  }
  if (cfg.maxDuplicateLines !== undefined) {
    const seen = new Map<string, number>()
    for (const l of lines) seen.set(l, (seen.get(l) ?? 0) + 1)
    const dupCount = lines.length - seen.size
    const dupLines = [...seen.entries()]
      .filter(([, n]) => n >= 2)
      .map(([l]) => l)
      .slice(0, 3)
    out.push({
      key: 'maxDuplicateLines',
      label: '줄 중복',
      status: dupCount <= cfg.maxDuplicateLines ? 'pass' : 'fail',
      detail: dupCount === 0 ? '없음' : `${dupCount}줄`,
      rule: cfg.maxDuplicateLines === 0 ? '되풀이 없어야 함' : `되풀이 ${cfg.maxDuplicateLines}줄까지 허용`,
      evidence: dupLines,
      gating: true,
    })
  }

  return out
}

interface QuotePair {
  start: number // 여는 따옴표의 인덱스
  end: number // 닫는 따옴표의 인덱스
  content: string
}

/** 따옴표 문자의 위치를 모아 앞에서부터 둘씩 짝짓는다. 홀수 개가 남으면 마지막 하나는 버린다. */
function quotePairs(text: string, ch: string): QuotePair[] {
  const idx: number[] = []
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ch) idx.push(i)
  }
  const pairs: QuotePair[] = []
  for (let i = 0; i + 1 < idx.length; i += 2) {
    pairs.push({ start: idx[i], end: idx[i + 1], content: text.slice(idx[i] + 1, idx[i + 1]) })
  }
  return pairs
}

/**
 * 대사·독백 검사(8단계). 형태소가 필요 없다.
 *
 * 큰따옴표 쌍은 대사, 작은따옴표 쌍은 독백으로 센다.
 *
 * 알려진 한계: 대사 안에 작은따옴표가 섞이면(예: "그건 '간'이 아닙니다.")
 * 독백 쌍 수가 부푼다. 지문을 우리가 쓰고 지시문이 큰따옴표/작은따옴표를
 * 선언하므로 실사용에서는 드물다. 문서에만 적으면 아무도 돌아오지 않아
 * 여기 코드에 적어 둔다.
 */
/**
 * 서술 줄의 수. 서술 = 대사(큰따옴표)도 독백(작은따옴표)도 아닌 줄.
 *
 * 큰따옴표로 시작하지 않는 줄을 전부 서술로 세면 안 된다 — 독백 줄도
 * 큰따옴표로 시작하지 않으므로 그러면 독백이 서술로 잘못 세어진다.
 * 초안 단계에서 실제로 이 버그를 냈고, 좋은 답안의 서술 줄 수가
 * 1이 아니라 2~3으로 나온 것으로 겨우 잡았다. 눈으로는 안 보인다.
 */
function countNarrationLines(text: string): number {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.filter((l) => !l.startsWith('"') && !l.startsWith("'")).length
}

function quoteChecks(text: string, cfg: ScoringConfig): Check[] {
  const out: Check[] = []
  const speeches = quotePairs(text, '"')
  const monologues = quotePairs(text, "'")
  const rawMonologueQuoteCount = text.match(/'/g)?.length ?? 0
  // 작은따옴표가 아예 없으면(가장 흔한 경우 — 학습자가 속마음을 썼지만
  // 표기를 안 한 경우다) 쌍이 0으로 떨어져 minMonologues가 "미달"로
  // 걸린다. 판정은 맞지만 말이 틀린다 — 화면이 "안 썼다"고 하면 학습자는
  // 헤맨다. 홀수 개(감싸다 만 경우)는 다른 문제이므로 따로 구분한다.
  const noMonologueQuotes = rawMonologueQuoteCount === 0
  const oddMonologueQuotes = rawMonologueQuoteCount % 2 !== 0
  const monologueQuoteDetail = noMonologueQuotes
    ? '작은따옴표로 감싼 부분이 없습니다'
    : oddMonologueQuotes
      ? '따옴표 짝이 맞지 않습니다'
      : null

  if (cfg.minSpeeches !== undefined) {
    out.push({
      key: 'minSpeeches',
      label: '대사 수',
      status: speeches.length >= cfg.minSpeeches ? 'pass' : 'fail',
      detail: `${speeches.length}개 / ${cfg.minSpeeches}개 이상`,
      rule: `${cfg.minSpeeches}개 이상`,
      gating: true,
    })
  }
  if (cfg.minMonologues !== undefined) {
    out.push({
      key: 'minMonologues',
      label: '독백 수',
      status: monologues.length >= cfg.minMonologues ? 'pass' : 'fail',
      detail: monologueQuoteDetail ?? `${monologues.length}개 / ${cfg.minMonologues}개 이상`,
      rule: `${cfg.minMonologues}개 이상`,
      gating: true,
    })
  }
  if (cfg.minMonologueChars !== undefined) {
    const minMonologueChars = cfg.minMonologueChars
    const short = monologues.filter((m) => countChars(m.content) < minMonologueChars)
    const ok = monologues.length > 0 && short.length === 0
    out.push({
      key: 'minMonologueChars',
      label: '독백 글자수',
      status: ok ? 'pass' : 'fail',
      detail: monologueQuoteDetail ?? (ok ? '미달 없음' : `${short.length}개 미달`),
      rule: `${minMonologueChars}자 이상`,
      evidence: short.map((m) => m.content),
      gating: true,
    })
  }
  if (cfg.requireMonologueBetween !== undefined) {
    const between =
      speeches.length > 0 &&
      monologues.some((m) => speeches[0].start < m.start && m.end < speeches[speeches.length - 1].end)
    out.push({
      key: 'requireMonologueBetween',
      label: '독백 위치',
      status: between ? 'pass' : 'fail',
      detail: between ? '사이에 있음' : '사이에 없음',
      rule: '대사와 대사 사이',
      gating: true,
    })
  }
  if (cfg.maxNarrationLines !== undefined) {
    const narrationCount = countNarrationLines(text)
    out.push({
      key: 'maxNarrationLines',
      label: '서술 줄',
      status: narrationCount <= cfg.maxNarrationLines ? 'pass' : 'fail',
      detail: `${narrationCount}줄 / ${cfg.maxNarrationLines}줄 이하`,
      rule: `${cfg.maxNarrationLines}줄 이하`,
      gating: true,
    })
  }

  return out
}

/**
 * 로컬 검사 전부. 형태소가 필요한 항목은 여기서 만들지 않는다.
 * remote.ts가 나중에 pending 자리를 채운다.
 */
export function gradeLocal(
  problem: Problem,
  sub: Submission,
  answer?: Answer
): Check[] {
  const cfg = problem.scoring_config ?? {}
  const checks: Check[] = []

  switch (problem.type) {
    case 'choice': {
      if (!answer || answer.kind !== 'choice') {
        checks.push({
          key: 'choice',
          label: '정답',
          status: 'pending',
          detail: '정답 정보를 불러오지 못했습니다',
          rule: '정답과 일치해야 함',
        })
        break
      }
      const ok = sub.choiceIndex === answer.index
      checks.push({
        key: 'choice',
        label: '정답',
        status: ok ? 'pass' : 'fail',
        detail: ok ? '맞음' : '다시 보기',
        rule: '정답과 일치해야 함',
      })
      break
    }

    case 'order': {
      if (!answer || answer.kind !== 'order') {
        checks.push({
          key: 'order',
          label: '순서',
          status: 'pending',
          detail: '정답 정보를 불러오지 못했습니다',
          rule: '정답 순서와 일치해야 함',
        })
        break
      }
      const got = sub.order ?? []
      const want = answer.sequence
      const ok =
        got.length === want.length && got.every((v, i) => v === want[i])
      const wrongAt = got.findIndex((v, i) => v !== want[i])
      checks.push({
        key: 'order',
        label: '순서',
        status: ok ? 'pass' : 'fail',
        detail: ok ? '맞음' : `${wrongAt + 1}번째부터 어긋남`,
        rule: '정답 순서와 일치해야 함',
      })
      break
    }

    case 'count': {
      const vals = sub.values ?? {}
      const inputs = cfg.inputs ?? []
      const missing = inputs.filter(
        (i) => typeof vals[i.key] !== 'number' || Number.isNaN(vals[i.key])
      )
      if (missing.length > 0) {
        checks.push({
          key: 'inputs',
          label: '입력값',
          status: 'fail',
          detail: `${missing.length}개 비어 있음`,
          rule: '모든 입력값을 채워야 함',
          evidence: missing.map((m) => m.label),
        })
        break
      }
      const outOfRange = inputs.filter(
        (i) => vals[i.key] < i.min || vals[i.key] > i.max
      )
      if (outOfRange.length > 0) {
        checks.push({
          key: 'range',
          label: '입력 범위',
          status: 'fail',
          detail: '범위를 벗어남',
          rule: '입력값이 각 범위 안에 있어야 함',
          evidence: outOfRange.map(
            (i) => `${i.label}: ${i.min}~${i.max}`
          ),
        })
        break
      }
      const computed = applyOp(
        cfg.op ?? 'multiply',
        inputs.map((i) => vals[i.key])
      )
      if (!answer || answer.kind !== 'count') {
        checks.push({
          key: 'count',
          label: '계산',
          status: 'pending',
          detail: `계산값 ${computed}`,
          rule: '목표값 근처여야 함',
        })
        break
      }
      const diff = Math.abs(computed - answer.expected)
      const ok = diff <= answer.expected * answer.tolerance
      checks.push({
        key: 'count',
        label: '분량 추정',
        status: ok ? 'pass' : 'fail',
        detail: `${computed}화 (목표 ${answer.expected}화)`,
        rule: `목표 ${answer.expected}화 근처(오차 ${Math.round(answer.tolerance * 100)}% 이내)`,
      })
      break
    }

    case 'coinage': {
      const lines = (sub.text ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (cfg.count !== undefined) {
        checks.push({
          key: 'count',
          label: '개수',
          status: lines.length === cfg.count ? 'pass' : 'fail',
          detail: `${lines.length}개 / ${cfg.count}개`,
          rule: `${cfg.count}개`,
          gating: true,
        })
      }
      const lo = cfg.minLen ?? 1
      const hi = cfg.maxLen ?? 99
      const bad = lines.filter((l) => l.length < lo || l.length > hi)
      checks.push({
        key: 'length',
        label: '글자 수',
        status: bad.length === 0 ? 'pass' : 'fail',
        detail: `${lo}~${hi}자`,
        rule: `${lo}~${hi}자`,
        evidence: bad,
      })
      if (cfg.distinctInitial) {
        const initials = lines.map((l) => l[0])
        const dup = initials.filter((c, i) => initials.indexOf(c) !== i)
        checks.push({
          key: 'initial',
          label: '첫 글자 중복',
          status: dup.length === 0 ? 'pass' : 'fail',
          detail: dup.length === 0 ? '없음' : `${dup.length}건`,
          rule: '첫 글자 중복 없어야 함',
          evidence: [...new Set(dup)],
        })
      }
      break
    }

    // remove / convert / continue — 서술형
    default: {
      const text = sub.text ?? ''
      checks.push(...lengthChecks(text, cfg))
      checks.push(...lineChecks(text, cfg))
      checks.push(...quoteChecks(text, cfg))

      if (cfg.forbidWords?.length) {
        const hits = findForbidden(text, cfg.forbidWords)
        checks.push({
          key: 'forbidWords',
          label: '쓰지 않을 말',
          status: hits.length === 0 ? 'pass' : 'fail',
          detail: hits.length === 0 ? '없음' : `${hits.length}개`,
          rule: `쓰지 않음: ${cfg.forbidWords.join(', ')}`,
          evidence: hits,
          gating: true, // 감정어가 남아 있으면 AI를 부르지 않는다
        })
      }

      // 알려진 한계: requireAny는 낱말 하나가 들어 있는지만 본다. 낱말만
      // 남기고 내용을 통째로 바꾼 답안은 통과한다. 재봤다 —
      //   "오늘 장에 제비가 날아들었습니다." / '값을 더 받을 수 있을지…' / …  59자 통과
      // 서술형 채점이 전부 안고 있는 것이지 8단계만의 결함이 아니다. 내용
      // 판정은 AI 쪽 몫이다. 규칙으로 더 조이려 들지 마라 — 조이면 좋은
      // 답안이 먼저 걸린다.
      if (cfg.requireAny?.length) {
        const found = cfg.requireAny.filter((w) => text.includes(w))
        checks.push({
          key: 'requireAny',
          label: '반드시 넣을 말',
          status: found.length > 0 ? 'pass' : 'fail',
          detail: found.length > 0 ? found.join(', ') : '없음',
          rule: cfg.requireAny.join(', '),
          gating: true,
        })
      }

      // maxRepeat는 형태소가 필요하다. pendingMorphChecks가 자리를 잡는다.
      break
    }
  }

  return checks
}

/** 형태소가 필요해 아직 판정하지 못한 항목을 pending으로 미리 채운다. */
export function pendingMorphChecks(cfg: ScoringConfig): Check[] {
  const out: Check[] = []
  if (cfg.maxAdverbs !== undefined) {
    out.push({
      key: 'maxAdverbs',
      label: '부사',
      status: 'pending',
      detail: '형태소 분석 대기',
      rule: `${cfg.maxAdverbs}개 이하`,
    })
  }
  if (cfg.maxModifiers !== undefined) {
    out.push({
      key: 'maxModifiers',
      label: '꾸미는 말',
      status: 'pending',
      detail: '형태소 분석 대기',
      rule: `${cfg.maxModifiers}개 이하`,
    })
  }
  if (cfg.minVerbs !== undefined) {
    out.push({
      key: 'minVerbs',
      label: '움직이는 말',
      status: 'pending',
      detail: '형태소 분석 대기',
      rule: `${cfg.minVerbs}개 이상`,
    })
  }
  if (cfg.maxProperNouns !== undefined) {
    out.push({
      key: 'maxProperNouns',
      label: '이름 있는 것',
      status: 'pending',
      detail: '형태소 분석 대기',
      rule: `${cfg.maxProperNouns}개 이하`,
    })
  }
  if (cfg.maxRepeat !== undefined) {
    out.push({
      key: 'maxRepeat',
      label: '반복 어휘',
      status: 'pending',
      detail: '형태소 분석 대기',
      rule: `같은 낱말 ${cfg.maxRepeat}회까지`,
    })
  }
  if (cfg.forbidLemmas?.length) {
    out.push({
      key: 'forbidLemmas',
      label: '쓰지 않을 말',
      status: 'pending',
      detail: '형태소 분석 대기',
      rule: `쓰지 않음: ${cfg.forbidLemmas.map((s) => s.split('/')[0]).join(', ')}`,
    })
  }
  return out
}
