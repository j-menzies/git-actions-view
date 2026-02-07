const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('../config');

let users = null;

function loadUsers() {
  if (users !== null) return users;
  if (!config.basicAuthFilePath) {
    users = {};
    return users;
  }

  try {
    const content = fs.readFileSync(config.basicAuthFilePath, 'utf-8');
    users = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      const username = trimmed.substring(0, colonIdx);
      const hash = trimmed.substring(colonIdx + 1);
      users[username] = hash;
    }
    console.log(`Loaded ${Object.keys(users).length} basic auth user(s)`);
  } catch (err) {
    console.error(`Failed to load basic auth file: ${err.message}`);
    users = {};
  }
  return users;
}

function validateBasicAuth(username, password) {
  const userMap = loadUsers();
  const hash = userMap[username];
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

module.exports = { validateBasicAuth };
