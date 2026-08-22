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

  // forbidWords(어간 매칭)와 병용한다. forbidWords는 "쳐다봤다"가 "쳐다보"를
  // 포함하지 않아 활용형을 놓치고, 표제어 매칭은 "눈앞"이 눈앞/NNG 한 덩어리라
  // 눈/NNG로 잡히지 않아 복합명사를 놓친다. 서로 다른 구멍을 메우므로 하나가
  // 다른 하나를 대체하지 않는다.
  //
  // gating: app/api/grade/route.ts는 analyze()(형태소 서버 호출)를 await한
  // 뒤에야 combine()을 부른다. combine()이 계산한 needsAi가 그 응답에 그대로
  // 실리고, AI 호출은 (아직 구현되지 않았지만) 그 needsAi를 보고 이후에
  // 이뤄지므로, forbidLemmas fail은 forbidWords와 동일하게 AI 호출 이전에
  // 걸린다 — morph가 null이면 pending으로 남아 needsAi 자체가 false가 된다.
  if (cfg.forbidLemmas?.length) {
    const targets = cfg.forbidLemmas.map((spec) => {
      const i = spec.lastIndexOf('/')
      return { lemma: spec.slice(0, i), tag: spec.slice(i + 1) }
    })
    const hitSurfaces = new Set<string>()
    for (const entry of m.lemmas) {
      for (const { lemma, tag } of targets) {
        if (entry.lemma === lemma && entry.tag.startsWith(tag)) {
          hitSurfaces.add(entry.surface)
        }
      }
    }
    const hits = [...hitSurfaces]
    out.push({
      key: 'forbidLemmas',
      label: '쓰지 않을 말',
      status: hits.length === 0 ? 'pass' : 'fail',
      detail: hits.length === 0 ? '없음' : `${hits.length}개`,
      evidence: hits,
      gating: true,
    })
  }

  return out
}
