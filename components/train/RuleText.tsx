// 규칙 표시. forbidWords 검사에 forbidLabel/forbidDisplay 가 있으면 항상 두 줄:
//   1줄  범주(forbidLabel)
//   2줄  기본형 전체(forbidDisplay), 행 전체 폭, 옅은 색
// 토글도 팝오버도 없다 — 아무것도 안 움직인다. forbidLabel 없는 문항은 rule 만
// 나온다(다른 단계 안 깨짐). '무엇을 봅니다'(제출 전)와 CheckRow(제출 후)가 공유.

export default function RuleText({
  rule,
  examples,
  align = 'left',
}: {
  rule: string
  examples?: string[]
  align?: 'left' | 'right'
}) {
  const list = examples ?? []

  return (
    <span style={{ display: 'block', textAlign: align }}>
      <span>{rule}</span>
      {list.length > 0 && (
        <span
          style={{
            display: 'block',
            marginTop: 3,
            color: 'var(--ink-soft)',
            wordBreak: 'keep-all',
          }}
        >
          {list.join(' · ')}
        </span>
      )}
    </span>
  )
}
