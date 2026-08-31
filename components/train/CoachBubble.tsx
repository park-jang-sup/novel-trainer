// 코치 캐릭터(먹물이 ✒️) 말풍선. 왼쪽에 이모지, 오른쪽에 말풍선 카드.
// text 가 빈 문자열이면(문장 트랙 외 단계) 아무것도 안 그린다.

export default function CoachBubble({ text }: { text: string }) {
  if (!text) return null

  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl" style={{ lineHeight: 1.2, flexShrink: 0 }} aria-hidden>
        ✒️
      </span>
      <div
        className="relative leading-relaxed"
        style={{
          flex: 1,
          background: 'var(--panel)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          padding: '12px 14px',
          fontFamily: 'var(--font-display)',
        }}
      >
        {/* 왼쪽 꼬리 — 테두리 색 삼각형 위에 배경 색 삼각형을 겹쳐 1px 선을 만든다 */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -8,
            top: 14,
            width: 0,
            height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderRight: '8px solid var(--rule)',
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -7,
            top: 14,
            width: 0,
            height: 0,
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderRight: '8px solid var(--panel)',
          }}
        />
        {text}
      </div>
    </div>
  )
}
