function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffMs = end - start;
  if (diffMs < 0) return null;

  const seconds = Math.floor(diffMs / 1000) % 60;
  const minutes = Math.floor(diffMs / 60000) % 60;
  const hours = Math.floor(diffMs / 3600000);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function detectRunnerOs(labels) {
  if (!labels || labels.length === 0) return 'linux';
  const lower = labels.map(l => l.toLowerCase());
  if (lower.includes('self-hosted')) return 'self-hosted';
  if (lower.some(l => l.startsWith('macos') || l.includes('macos'))) return 'macos';
  if (lower.some(l => l.startsWith('windows') || l.includes('windows'))) return 'windows';
  return 'linux';
}

function calculateBillableMinutes(startIso, endIso, labelsJson) {
  if (!startIso || !endIso) return null;
  const diffMs = new Date(endIso) - new Date(startIso);
  if (diffMs < 0) return null;

  const labels = labelsJson ? JSON.parse(labelsJson) : [];
  const os = detectRunnerOs(labels);

  // GitHub rounds each job up to the nearest minute for billing
  const rawMinutes = Math.ceil(diffMs / 60000);

  const multipliers = { linux: 1, windows: 2, macos: 10, 'self-hosted': 0 };
  return { minutes: rawMinutes * (multipliers[os] ?? 1), os };
}

module.exports = { formatDuration, detectRunnerOs, calculateBillableMinutes };
