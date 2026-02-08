import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to mock fetch before importing the module
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock window.location
const originalLocation = window.location
delete window.location
window.location = { hash: '' }

import { fetchConfig, fetchMe, fetchRuns, fetchJobs, loginBasic, logout } from '@/services/api'

describe('api service', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    window.location.hash = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchConfig', () => {
    it('fetches /api/config with credentials', async () => {
      const mockData = { authMechanisms: ['OAUTH2'], authRequired: true, repositories: ['org/repo'] }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await fetchConfig()
      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith('/api/config', { credentials: 'include' })
    })
  })

  describe('fetchMe', () => {
    it('fetches /api/me', async () => {
      const mockData = { login: 'dev', name: 'Developer', avatarUrl: 'https://avatar.url' }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await fetchMe()
      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith('/api/me', { credentials: 'include' })
    })

    it('redirects to login on 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      })

      await expect(fetchMe()).rejects.toThrow('Unauthorized')
      expect(window.location.hash).toBe('#/login')
    })

    it('throws on non-401 errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(fetchMe()).rejects.toThrow('API error: 500')
    })
  })

  describe('fetchRuns', () => {
    it('fetches runs with no params', async () => {
      const mockData = { runs: [], hasMore: false, nextCursor: null }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await fetchRuns()
      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/runs', { credentials: 'include' })
    })

    it('builds query string with all params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ runs: [] }),
      })

      await fetchRuns({
        limit: 25,
        before: '2026-01-01T00:00:00Z',
        repo: 'org/repo',
        status: 'success',
        branch: 'main',
        from: '2026-01-01',
        to: '2026-01-31',
      })

      const url = mockFetch.mock.calls[0][0]
      expect(url).toContain('limit=25')
      expect(url).toContain('before=')
      expect(url).toContain('repo=org%2Frepo')
      expect(url).toContain('status=success')
      expect(url).toContain('branch=main')
    })

    it('omits falsy params from query string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ runs: [] }),
      })

      await fetchRuns({ limit: 50 })
      const url = mockFetch.mock.calls[0][0]
      expect(url).toContain('limit=50')
      expect(url).not.toContain('before=')
      expect(url).not.toContain('repo=')
    })
  })

  describe('fetchJobs', () => {
    it('fetches jobs for a run', async () => {
      const mockData = { jobs: [{ id: 1, name: 'build' }] }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await fetchJobs(100)
      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/runs/100/jobs', { credentials: 'include' })
    })
  })

  describe('loginBasic', () => {
    it('sends POST with credentials', async () => {
      const mockData = { login: 'user' }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      })

      const result = await loginBasic('user', 'pass')
      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledWith('/auth/basic', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'user', password: 'pass' }),
      })
    })

    it('throws on login failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      })

      await expect(loginBasic('bad', 'creds')).rejects.toThrow('Invalid credentials')
    })

    it('throws default message when no error in response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Parse error')),
      })

      await expect(loginBasic('user', 'pass')).rejects.toThrow('Login failed')
    })
  })

  describe('logout', () => {
    it('sends POST to /auth/logout', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      await logout()
      expect(mockFetch).toHaveBeenCalledWith('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    })
  })
})
