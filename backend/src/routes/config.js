const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/api/config', (req, res) => {
  const authMechanisms = [];
  if (config.isOAuth2Enabled) authMechanisms.push('OAUTH2');
  if (config.isBasicAuthEnabled) authMechanisms.push('BASIC_AUTH');

  res.json({
    authMechanisms,
    authRequired: config.isAuthRequired,
    repositories: config.repos.map(r => `${r.owner}/${r.name}`),
  });
});

router.get('/api/me', (req, res) => {
  if (!config.isAuthRequired) {
    return res.json({ login: 'anonymous', name: 'Anonymous', avatarUrl: '' });
  }
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    login: req.user.login,
    name: req.user.name,
    avatarUrl: req.user.avatarUrl,
  });
});

module.exports = router;
