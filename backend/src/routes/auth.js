const express = require('express');
const passport = require('passport');
const config = require('../config');
const { validateBasicAuth } = require('../auth/basicAuth');

const router = express.Router();

// GitHub OAuth2
if (config.isOAuth2Enabled) {
  router.get('/auth/github', passport.authenticate('github', { scope: ['read:user', 'repo'] }));

  router.get(
    '/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/#/login' }),
    (req, res) => {
      res.redirect('/#/runs');
    }
  );
}

// Basic Auth
if (config.isBasicAuthEnabled) {
  router.post('/auth/basic', express.json(), (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!validateBasicAuth(username, password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.login(
      {
        login: username,
        name: username,
        avatarUrl: '',
        accessToken: config.githubAccessToken,
      },
      (err) => {
        if (err) return res.status(500).json({ error: 'Login failed' });
        res.json({ success: true });
      }
    );
  });
}

// Logout
router.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('Logout error:', err);
    req.session?.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

module.exports = router;
