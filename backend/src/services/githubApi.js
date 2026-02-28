const axios = require('axios');
const config = require('../config');
const rateLimitTracker = require('./rateLimitTracker');

// ETag cache: full URL (with params) -> { etag, data }
const etagCache = new Map();

function buildCacheKey(reqConfig) {
  let url = (reqConfig.baseURL || '') + (reqConfig.url || '');
  if (reqConfig.params && Object.keys(reqConfig.params).length > 0) {
    url += '?' + new URLSearchParams(reqConfig.params).toString();
  }
  return url;
}

function createClient(accessToken) {
  const token = accessToken || config.githubAccessToken;
  const client = axios.create({
    baseURL: config.domainName,
    headers: token
      ? { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
      : { Accept: 'application/vnd.github.v3+json' },
    timeout: 30000,
  });

  // Request interceptor: attach If-None-Match when we have a cached ETag
  client.interceptors.request.use((reqConfig) => {
    const cacheKey = buildCacheKey(reqConfig);
    const cached = etagCache.get(cacheKey);
    if (cached?.etag) {
      reqConfig.headers['If-None-Match'] = cached.etag;
    }
    reqConfig._etagCacheKey = cacheKey;
    return reqConfig;
  });

  client.interceptors.response.use(
    (response) => {
      rateLimitTracker.update(response.headers);
      // Cache ETag + response data for future conditional requests
      const etag = response.headers['etag'];
      if (etag && response.config._etagCacheKey) {
        etagCache.set(response.config._etagCacheKey, { etag, data: response.data });
      }
      return response;
    },
    (error) => {
      // Handle 304 Not Modified — return cached data (no rate limit cost)
      if (error.response?.status === 304) {
        const cacheKey = error.config?._etagCacheKey;
        const cached = cacheKey && etagCache.get(cacheKey);
        if (cached) {
          return { data: cached.data, status: 304, headers: error.response.headers };
        }
      }
      if (error.response?.headers) {
        rateLimitTracker.update(error.response.headers);
      }
      if (error.response?.status === 403 &&
          error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetAt = error.response.headers['x-ratelimit-reset'];
        const resetDate = new Date(parseInt(resetAt, 10) * 1000);
        const err = new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`);
        err.isRateLimit = true;
        throw err;
      }
      throw error;
    }
  );

  return client;
}

function _resetEtagCache() {
  etagCache.clear();
}

async function listWorkflows(owner, repo, accessToken) {
  const client = createClient(accessToken);
  const res = await client.get(`/repos/${owner}/${repo}/actions/workflows`);
  return res.data.workflows || [];
}

async function listWorkflowRuns(owner, repo, params = {}, accessToken) {
  const client = createClient(accessToken);
  const res = await client.get(`/repos/${owner}/${repo}/actions/runs`, {
    params: { per_page: 30, ...params },
  });
  return res.data;
}

async function getWorkflowRun(owner, repo, runId, accessToken) {
  const client = createClient(accessToken);
  const res = await client.get(`/repos/${owner}/${repo}/actions/runs/${runId}`);
  return res.data;
}

async function listRunJobs(owner, repo, runId, accessToken) {
  const client = createClient(accessToken);
  const jobs = [];
  let page = 1;

  while (true) {
    const res = await client.get(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
      params: { per_page: 100, filter: 'latest', page },
    });
    const data = res.data.jobs || [];
    if (data.length === 0) break;
    jobs.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return jobs;
}

async function listUserRepos(accessToken) {
  const client = createClient(accessToken);
  const repos = [];
  let page = 1;

  while (true) {
    const res = await client.get('/user/repos', {
      params: { per_page: 100, sort: 'updated', direction: 'desc', page },
    });
    const data = res.data;
    if (!Array.isArray(data) || data.length === 0) break;

    for (const repo of data) {
      repos.push({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return repos;
}

module.exports = {
  listWorkflows,
  listWorkflowRuns,
  getWorkflowRun,
  listRunJobs,
  listUserRepos,
  _resetEtagCache,
};
