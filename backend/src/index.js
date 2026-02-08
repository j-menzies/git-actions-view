const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const { getDb, closeDb } = require('./db/database');
const { setupPassport } = require('./auth/passport');
const syncDispatcher = require('./services/syncDispatcher');

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 60 * 60 * 1000, // 7 hours
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true',
    },
  })
);

// Auth
setupPassport(app);

// Routes
app.use(require('./routes/auth'));
app.use(require('./routes/config'));
app.use(require('./routes/runs'));
app.use(require('./routes/jobs'));
app.use(require('./routes/settings'));
app.use(require('./routes/repos'));
app.use(require('./routes/admin'));

// Serve frontend static files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Initialize database
getDb();

// Seed repos from env config and load DB settings
const reposService = require('./services/reposService');
reposService.syncReposFromConfig();
config.loadFromDb();

// Start sync dispatcher
syncDispatcher.start();

// Start server
const server = app.listen(config.port, () => {
  const repos = reposService.getVisibleRepos();
  console.log(`GitActionsView listening on port ${config.port}`);
  console.log(`Monitoring ${repos.length} repository(ies)`);
  if (config.isOAuth2Enabled) console.log('GitHub OAuth2 enabled');
  if (config.isBasicAuthEnabled) console.log('Basic Auth enabled');
  if (!config.isAuthRequired) console.log('No authentication configured — all endpoints public');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  syncDispatcher.stop();
  closeDb();
  server.close();
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  syncDispatcher.stop();
  closeDb();
  server.close();
});
