'use client'

import { useState } from 'react'
import type { Check } from '@/lib/scoring/types'

const ICON: Record<Check['status'], string> = {
  pass: '○',
  fail: '×',
  pending: '·',
}

const ICON_COLOR: Record<Check['status'], string> = {
  pass: 'var(--pass)',
  fail: 'var(--mark)',
  pending: 'var(--ink-soft)',
}

export default function CheckRow({ check }: { check: Check }) {
  const [open, setOpen] = useState(false)
  const hasEvidence = !!check.evidence?.length

  return (
    <div style={{ borderBottom: '1px solid var(--rule)' }}>
      <button
        type="button"
        onClick={() => hasEvidence && setOpen((v) => !v)}
        className="flex w-full items-center gap-3 py-2 text-left"
        style={{ cursor: hasEvidence ? 'pointer' : 'default' }}
      >
        <span
          className="font-mono"
          style={{ color: ICON_COLOR[check.status], width: '1em' }}
          aria-hidden
        >
          {ICON[check.status]}
        </span>
        <span className="flex-1">{check.label}</span>
        <span
          className="font-mono text-sm"
          style={{ color: 'var(--ink-soft)' }}
        >
          {check.detail}
        </span>
        {hasEvidence && (
          <span className="font-mono text-sm" style={{ color: 'var(--ink-soft)' }} aria-hidden>
            {open ? '−' : '+'}
          </span>
        )}
      </button>

      {open && hasEvidence && (
        <div className="flex flex-wrap gap-2 pb-3">
          {check.evidence!.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="font-mono text-sm"
              style={{
                border: '1px solid var(--rule)',
                borderRadius: 4,
                padding: '2px 8px',
                color: 'var(--ink)',
              }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
