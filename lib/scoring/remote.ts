import 'server-only'
import type { MorphResult } from './types'

const TIMEOUT_MS = 4000

/**
 * Cloud Run 채점 서버 호출. 네트워크만 담당한다.
 * 판정 로직은 morph.ts에 있다.
 *
 * 실패하면 던지지 않고 null을 돌려준다. 호출부가 pending으로 남긴다.
 * 형태소 서버가 죽었다고 사용자 제출이 실패해서는 안 된다.
 */
export async function analyze(text: string): Promise<MorphResult | null> {
  const url = process.env.SCORING_SERVER_URL
  const secret = process.env.SCORING_SERVER_SECRET
  if (!url || !secret) return null

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${url}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-scoring-secret': secret },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    })
    if (!res.ok) return null
    const raw = (await res.json()) as Partial<MorphResult>
    // 필수 필드가 없으면 판정 불가로 취급한다.
    // 여기서 형태소 규칙을 직접 계산하지 않는다 — 서버에만 둔다.
    if (!Array.isArray(raw.adverbs) || !Array.isArray(raw.verbs)) return null
    return {
      adverbs: raw.adverbs,
      modifiers: Array.isArray(raw.modifiers) ? raw.modifiers : [],
      verbs: raw.verbs,
      propers: raw.propers ?? [],
      repeats: Array.isArray(raw.repeats) ? raw.repeats : [],
      sentences: raw.sentences ?? 0,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
