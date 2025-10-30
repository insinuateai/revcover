'use client'

import { useState } from 'react'

export default function BrainReportButton({ orgId, userId }: { orgId: string; userId: string }) {
  const [loading, setLoading] = useState(false)
  const [actions, setActions] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runReflect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, userId, horizonDays: 7 })
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Unknown error')
      setActions(json.report?.next_actions ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={runReflect}
        className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Reflecting…' : 'Generate Brain Report'}
      </button>

      {error && <p className="text-red-600 text-sm">Error: {error}</p>}

      {actions && actions.length > 0 && (
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold mb-2">Next Actions</h3>
          <ol className="list-decimal pl-5 space-y-1">
            {actions.slice(0, 3).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
