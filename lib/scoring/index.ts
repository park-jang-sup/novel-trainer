import type {
  Answer,
  Check,
  CheckStatus,
  GradeResult,
  MorphResult,
  Problem,
  Submission,
} from './types'
import { gradeLocal, pendingMorphChecks } from './local'
import { gradeMorph } from './morph'

/**
 * 규칙 채점 조합.
 *
 * morph가 null이면 형태소 기반 항목은 pending으로 남는다.
 * pending을 통과로 올려주지 않는 것이 핵심이다 — 4주차 Cloud Run이
 * 붙기 전에는 그 항목이 "아직 모른다"로 남아야 한다.
 *
 * 네트워크(analyze)는 이 파일에서 부르지 않는다. 라우트가 불러서 넘긴다.
 * 그래야 이 파일을 server-only 없이 그대로 테스트할 수 있다.
 */
export function combine(
  problem: Problem,
  sub: Submission,
  answer?: Answer,
  morph?: MorphResult | null
): GradeResult {
  const cfg = problem.scoring_config ?? {}
  const checks: Check[] = gradeLocal(problem, sub, answer)

  if (morph) {
    checks.push(...gradeMorph(cfg, morph))
  } else {
    checks.push(...pendingMorphChecks(cfg))
  }

  const blocked = checks.some((c) => c.gating && c.status === 'fail')

  let status: CheckStatus
  if (checks.some((c) => c.status === 'fail')) status = 'fail'
  else if (checks.some((c) => c.status === 'pending')) status = 'pending'
  else status = 'pass'

  // 규칙을 전부 통과했을 때만 AI를 부른다. ai / hybrid 모두 같은 기준이다.
  //
  // pending에서 부르지 않는 이유: 판정 근거가 불완전한 상태에서 과금하면
  // 결과를 신뢰할 수 없고, Cloud Run이 없는 동안 계속 새 나간다.
  // 예전에 ai 모드만 status !== 'fail' 로 두었다가 pending에서도
  // 호출되는 버그가 있었다. 두 모드를 갈라놓지 않는다.
  const needsAi =
    !blocked &&
    status === 'pass' &&
    (problem.scoring_mode === 'ai' || problem.scoring_mode === 'hybrid')

  return { checks, status, blocked, needsAi }
}

/**
 * 화면 표시 전용 병합. combine()의 출력(DB에 저장됨)에는 쓰지 않는다.
 *
 * forbidWords(어간 매칭)와 forbidLemmas(표제어 매칭)는 판정 근거가
 * 서로 달라 combine()에서는 끝까지 분리해 둔다. 병합본이 저장되면
 * 나중에 어느 검사가 걸렸는지 되짚을 수 없다. 화면에는 같은 라벨
 * ('쓰지 않을 말')이 두 줄로 뜨는 것이 학습자에게 혼란스러우므로
 * 여기서만 한 줄로 합친다.
 *
 * key를 'forbidWords'로 유지하는 이유: Editor.tsx의 markClassFor가
 * key로 하이라이트 색을 고른다. 새 key를 만들면 그쪽도 고쳐야 한다.
 */
export function mergeForbidChecks(checks: Check[]): Check[] {
  const words = checks.find((c) => c.key === 'forbidWords')
  const lemmas = checks.find((c) => c.key === 'forbidLemmas')
  if (!words || !lemmas) return checks

  const evidence = [...new Set([...(words.evidence ?? []), ...(lemmas.evidence ?? [])])]
  const status: CheckStatus =
    words.status === 'fail' || lemmas.status === 'fail'
      ? 'fail'
      : words.status === 'pending' || lemmas.status === 'pending'
        ? 'pending'
        : 'pass'
  const merged: Check = {
    key: 'forbidWords',
    label: '쓰지 않을 말',
    status,
    detail: evidence.length === 0 ? '없음' : `${evidence.length}개`,
    evidence,
    gating: !!(words.gating || lemmas.gating),
  }

  return checks
    .filter((c) => c.key !== 'forbidLemmas')
    .map((c) => (c.key === 'forbidWords' ? merged : c))
}

export { gradeLocal, pendingMorphChecks, countChars, findForbidden } from './local'
export { gradeMorph } from './morph'
export * from './types'
// analyze는 server-only다. 라우트에서 './remote'로 직접 import한다.
