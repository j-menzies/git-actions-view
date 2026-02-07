const config = require('../config');

function ensureAuthenticated(req, res, next) {
  if (!config.isAuthRequired) {
    return next();
  }
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

function getAccessToken(req) {
  if (req.user?.accessToken) {
    return req.user.accessToken;
  }
  return config.githubAccessToken || null;
}

module.exports = { ensureAuthenticated, getAccessToken };
