// 원고지 칸이 아니라 입력창 아래 괘선 자체가 채워진다. 별도 요소를 만들지 않아 화면이 조용하다.
export default function RuleGauge({ count, max }: { count: number; max: number }) {
  const over = count > max
  return (
    <div style={{ height: 2, background: 'var(--rule)' }}>
      <div
        style={{
          width: `${Math.min(count / max, 1) * 100}%`,
          height: '100%',
          background: over ? 'var(--mark)' : 'var(--ink)',
          transition: 'width 120ms linear',
        }}
      />
    </div>
  )
}
