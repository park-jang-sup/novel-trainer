'use client'

import { useMemo } from 'react'
import { countLetters, countSentences, fillPassageParts } from '@/lib/scoring'
import type { FillBlank } from './FillBlank'

// fill 문항의 지문 + 입력. 고정 줄 사이에 빈칸(①②)이 번갈아 오고,
// 학습자는 그 빈칸만 채운다. 머리([상황]/[복선]/[결정타])는 힌트로만 둔다.

function BlankField({
  spec,
  markerKey,
  value,
  onChange,
  disabled,
}: {
  spec: FillBlank | undefined
  markerKey: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const n = countLetters(value)
  const s = countSentences(value)
  const overChars = spec?.maxChars != null && n > spec.maxChars
  const overSent = spec?.maxSentences != null && s > spec.maxSentences
  const bad = value.trim().length > 0 && (overChars || overSent)

  return (
    <div
      className="space-y-1 p-3"
      style={{
        background: 'var(--panel)',
        border: `1px solid ${bad ? 'var(--mark)' : 'var(--rule)'}`,
        borderRadius: 4,
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono" style={{ color: 'var(--ink-soft)' }}>
          {markerKey}
        </span>
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          {spec?.label ?? ''}
          {spec?.optional ? ' (선택)' : ''}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        placeholder="한두 문장으로"
        className="w-full"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          lineHeight: 1.7,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          color: 'var(--ink)',
        }}
      />
      <div
        className="text-right font-mono text-sm"
        style={{ color: bad ? 'var(--mark)' : 'var(--ink-soft)' }}
      >
        {s}문장 · {n}
        {spec?.maxChars != null ? ` / ${spec.maxChars}` : ''}자
      </div>
    </div>
  )
}

export default function FillBody({
  passage,
  blanks,
  values,
  onChange,
  disabled,
}: {
  passage: string
  blanks: FillBlank[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const { head, body } = useMemo(() => fillPassageParts(passage), [passage])
  const specByKey = useMemo(
    () => new Map(blanks.map((b) => [b.key, b])),
    [blanks]
  )

  return (
    <div className="space-y-4">
      {head.length > 0 && (
        <div
          className="space-y-1 p-3 text-sm"
          style={{ background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 4 }}
        >
          {head.map((line, i) => {
            const m = line.match(/^\[([^\]]+)\]\s*(.*)$/)
            return (
              <p key={i} style={{ color: 'var(--ink-soft)' }}>
                <span className="font-mono" style={{ color: 'var(--ink)' }}>
                  [{m ? m[1] : ''}]
                </span>{' '}
                {m ? m[2] : line}
              </p>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {body.map((seg, i) =>
          seg.kind === 'line' ? (
            <p
              key={i}
              className="leading-relaxed"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {seg.text}
            </p>
          ) : (
            <BlankField
              key={i}
              spec={specByKey.get(seg.key)}
              markerKey={seg.key}
              value={values[seg.key] ?? ''}
              onChange={(v) => onChange(seg.key, v)}
              disabled={disabled}
            />
          )
        )}
      </div>
    </div>
  )
}
