const axios = require('axios');
const config = require('../config');

function createClient(accessToken) {
  const token = accessToken || config.githubAccessToken;
  return axios.create({
    baseURL: config.domainName,
    headers: token
      ? { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
      : { Accept: 'application/vnd.github.v3+json' },
    timeout: 30000,
  });
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
  const res = await client.get(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
    params: { per_page: 100 },
  });
  return res.data.jobs || [];
}

module.exports = {
  listWorkflows,
  listWorkflowRuns,
  getWorkflowRun,
  listRunJobs,
};
