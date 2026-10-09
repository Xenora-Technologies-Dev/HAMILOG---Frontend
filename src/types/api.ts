export type HealthStatus = {
  status: 'ok' | 'degraded'
  timestamp: string
  timezone: string
  uptimeSeconds: number
  server: {
    ok: boolean
    status: 'up' | 'down'
    message: string
  }
  database: {
    ok: boolean
    status: 'up' | 'down'
    message: string
  }
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
  requestId?: string
}
