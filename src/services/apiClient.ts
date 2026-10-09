import { API_BASE_URL } from '@/lib/config'
import { beginProcess, processLabelFor } from '@/lib/processStore'
import type { ApiErrorBody } from '@/types/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly requestId?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.error.code
    this.details = body.error.details
    this.requestId = body.requestId
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = {
      error: {
        code: 'UNKNOWN_ERROR',
        message: `Request failed with status ${response.status}`,
      },
    }
  }
  return new ApiError(response.status, body)
}

async function withProcess<T>(path: string, kind: 'mutate' | 'download', run: () => Promise<T>) {
  const stop = beginProcess(processLabelFor(path, kind))
  try {
    return await run()
  } finally {
    stop()
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  return (await response.json()) as T
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return withProcess(path, 'mutate', async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (!response.ok) {
      throw await parseError(response)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  })
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return withProcess(path, 'mutate', async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (!response.ok) {
      throw await parseError(response)
    }

    return (await response.json()) as T
  })
}

export async function apiDelete<T>(path: string): Promise<T> {
  return withProcess(path, 'mutate', async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })

    if (!response.ok) {
      throw await parseError(response)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  })
}

/** Multipart upload — do not set Content-Type (browser sets boundary). */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return withProcess(path, 'mutate', async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      throw await parseError(response)
    }

    return (await response.json()) as T
  })
}

export async function apiDownload(path: string): Promise<Blob> {
  return withProcess(path, 'download', async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw await parseError(response)
    }

    return response.blob()
  })
}
