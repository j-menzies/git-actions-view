const config = {
  port: parseInt(process.env.PORT || '9000', 10),
  domainName: process.env.DOMAIN_NAME || 'https://api.github.com',
  githubAccessToken: process.env.GITHUB_ACCESS_TOKEN || '',
  githubOAuth2ClientId: process.env.GITHUB_OAUTH2_CLIENT_ID || '',
  githubOAuth2ClientSecret: process.env.GITHUB_OAUTH2_CLIENT_SECRET || '',
  basicAuthFilePath: process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH || '',
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  discoveryPollSeconds: parseInt(process.env.DISCOVERY_POLL_SECONDS || '60', 10),
  activePollSeconds: parseInt(process.env.ACTIVE_POLL_SECONDS || '10', 10),
  dbPath: process.env.DB_PATH || './data/gitactionsview.db',

  get isOAuth2Enabled() {
    return !!this.githubOAuth2ClientId && !!this.githubOAuth2ClientSecret;
  },

  get isBasicAuthEnabled() {
    return !!this.basicAuthFilePath;
  },

  get isAuthRequired() {
    return this.isOAuth2Enabled || this.isBasicAuthEnabled;
  },

  get repos() {
    const githubRepos = process.env.GITHUB_REPOS || '';
    if (githubRepos) {
      return githubRepos.split(',').map(r => r.trim()).filter(Boolean).map(r => {
        const [owner, name] = r.split('/');
        if (!owner || !name) {
          throw new Error(`Invalid GITHUB_REPOS format: "${r}". Expected "owner/repo".`);
        }
        return { owner, name };
      });
    }

    const ownerName = process.env.REPO_OWNER_NAME || '';
    const repoNames = process.env.REPO_NAMES || '';
    if (ownerName && repoNames) {
      return repoNames.split(',').map(r => r.trim()).filter(Boolean).map(name => ({
        owner: ownerName,
        name,
      }));
    }

    return [];
  },

  /**
   * Override polling intervals from database settings.
   * Call after DB is initialized. Silently uses env var defaults if no DB values.
   */
  loadFromDb() {
    try {
      const { getDb } = require('./db/database');
      const db = getDb();
      const rows = db.prepare('SELECT key, value FROM settings').all();
      for (const row of rows) {
        if (row.key === 'discovery_poll_seconds') {
          this.discoveryPollSeconds = parseInt(row.value, 10) || this.discoveryPollSeconds;
        }
        if (row.key === 'active_poll_seconds') {
          this.activePollSeconds = parseInt(row.value, 10) || this.activePollSeconds;
        }
      }
    } catch (e) {
      // DB not ready yet or settings table doesn't exist — use env defaults
    }
  },
};

module.exports = config;
