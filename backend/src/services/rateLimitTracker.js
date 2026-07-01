const SAFETY_THRESHOLD = 100;

let remaining = null;
let limit = null;
let resetAt = null;
let isPaused = false;
let resumeTimer = null;

function update(headers) {
  if (!headers) return;

  const rem = headers['x-ratelimit-remaining'];
  const lim = headers['x-ratelimit-limit'];
  const reset = headers['x-ratelimit-reset'];

  if (rem !== undefined) remaining = parseInt(rem, 10);
  if (lim !== undefined) limit = parseInt(lim, 10);
  if (reset !== undefined) resetAt = parseInt(reset, 10);

  if (remaining !== null && remaining < SAFETY_THRESHOLD && !isPaused) {
    isPaused = true;
    const resetDate = resetAt ? new Date(resetAt * 1000).toISOString() : 'unknown';
    console.warn(`GitHub API rate limit low (${remaining}/${limit}). Pausing sync until ${resetDate}`);

    if (resumeTimer) clearTimeout(resumeTimer);
    if (resetAt) {
      const delayMs = Math.max(0, resetAt * 1000 - Date.now() + 5000);
      resumeTimer = setTimeout(resume, delayMs);
    }
  }
}

function resume() {
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
  isPaused = false;
  remaining = null;
  console.log('GitHub API rate limit window reset. Resuming sync.');
}

function shouldPause() {
  return isPaused;
}

function getStatus() {
  return { remaining, limit, resetAt, isPaused };
}

function _reset() {
  remaining = null;
  limit = null;
  resetAt = null;
  isPaused = false;
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
}

module.exports = { update, resume, shouldPause, getStatus, _reset };
