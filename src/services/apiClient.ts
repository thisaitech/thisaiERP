type ApiErrorPayload = { error?: string; message?: string }

const configuredApiUrl = (
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  ''
).trim()

const isLocalHttpOrHttps = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(configuredApiUrl)
const defaultApiBase =
  typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol}//${window.location.hostname}:8787/api`
    : 'http://localhost:8787/api'

const API_BASE =
  import.meta.env.DEV
    ? configuredApiUrl || defaultApiBase
    : configuredApiUrl && !isLocalHttpOrHttps
      ? configuredApiUrl
      : '/api'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const url = `${API_BASE}${path}`
  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Request failed for ${url}: ${message}`)
  }

  if (!res.ok) {
    // If the token is missing/invalid, force a clean auth state so ProtectedRoute can redirect to /login.
    if (res.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth-changed'))
      } catch {
        // ignore
      }
    }

    let payload: ApiErrorPayload | null = null
    try {
      payload = (await res.json()) as ApiErrorPayload
    } catch {
      // ignore
    }
    const msg = payload?.error || payload?.message || `Request failed (${res.status})`
    throw new Error(`${msg} (${url}, status ${res.status})`)
  }

  // Some endpoints might return empty bodies.
  const text = await res.text()
  if (!text) return undefined as unknown as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON response from ${url}`)
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) })
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}
