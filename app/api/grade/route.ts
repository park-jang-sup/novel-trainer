import type { NextRequest } from 'next/server'

// TODO 채점 처리 순서 (아직 미구현):
// (1) 입력 길이 검증 (zod, 무료 800자)
// (2) system_flags.kill_switch 확인
// (3) 동일 텍스트 기존 submissions 조회
// (4) consume_ai_quota RPC
// (5) 규칙 기반 채점
// (6) 필요 시에만 Anthropic 호출
// (7) ai_usage_log 기록
export async function POST(_request: NextRequest) {
  return Response.json(
    { error: 'not_implemented' },
    { status: 501 }
  )
}
