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

/** 한글·영문·숫자만 센다. 구두점·공백·기호는 뺀다. fill 빈칸의 최소 분량
 *  기준이다 — '.' 이나 '…' 만 넣어 채운 척하는 것을 0자로 만든다. */
export const countLetters = (t: string) =>
  (t.match(/[가-힣A-Za-z0-9]/g) ?? []).length

/**
 * 종결부호(. ! ? …)로 문장을 가른다. 형태소가 필요 없다.
 *
 * fill 빈칸 답안은 "한 문장에서 두 문장"이라 짧고, 지문 조건도 그 범위다.
 *
 * ★ 종결부호로 조각낸 뒤 **글자(한글·영문·숫자)가 든 조각만** 남긴다.
 *   - 끝에 종결부호가 없는 꼬리도 글자가 있으면 한 문장이다.
 *   - '.' · '...' · '?!' 처럼 글자가 하나도 없으면 버린다 (구두점만 넣은 제출).
 *
 * ★ AI 섀도 프롬프트(lib/ai/prompt.ts buildSupportPrompt)가 이 배열의 인덱스로
 *   문장을 1..N 번호 매겨 제시한다 — verifySupportJudgment 도 같은 배열을
 *   봐야 quote·번호 검증이 어긋나지 않는다. 그래서 분할 로직을 여기 하나로
 *   묶는다. 알려진 한계: 대사 안의 !·? 로 문장이 갈릴 수 있다(예: '"뭐야?!"
 *   서린이 물었다' → 두 조각). 형태소 없이 종결부호만 보는 값싼 분할의 대가다.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/[.!?…]+/)
    .map((seg) => seg.trim())
    .filter((seg) => /[가-힣A-Za-z0-9]/.test(seg))
}

export function countSentences(text: string): number {
  return splitSentences(text).length
}

/** 문자열에서 낱말이 나온 횟수(겹치지 않게). repeatTargets 가 쓴다. */
export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let n = 0
  let i = 0
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++
    i += needle.length
  }
  return n
}

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

/**
 * 언어 관문. "이것이 한국어 문장인가"를 잰다 — 좋음·나쁨이 아니라 한국어
 * 문장이 성립하는가. 자유서술형 답안에 이 층이 전혀 없으면 음절 뭉치
 * (예: "뷇뷀롭 얼잫붑")에 요소 낱말만 박은 답안이 규칙을 전부 통과한다
 * (세션 40 실측). 형태소 불필요 — 두 가지만 줄 단위로 센다.
 *
 * (a) 낱자모(ㄱ~ㅣ, 완성형이 아닌 자모) — 본체.
 * (b) 소문자 **3자 이상 연속** 중 모음(aeiou)이 하나도 없는 것의 글자 수 — 보조.
 *     2자 연속(cm·km·kg·ml·mm·pc·tv 등)은 길이 기준으로 통째 제외한다
 *     (화이트리스트가 아니다 — 열린 목록을 안 만든다). 대문자 약어(UFC·VS)는 제외.
 *
 * ★ KS X 1001 밖 음절(완성형이지만 쓰이지 않는 조합) 판정은 여기 안 넣는다 —
 *   Node 기본 API로는 정확히 못 하고, 잘못 만들면 빈 검사가 통과만 시킨다.
 *   음절 뭉치는 형태소 서버의 문장 점수 하한(배포 세션)이 맡는다. 이 관문은
 *   보조이고 본체는 낱자모다.
 *
 * 의성어 단독 줄(따옴표 제거 후 ^[가-힣]{1,7}[-!…]+$)은 건너뛴다 — "콰아앙!"
 * 같은 줄을 헛소리로 오탐하지 않는다.
 */
