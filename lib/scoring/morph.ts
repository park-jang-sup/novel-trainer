// 형태소 결과로 판정하는 순수 함수.
//
// remote.ts와 분리한 이유: remote.ts는 fetch와 시크릿을 다루므로 server-only다.
// 그것이 index.ts에 딸려 들어오면 combine()을 순수 Node에서 테스트할 수 없어
// 사본을 만들게 되고, 검증한 코드와 출하하는 코드가 갈라진다.
// 판정 로직은 여기, 네트워크는 remote.ts. 테스트는 index.ts를 그대로 본다.

import type { Check, MorphResult, ScoringConfig } from './types'

export function gradeMorph(cfg: ScoringConfig, m: MorphResult): Check[] {
  const out: Check[] = []

  // 부사(MAG/MAJ)와 관형형(ETM/MM)은 상한을 따로 둔다.
  // 관형형은 걷어낼 대상이 아니라 좋은 문장의 재료다.
  // "부러진 뼈", "깨진 독"을 부사와 같은 예산에서 빼면
  // 지시문이 요구하는 표현을 쓰는 순간 미달이 된다.
  if (cfg.maxAdverbs !== undefined) {
    out.push({
      key: 'maxAdverbs',
      label: '부사',
      status: m.adverbs.length <= cfg.maxAdverbs ? 'pass' : 'fail',
      detail: `${m.adverbs.length}개 / ${cfg.maxAdverbs}개 이하`,
      evidence: m.adverbs,
    })
  }

  if (cfg.maxModifiers !== undefined) {
    out.push({
      key: 'maxModifiers',
      label: '꾸미는 말',
      status: m.modifiers.length <= cfg.maxModifiers ? 'pass' : 'fail',
      detail: `${m.modifiers.length}개 / ${cfg.maxModifiers}개 이하`,
      evidence: m.modifiers,
    })
  }

  if (cfg.minVerbs !== undefined) {
    out.push({
      key: 'minVerbs',
      label: '움직이는 말',
      status: m.verbs.length >= cfg.minVerbs ? 'pass' : 'fail',
      detail: `${m.verbs.length}개 / ${cfg.minVerbs}개 이상`,
      evidence: m.verbs,
    })
  }

  if (cfg.maxProperNouns !== undefined) {
    out.push({
      key: 'maxProperNouns',
      label: '이름 있는 것',
      status: m.propers.length <= cfg.maxProperNouns ? 'pass' : 'fail',
      detail: `${m.propers.length}개 / ${cfg.maxProperNouns}개 이하`,
      evidence: m.propers,
    })
  }

  if (cfg.maxRepeat !== undefined) {
    // 서버가 표제어 기준으로 세어 내려준다. 조사 변화를 여기서 처리하지 않는다.
    const limit = cfg.maxRepeat
    const over = m.repeats.filter((r) => r.count > limit)
    out.push({
      key: 'maxRepeat',
      label: '반복 어휘',
      status: over.length === 0 ? 'pass' : 'fail',
      detail: over.length === 0 ? '없음' : `${over.length}건`,
      evidence: over.map((r) => `${r.word} ${r.count}회`),
    })
  }

  return out
}
