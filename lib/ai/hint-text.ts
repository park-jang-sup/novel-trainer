/**
 * 카드 문구 조립(세션 45~46). **AI 는 지목·관측만 한다** — 자리·인용·근거
 * 문장 같은 사실만 낸다. 이 파일의 순수 함수들이 그 사실을 단계 언어
 * (한국어 문장)로 옮긴다. AI 가 프로즈를 직접 쓰지 않는다는 원칙을 지키는
 * 자리라 전부 순수 함수다 — verify.ts 가 문안을 전부 문다.
 *
 * ★ null 을 내는 것은 "짓지 못했다"다 — 재료가 없으면 억지로 짓지 않고
 *   조용히 포기한다(호출부가 카드를 안 띄운다). 어중간한 문장을 짓는 것보다
 *   안 짓는 게 낫다.
 *
 * ★★ buildHintCardText(아래)는 **hint-v1** 전용이다(세션 45) — 세션 46 이
 *   힌트를 v2(AI 가 직접 코칭 문장을 쓰고 제약만 검증)로 갈아탔고, route.ts
 *   는 이제 이 함수를 안 부른다. 지우지 않고 둔다(박 님 지시 — hint-v1 코드는
 *   보존) — verify.ts 의 기존 픽스처가 계속 서 있다.
 */
import { splitSentences } from '../scoring/local'

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

// ─────────────────────────────────────────────────────────────────────────
// 조사 헬퍼(세션 46). ★ 저장소를 뒤졌지만 기존 조사(은/는·이/가·을/를) 헬퍼를
// 못 찾았다 — 세션 지시문의 "기존 조사 헬퍼 재사용"이 가리키는 파일이 없다
// (STATUS 에 남긴다). 그래서 여기서 새로 짠다. 받침 유무로만 가른다 —
// 한글 완성형(가~힣) 밖의 글자(로마자·숫자 등)로 끝나면 보수적으로 받침
// 있음으로 본다(문법 오류보다 어색한 쪽이 낫다).
// ─────────────────────────────────────────────────────────────────────────

function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return true
  return (code - 0xac00) % 28 !== 0
}

/** 이/가. "주원" → "주원이", "강태" → "강태가". */
export function josaIGa(word: string): string {
  return hasBatchim(word) ? `${word}이` : `${word}가`
}

/** 을/를. */
export function josaEulReul(word: string): string {
  return hasBatchim(word) ? `${word}을` : `${word}를`
}

/**
 * tell 관측 카드(세션 46, 박 님 확정 문구). {quote} 는 답안 문장 앞 15자 +
 * '…'(15자를 넘을 때만 자른다) — 카드에 문장 전체를 그대로 옮기면 길어져서
 * "몸·사물로 바꿔 보라"는 요지가 묻힌다. "방패·손·발" 은 fireball 문항
 * 재료다(박 님 지시) — 문항마다 바꾸지 않고 그대로 둔다.
 */
export function buildTellCardText(quote: string): string {
  const truncated = quote.length > 15 ? `${quote.slice(0, 15)}…` : quote
  return `「${truncated}」는 아픈 느낌의 이름만 말한 거야. 독자는 이름을 볼 수 없어. 방패가 어떻게 됐는지, 손이 어떻게 됐는지, 발이 어디까지 밀렸는지 — 눈에 보이는 것으로 바꿔 봐. 통과 뒤에 뜨는 모범답안 가·나에서 결과를 어떻게 그렸는지 보면 감이 올 거야.`
}

/**
 * no_beat gating(미달) 카드(세션 46, 박 님 확정 문구). {인물}=requireAll[0]
 * · {상대}=requireAll[1] — 둘 다 bt- 문항엔 항상 있다(호출부가 확인하고
 * 부른다). 세션 43 의 제약 안내(품질 판정 아님) 원칙은 그대로 — 이 문구도
 * "무엇이 있어야 한 턴인지"만 말한다.
 */
export function buildNoBeatGateCardText(person: string, opponent: string): string {
  return `아직 누가 이기고 지는지가 안 나왔어. ${josaIGa(person)} ${josaEulReul(opponent)} 보고 뭘 알아챘는지 한 줄, 그걸 믿고 어떤 수를 뒀는지 한 줄, 그래서 ${josaIGa(opponent)} 어떻게 됐는지 한 줄 — 이 셋이 있어야 한 턴이야.`
}

/**
 * 절단 신호(signal) 관측 카드(세션 47, 구성 16 ca- 전용). 'signal' 이면
 * 인용 앞 15자로 자른다(buildTellCardText 와 같은 자르기 규칙 — 카드에
 * 문장 전체를 옮기면 길어져 요지가 묻힌다). 'no_signal' 은 원칙만 말한다
 * (인용할 문장이 없다). 'pending' 은 호출부가 카드 자체를 안 만든다.
 */
export function buildSignalCardText(verdict: 'signal' | 'no_signal', quote?: string): string {
  if (verdict === 'no_signal') {
    return "마지막 줄이 갑자기 와. 그 앞에 '온다'는 낌새 한 줄 — 평소와 다른 것, 있어선 안 될 것 — 을 깔아 봐."
  }
  const truncated = quote && quote.length > 15 ? `${quote.slice(0, 15)}…` : quote ?? ''
  return `끊기 전에 신호가 있어 — 「${truncated}」`
}

// ─────────────────────────────────────────────────────────────────────────
// 힌트 v2 재료 결정(세션 46)
// ─────────────────────────────────────────────────────────────────────────

/**
 * cfg.ai_hint_material 이 있으면 그대로 쓴다(박 님이 문항마다 직접 거른
 * 관찰 거리 — 답이 아니다). 없으면(bt-spear-range) 원문(passage) 마지막
 * 문장부터 거슬러 올라가며 forbidWords 에 하나도 안 걸리는 첫 문장을
 * 재료로 쓴다 — "지우라고 가르치는 문장을 재료로 짚었다"(hint-v1 반려
 * 사유)를 되풀이하지 않으려면 결함(forbidWords 걸림) 없는 문장만 골라야
 * 한다. 그런 문장이 하나도 없으면 null — 호출부가 힌트 자체를 건너뛴다.
 */
export function resolveHintMaterial(
  cfg: { ai_hint_material?: string; forbidWords?: string[] },
  passage: string
): string | null {
  if (cfg.ai_hint_material) return cfg.ai_hint_material
  const forbidWords = cfg.forbidWords ?? []
  const sentences = splitSentences(passage)
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i]
    if (!forbidWords.some((w) => s.includes(w))) return s
  }
  return null
}
