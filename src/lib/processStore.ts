type ProcessListener = () => void

const SHOW_DELAY_MS = 160

let pending = 0
let visible = false
let label = 'Working…'
let showTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<ProcessListener>()

function emit() {
  for (const listener of listeners) listener()
}

export function getProcessState() {
  return { active: visible && pending > 0, label }
}

export function subscribeProcess(listener: ProcessListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function beginProcess(nextLabel = 'Working…') {
  pending += 1
  label = nextLabel
  if (visible) {
    emit()
  } else if (pending === 1 && !showTimer) {
    showTimer = setTimeout(() => {
      showTimer = null
      if (pending > 0) {
        visible = true
        emit()
      }
    }, SHOW_DELAY_MS)
  }
  return () => {
    pending = Math.max(0, pending - 1)
    if (pending === 0) {
      if (showTimer) {
        clearTimeout(showTimer)
        showTimer = null
      }
      visible = false
      emit()
    }
  }
}

export function processLabelFor(path: string, kind: 'mutate' | 'download' = 'mutate') {
  const route = path.split('?')[0] ?? path

  if (kind === 'download' || route.includes('/export')) return 'Exporting…'
  if (route.includes('/auth/login')) return 'Signing in…'
  if (route.includes('/auth/logout')) return 'Signing out…'
  if (route.includes('/customers')) return 'Saving customer…'
  if (route.includes('/enquiries')) return 'Saving enquiry…'
  if (route.includes('/reminders')) return 'Saving reminder…'
  if (route.includes('/staff')) return 'Saving staff…'
  if (route.includes('/notifications')) return 'Updating notifications…'
  if (route.includes('/whatsapp')) return 'Working…'
  return 'Working…'
}
