const { getDb } = require('../db/database');
const config = require('../config');

/**
 * Get a single setting value by key.
 * @param {string} key
 * @returns {string|null}
 */
function getSetting(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

/**
 * Set a single setting value (upsert).
 * @param {string} key
 * @param {string} value
 */
function setSetting(key, value) {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `).run({ key, value: String(value) });
}

/**
 * Get all settings as a key-value object.
 * @returns {Object}
 */
function getAllSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

/**
 * Get polling intervals, falling back to config (env var) defaults.
 * @returns {{ discoveryPollSeconds: number, activePollSeconds: number }}
 */
function getPollingIntervals() {
  const dbDiscovery = getSetting('discovery_poll_seconds');
  const dbActive = getSetting('active_poll_seconds');
  return {
    discoveryPollSeconds: dbDiscovery ? parseInt(dbDiscovery, 10) : config.discoveryPollSeconds,
    activePollSeconds: dbActive ? parseInt(dbActive, 10) : config.activePollSeconds,
  };
}

module.exports = { getSetting, setSetting, getAllSettings, getPollingIntervals };
