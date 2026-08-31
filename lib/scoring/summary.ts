import type { ScoringConfig } from './types'

// scoring_config 에서 파생하는 한 줄 요약. 문항 화면에서 지시문 바로 아래에
// 뜬다 — 오른쪽 '무엇을 봅니다' 패널이 상세이고 이것은 그 요약이다.
// 손으로 안 적는다. 채점 임계값을 학습자 말로 옮긴다.
//
// 예) { maxChars: 42, minVerbs: 3, maxRepeat: 2 }
//   → "42자 이하 · 움직이는 말 3개 이상 · 같은 말 반복 2회까지"
export function summarizeConfig(cfg: ScoringConfig): string {
  const parts: string[] = []

  if (cfg.maxChars != null) parts.push(`${cfg.maxChars}자 이하`)
  if (cfg.minChars != null) parts.push(`${cfg.minChars}자 이상`)
  if (cfg.maxLineChars != null) parts.push(`한 줄 ${cfg.maxLineChars}자 이하`)
  if (cfg.minLines != null) parts.push(`${cfg.minLines}줄 이상`)
  if (cfg.maxLines != null) parts.push(`${cfg.maxLines}줄 이하`)

  if (cfg.minVerbs != null) parts.push(`움직이는 말 ${cfg.minVerbs}개 이상`)
  if (cfg.maxAdverbs != null) parts.push(`부사 ${cfg.maxAdverbs}개까지`)
  if (cfg.maxModifiers != null) parts.push(`꾸미는 말 ${cfg.maxModifiers}개까지`)
  if (cfg.maxProperNouns != null) parts.push(`이름 ${cfg.maxProperNouns}개까지`)
  if (cfg.maxRepeat != null) parts.push(`같은 말 반복 ${cfg.maxRepeat}회까지`)

  if (cfg.minSpeeches != null) parts.push(`대사 ${cfg.minSpeeches}개 이상`)
  if (cfg.minMonologues != null) parts.push(`독백 ${cfg.minMonologues}개 이상`)

  if (cfg.forbidLabel) parts.push(`${cfg.forbidLabel} 안 씀`)
  else if (cfg.forbidWords?.length || cfg.forbidLemmas?.length) parts.push('쓰지 않을 말 있음')

  if (cfg.requireAny?.length) parts.push(`'${cfg.requireAny.join("' 또는 '")}' 넣기`)

  return parts.join(' · ')
}
