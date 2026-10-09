import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { getProcessState, subscribeProcess } from '@/lib/processStore'

export function ProcessOverlay() {
  const [state, setState] = useState(getProcessState)

  useEffect(() => subscribeProcess(() => setState(getProcessState())), [])

  useEffect(() => {
    if (!state.active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [state.active])

  if (!state.active) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex cursor-wait items-center justify-center bg-slate-950/35 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-white/20 bg-white px-5 py-4 shadow-2xl">
        <Spinner className="h-5 w-5" />
        <div>
          <p className="text-sm font-semibold text-slate-900">{state.label}</p>
          <p className="text-xs text-slate-500">Please wait…</p>
        </div>
      </div>
    </div>
  )
}
