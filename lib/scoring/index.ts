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

export { gradeLocal, pendingMorphChecks, countChars, findForbidden } from './local'
export { gradeMorph } from './morph'
export * from './types'
// analyze는 server-only다. 라우트에서 './remote'로 직접 import한다.