export function gibberishScore(text: string): { count: number; samples: string[] } {
  const lines = text.split('\n')
  let count = 0
  const samples: string[] = []
  const pushSample = (s: string) => {
    if (samples.length < 5) samples.push(s)
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (/^[가-힣]{1,7}[-!…]+$/.test(line.replace(/["""''']/g, ''))) continue

    for (const ch of line) {
      if (ch >= 'ㄱ' && ch <= 'ㅣ') {
        count++
        pushSample(ch)
      }
    }

    const words = line.match(/[a-z]{2,}/g) || []
    for (const w of words) {
      if (w.length < 3) continue // 2자 연속은 길이로 통째 제외 (cm·km·kg·ml·mm·pc·tv …)
      if (!/[aeiou]/.test(w)) {
        count += w.length
        pushSample(w)
      }
    }
  }
  return { count, samples }
}

/** language_gate 의 판정선. 오탐 0 이 최우선이라 넉넉히 둔다(세션 40 박 님 결정). */
export const GIB_MAX = 2

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
  if (cfg.maxLineWordRepeat !== undefined) {
    const limit = cfg.maxLineWordRepeat
    let worstWord = ''
    let worstCount = 0
    for (const l of lines) {
      const stripped = l.replace(/["'.,!?…]/g, '')
      const words = stripped.split(/\s+/).filter(Boolean)
      const counts = new Map<string, number>()
      for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
      for (const [word, count] of counts) {
        if (count > worstCount) {
          worstCount = count
          worstWord = word
        }
      }
    }
    out.push({
      key: 'maxLineWordRepeat',
      label: '줄 안 반복',
      status: worstCount <= limit ? 'pass' : 'fail',
      detail: `${worstCount}회 / ${limit}회 이하`,
      rule: `한 줄에 같은 말 ${limit}회 이하`,
      evidence: worstCount > limit && worstWord ? [worstWord] : [],
      gating: true,
    })
  }
  // 요소가 '있는가'가 아니라 '마지막 줄에 있는가'를 본다. requireAny는
  // 본문 어디든 보므로 빌드업에 요소를 흘리고 끝을 다른 말로 맺은 답안을
  // 통과시킨다 — 10단계가 막으려는 것이 정확히 그것이다.
  //
  // 빈 줄을 버린 뒤의 마지막 줄이다(lines의 정의는 이 함수 머리에 있다).
  // 답안 끝의 빈 줄이 이 검사를 흔들면 안 된다.
  if (cfg.requireInLastLine?.length) {
    const want = cfg.requireInLastLine
    const last = lines.length > 0 ? lines[lines.length - 1] : ''
    const found = want.filter((w) => last.includes(w))
    out.push({
      key: 'requireInLastLine',
      label: '마지막 줄',
      status: found.length > 0 ? 'pass' : 'fail',
      detail: found.length > 0 ? found.join(', ') : lines.length === 0 ? '답안이 비어 있음' : '마지막 줄에 없음',
      rule: `마지막 줄에 ${want.join(', ')} 중 하나`,
      // 마지막 줄 전체를 근거로 낸다. Editor의 markClassFor에 이 key를
      // 넣지 마라 — 밑줄이 마지막 줄 통째로 그어진다. 틀린 것은 그 줄이
      // 아니라 그 줄에 없는 것이다.
      evidence: found.length > 0 || lines.length === 0 ? [] : [last],
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
  answer?: Answer,
  // 원문. forbidPassageCopy 만 쓴다 — 다른 검사는 config 로 충분하다. gradeLocal
  // 은 원래 passage 를 안 받아서(types.ts 주석) 여기만 선택 인자로 확장한다.
  passage?: string
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

    case 'fill': {
      const blanks = cfg.blanks ?? []
      const filled = sub.blanks ?? {}
      const fixedLines = (cfg.fixedLines ?? [])
        .map((l) => l.trim())
        .filter(Boolean)

      for (const b of blanks) {
        const raw = (filled[b.key] ?? '').trim()

        // 1) 빈칸을 채웠는가. optional 이면 비워도 통과(7-10-2 '가').
        if (!raw) {
          checks.push({
            key: `fill:${b.key}:filled`,
            label: `${b.key} 채움`,
            status: b.optional ? 'pass' : 'fail',
            detail: b.optional ? '비움(선택 입력)' : '비어 있음',
            rule: b.optional ? `${b.key}: 선택 입력` : `${b.key}: 반드시 채운다`,
            gating: true,
          })
          continue
        }

        // 2) 분량. 한 칸에 글자 수는 하나다 — 최대·최소 둘 다 countLetters 로
        //    센다(한글·영문·숫자만, 구두점·공백 제외). '.' 만 넣은 제출은 0자.
        const n = countLetters(raw)
        if (b.maxChars !== undefined) {
          checks.push({
            key: `fill:${b.key}:maxChars`,
            label: `${b.key} 분량`,
            status: n <= b.maxChars ? 'pass' : 'fail',
            detail: `${n}자 / ${b.maxChars}자 이하`,
            rule: `${b.key}: ${b.maxChars}자 이하`,
            gating: true,
          })
        }
        // 최소 분량. b.minChars 가 없으면 기본 8자 — 빈칸을 진짜로 채우게 한다.
        const minChars = b.minChars ?? 8
        if (minChars > 0) {
          checks.push({
            key: `fill:${b.key}:minChars`,
            label: `${b.key} 최소 분량`,
            status: n >= minChars ? 'pass' : 'fail',
            detail: `${n}자 / ${minChars}자 이상`,
            rule: `${b.key}: ${minChars}자 이상`,
            gating: true,
          })
        }

        // 3) 문장 수. 종결부호로 센다 — 형태소 필요 없음.
        if (b.minSentences !== undefined || b.maxSentences !== undefined) {
          const s = countSentences(raw)
          const lo = b.minSentences ?? 1
          const hi = b.maxSentences
          const ok = s >= lo && (hi === undefined || s <= hi)
          const range =
            hi === undefined ? `${lo}문장 이상` : lo === hi ? `${lo}문장` : `${lo}~${hi}문장`
          checks.push({
            key: `fill:${b.key}:sentences`,
            label: `${b.key} 문장 수`,
            status: ok ? 'pass' : 'fail',
            detail: `${s}문장 / ${range}`,
            rule: `${b.key}: ${range}`,
            gating: true,
          })
        }

        // 4) 고정 줄을 그대로 베꼈는가. cue_copied 를 규칙으로 내린 것.
        if (cfg.forbidCopyOfFixedLines && fixedLines.length > 0) {
          const answerLines = raw
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
          const copied = answerLines.filter((l) => fixedLines.includes(l))
          checks.push({
            key: `fill:${b.key}:copy`,
            label: `${b.key} 고정 줄 베낌`,
            status: copied.length === 0 ? 'pass' : 'fail',
            detail: copied.length === 0 ? '없음' : `${copied.length}줄`,
            rule: `${b.key}: 앞뒤 고정 줄을 그대로 옮기지 않는다`,
            evidence: copied,
            gating: true,
          })
        }
      }

      // 5) 금지어 — 대괄호 표지([상황]·[복선]·[결정타] 등). 빈칸을 이어
      //    붙여 한 번에 본다. 어간 매칭이라 대괄호도 그대로 잡힌다.
      if (cfg.forbidWords?.length) {
        const joined = blanks.map((b) => filled[b.key] ?? '').join('\n')
        const hits = findForbidden(joined, cfg.forbidWords)
        checks.push({
          key: 'forbidWords',
          label: '쓰지 않을 말',
          status: hits.length === 0 ? 'pass' : 'fail',
          detail: hits.length === 0 ? '없음' : `${hits.length}개`,
          rule: `쓰지 않음: ${cfg.forbidWords.join(', ')}`,
          evidence: hits,
          gating: true,
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

      // 언어 관문 — "이것이 한국어 문장인가". 형태소 불필요. summarizeConfig
      // (학습자용 조건 요약 한 줄)에는 안 넣는다 — 모든 문항에 늘 있는 바탕
      // 검사라 요약이 그것으로 채워지면 문항별 조건이 묻힌다.
      {
        const gib = gibberishScore(text)
        checks.push({
          key: 'language_gate',
          label: '한국어 문장',
          status: gib.count <= GIB_MAX ? 'pass' : 'fail',
          detail: gib.count <= GIB_MAX ? '정상' : `이상 글자 ${gib.count}개`,
          rule: '음절 뭉치·낱자모가 아닌 한국어',
          evidence: gib.samples,
          gating: true,
        })
      }

      if (cfg.forbidWords?.length) {
        const hits = findForbidden(text, cfg.forbidWords)
        // forbidLabel/forbidDisplay 가 있으면 규칙 줄을 범주 한 줄 + '예: …' 로
        // 보여준다. 채점은 그대로 forbidWords 다.
        const hasDisplay = !!cfg.forbidLabel && !!cfg.forbidDisplay?.length
        checks.push({
          key: 'forbidWords',
          label: '쓰지 않을 말',
          status: hits.length === 0 ? 'pass' : 'fail',
          detail: hits.length === 0 ? '없음' : `${hits.length}개`,
          rule: hasDisplay ? cfg.forbidLabel! : `쓰지 않음: ${cfg.forbidWords.join(', ')}`,
          evidence: hits,
          gating: true, // 감정어가 남아 있으면 AI를 부르지 않는다
          ...(hasDisplay ? { examples: cfg.forbidDisplay! } : {}),
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

      // requireAll: 나열된 낱말이 전부 있어야 한다. requireAny 의 복수형이다.
      // 대비 캐릭터(구성 12)는 두 인물 이름이 다 있어야 성립한다 — 한 명만
      // 쓴 답은 대비가 아니다. 내용(정말 대비했는가)은 AI 몫, 여기선 이름만.
      if (cfg.requireAll?.length) {
        const missing = cfg.requireAll.filter((w) => !text.includes(w))
        checks.push({
          key: 'requireAll',
          label: '모두 넣을 말',
          status: missing.length === 0 ? 'pass' : 'fail',
          detail: missing.length === 0 ? cfg.requireAll.join(', ') : `없음: ${missing.join(', ')}`,
          rule: cfg.requireAll.join(', '),
          gating: true,
        })
      }

      // forbidPassageCopy: 원문(공백 제거)을 답안(같은 정규화)이 통째로 품으면
      // fail. lack·contrast_char 는 원문이 무난한 장면이라 "원문 복사 + 이름"으로
      // 뚫렸다(세션 32 후기 실증). 원문이 안 넘어오면(passage 미지정) 판정 못 하니
      // 검사를 안 만든다 — 화면의 기준 목록은 빈 원문을 넘기지 말고 실제 원문을 준다.
      if (cfg.forbidPassageCopy && passage != null) {
        const strip = (s: string) => s.replace(/\s/g, '')
        const p = strip(passage)
        const copied = p.length > 0 && strip(text).includes(p)
        checks.push({
          key: 'passageCopy',
          label: '원문 그대로 옮김',
          status: copied ? 'fail' : 'pass',
          detail: copied ? '원문을 고치지 않고 그대로 냈다' : '고쳐 씀',
          rule: '원문을 그대로 옮기지 않음',
          gating: true,
        })
      }

      // repeatTargets: 문항별로 지정한 낱말이 몇 번까지 나와도 되는가.
      // 형태소가 아니라 답안 문자열에서 그 낱말이 나온 횟수를 그대로 센다
      // (maxRepeat 가 못 세는 한 음절 반복 — 박·물·간 — 을 잡는다).
      if (cfg.repeatTargets?.length) {
        const over = cfg.repeatTargets
          .map((tgt) => ({ ...tgt, count: countOccurrences(text, tgt.word) }))
          .filter((tgt) => tgt.count > tgt.max)
        checks.push({
          key: 'repeatTargets',
          label: '겹친 말',
          status: over.length === 0 ? 'pass' : 'fail',
          detail: over.length === 0 ? '없음' : `${over.length}개`,
          rule: cfg.repeatTargets.map((tgt) => `${tgt.word} ${tgt.max}회까지`).join(' · '),
          evidence: over.map((tgt) => `${tgt.word} ${tgt.count}회`),
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
