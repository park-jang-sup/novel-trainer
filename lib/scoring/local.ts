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
      gating: true, // 넘치면 AI를 부르지 않는다
    })
  }
  if (cfg.minChars !== undefined && cfg.minChars > 0) {
    out.push({
      key: 'minChars',
      label: '최소 분량',
      status: n >= cfg.minChars ? 'pass' : 'fail',
      detail: `${n}자 / ${cfg.minChars}자 이상`,
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
      gating: true,
    })
  }
  if (cfg.maxLines !== undefined) {
    out.push({
      key: 'maxLines',
      label: '최대 줄 수',
      status: lines.length <= cfg.maxLines ? 'pass' : 'fail',
      detail: `${lines.length}줄 / ${cfg.maxLines}줄 이하`,
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
      evidence: dupLines,
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
        })
        break
      }
      const ok = sub.choiceIndex === answer.index
      checks.push({
        key: 'choice',
        label: '정답',
        status: ok ? 'pass' : 'fail',
        detail: ok ? '맞음' : '다시 보기',
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

      if (cfg.forbidWords?.length) {
        const hits = findForbidden(text, cfg.forbidWords)
        checks.push({
          key: 'forbidWords',
          label: '쓰지 않을 말',
          status: hits.length === 0 ? 'pass' : 'fail',
          detail: hits.length === 0 ? '없음' : `${hits.length}개`,
          evidence: hits,
          gating: true, // 감정어가 남아 있으면 AI를 부르지 않는다
        })
      }

      if (cfg.requireAny?.length) {
        const found = cfg.requireAny.filter((w) => text.includes(w))
        checks.push({
          key: 'requireAny',
          label: '반드시 넣을 말',
          status: found.length > 0 ? 'pass' : 'fail',
          detail: found.length > 0 ? found.join(', ') : '없음',
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
    })
  }
  if (cfg.maxModifiers !== undefined) {
    out.push({
      key: 'maxModifiers',
      label: '꾸미는 말',
      status: 'pending',
      detail: '형태소 분석 대기',
    })
  }
  if (cfg.minVerbs !== undefined) {
    out.push({
      key: 'minVerbs',
      label: '움직이는 말',
      status: 'pending',
      detail: '형태소 분석 대기',
    })
  }
  if (cfg.maxProperNouns !== undefined) {
    out.push({
      key: 'maxProperNouns',
      label: '이름 있는 것',
      status: 'pending',
      detail: '형태소 분석 대기',
    })
  }
  if (cfg.maxRepeat !== undefined) {
    out.push({
      key: 'maxRepeat',
      label: '반복 어휘',
      status: 'pending',
      detail: '형태소 분석 대기',
    })
  }
  if (cfg.forbidLemmas?.length) {
    out.push({
      key: 'forbidLemmas',
      label: '쓰지 않을 말',
      status: 'pending',
      detail: '형태소 분석 대기',
    })
  }
  return out
}
