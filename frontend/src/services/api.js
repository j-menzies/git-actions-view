const BASE = ''

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    credentials: 'include',
    ...options,
  })
  if (res.status === 401) {
    window.location.hash = '#/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

export function fetchConfig() {
  return request('/api/config')
}

export function fetchMe() {
  return request('/api/me')
}

export function fetchRuns({ limit, before, repo, status, branch, from, to } = {}) {
  const params = new URLSearchParams()
  if (limit) params.set('limit', limit)
  if (before) params.set('before', before)
  if (repo) params.set('repo', repo)
  if (status) params.set('status', status)
  if (branch) params.set('branch', branch)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return request(`/api/v1/runs${qs ? '?' + qs : ''}`)
}

export function fetchJobs(runId) {
  return request(`/api/v1/runs/${runId}/jobs`)
}

export async function loginBasic(username, password) {
  const res = await fetch(BASE + '/auth/basic', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Login failed')
  }
  return res.json()
}

export async function logout() {
  await fetch(BASE + '/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}
