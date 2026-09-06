/**
 * 힌트 카드 문구(세션 45). **AI 는 지목만 한다** — 자리(insert_before)와
 * 원문 인용(source_quote) 두 사실뿐이다. 이 함수가 그 사실을 단계 언어
 * (한국어 문장)로 옮긴다. AI 가 프로즈를 직접 쓰지 않는다는 원칙을 지키는
 * 자리라 순수 함수로 둔다 — verify.ts 가 네 문안(세 verdict + 폐기)을
 * 전부 문다.
 *
 * ★ null 을 내는 것은 "짓지 못했다"다 — 재료(beatText·beforeText 등)가
 *   없으면 억지로 짓지 않고 조용히 포기한다(호출부가 힌트 카드를 안 띄운다,
 *   1층 문구만 남는다). 어중간한 문장을 짓는 것보다 안 짓는 게 낫다.
 */
export type HintCardVerdict = 'none' | 'no_beat' | 'support_not_before'

export interface HintCardContext {
  supportVerdict: HintCardVerdict
  /** requireAll[0] — 이 힌트가 붙는 문항(bt-)엔 항상 있다. */
  person: string
  /** support 의 beat_line 문장 텍스트. no_beat 에는 없다(beat 자체가 없다). */
  beatText: string | null
  /** support_not_before 의 근거(quote) 텍스트. */
  supportQuote: string | null
  /** 힌트의 원문 인용. */
  sourceQuote: string
  /** 힌트가 가리키는 답안 문장(끼워 넣을 자리 바로 뒤) 텍스트. */
  beforeText: string | null
}

export function buildHintCardText(ctx: HintCardContext): string | null {
  switch (ctx.supportVerdict) {
    case 'none':
      if (!ctx.beatText || !ctx.beforeText) return null
      return `「${ctx.beatText}」가 통하려면 그 앞에 ${ctx.person}이 상대를 읽은 줄이 있어야 해. 원문에 이런 게 있어 — 「${ctx.sourceQuote}」. 이걸 ${ctx.person}이 읽는 한 줄로 「${ctx.beforeText}」 앞에 넣어 봐.`
    case 'no_beat':
      return `아직 승부 수가 없어. 원문의 「${ctx.sourceQuote}」를 받아서 ${ctx.person}이 어떤 수를 두는지 한 줄, 그 결과 한 줄을 넣어 봐.`
    case 'support_not_before':
      if (!ctx.supportQuote || !ctx.beatText) return null
      return `근거 「${ctx.supportQuote}」가 결정타 뒤에 있어. 「${ctx.beatText}」 앞으로 옮겨 봐.`
  }
}
