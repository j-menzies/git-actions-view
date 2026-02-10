# GitActionsView

A self-hosted web dashboard that displays a chronological log of GitHub Actions workflow runs across multiple repositories. Monitor CI/CD pipelines in real time with an infinite-scroll timeline, drill into individual jobs, and filter by repository, status, or branch.

## Features

- **Chronological run log** with infinite scroll and cursor-based pagination
- **Multi-repository support** across multiple GitHub organisations
- **Real-time updates** via smart two-tier polling (discovery + active run tracking)
- **Drill-down into jobs** by expanding any run card to see individual job statuses
- **Flexible filtering** by repository, status (success/failure/in_progress/cancelled), and branch
- **GitHub OAuth2 login** for private repositories (same flow as [gitactionboard](https://github.com/otto-de/gitactionboard))
- **Basic auth** option via htpasswd file
- **Light and dark themes** matching GitHub's colour palette, persisted across sessions
- **Clickable links** — repo names, branches, PR events, and actor avatars link directly to GitHub
- **Settings page** for managing polling intervals, repositories (add/hide/remove), and database cache rebuilds
- **Docker-ready** single-container deployment with multi-stage build

## Architecture

| Layer     | Technology                              |
|-----------|------------------------------------------|
| Frontend  | Vue 3, Vuetify 3, Vite, vue-router 4    |
| Backend   | Node.js, Express 4, Passport.js         |
| Database  | SQLite (better-sqlite3, WAL mode)        |
| Container | Docker (node:22-alpine, multi-stage)     |

### Polling strategy

GitActionsView uses a two-tier polling approach to balance freshness with API quota:

1. **Discovery poll** (default 60 s) fetches the latest 30 runs for each configured repository and upserts workflows, runs, and jobs into SQLite.
2. **Active run poll** (default 10 s) re-checks only in-flight runs (queued, in_progress, waiting) until they complete.

## Container images

Pre-built Docker images are published to GitHub Container Registry on every release.

```bash
docker pull ghcr.io/j-menzies/git-actions-view:latest
```

| Tag | Description |
|-----|-------------|
| `latest` | Most recent release |
| `1.2.3` | Specific version |
| `1.2` | Latest patch in a minor series |
| `1` | Latest minor/patch in a major series |

## Quick start

### Docker Compose (recommended)

```bash
# 1. Clone the repository (for the docker-compose.yml and .env.example)
git clone https://github.com/j-menzies/git-actions-view.git
cd git-actions-view

# 2. Copy and edit the env file
cp .env.example .env
# At minimum, set GITHUB_REPOS and either GITHUB_ACCESS_TOKEN or OAuth credentials

# 3. Pull and run
docker compose up -d

# 4. Visit http://localhost:9000
```

### Local development

```bash
# Backend
cd backend
npm install
GITHUB_REPOS=owner/repo GITHUB_ACCESS_TOKEN=ghp_xxx node src/index.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/auth` requests to the backend on port 9000.

## Configuration

Initial configuration is set via environment variables. Polling intervals and repository lists can also be changed at runtime through the **Settings** page (`/#/settings`), with values stored in SQLite so they survive container restarts. Environment variables serve as initial defaults.

| Variable | Description | Default |
|---|---|---|
| `GITHUB_REPOS` | Comma-separated list of `owner/repo` pairs | _(required)_ |
| `GITHUB_ACCESS_TOKEN` | Personal access token for background sync | `""` |
| `GITHUB_OAUTH2_CLIENT_ID` | GitHub OAuth App client ID | `""` |
| `GITHUB_OAUTH2_CLIENT_SECRET` | GitHub OAuth App client secret | `""` |
| `DOMAIN_NAME` | GitHub API base URL (for GHE) | `https://api.github.com` |
| `BASIC_AUTH_USER_DETAILS_FILE_PATH` | Path to htpasswd file for basic auth | `""` |
| `SESSION_SECRET` | Express session secret | `change-me-in-production` |
| `DISCOVERY_POLL_SECONDS` | Seconds between full discovery syncs | `60` |
| `ACTIVE_POLL_SECONDS` | Seconds between active run polls | `10` |
| `PORT` | HTTP listen port | `9000` |
| `DB_PATH` | Path to SQLite database file | `./data/gitactionsview.db` |

### Legacy single-owner format

For backwards compatibility you can also use:

```env
REPO_OWNER_NAME=acme-corp
REPO_NAMES=web-app,api-service
```

This is equivalent to `GITHUB_REPOS=acme-corp/web-app,acme-corp/api-service`.

## Authentication

### Public token mode

Set `GITHUB_ACCESS_TOKEN` to a personal access token with `repo` scope. All visitors can view runs without logging in.

### GitHub OAuth2

1. Create a GitHub OAuth App at **Settings > Developer settings > OAuth Apps**.
2. Set the **Authorization callback URL** to `http://your-host:9000/auth/github/callback`.
3. Set `GITHUB_OAUTH2_CLIENT_ID` and `GITHUB_OAUTH2_CLIENT_SECRET`.

Users will see a "Sign in with GitHub" button and authenticate via the standard OAuth2 flow. Their personal token is used for API calls while logged in.

### Basic auth

1. Create an htpasswd file: `htpasswd -Bc ./htpasswd myuser`
2. Set `BASIC_AUTH_USER_DETAILS_FILE_PATH=./htpasswd`

Both OAuth2 and basic auth can be enabled simultaneously.

## API

| Endpoint | Description |
|---|---|
| `GET /api/config` | Auth mechanisms, configured repositories |
| `GET /api/me` | Current user info |
| `GET /api/v1/runs` | Paginated runs (supports `limit`, `before`, `repo`, `status`, `branch`, `from`, `to`) |
| `GET /api/v1/runs/:id/jobs` | Jobs for a specific run |
| `GET /api/v1/settings` | Current polling interval settings |
| `PUT /api/v1/settings` | Update polling intervals (restarts dispatcher) |
| `GET /api/v1/repos` | List all repositories (including hidden) |
| `POST /api/v1/repos` | Add a repository and trigger immediate sync |
| `PUT /api/v1/repos/:id` | Update a repository (toggle visibility) |
| `DELETE /api/v1/repos/:id` | Delete a repository and its cached data |
| `POST /api/v1/admin/db/rebuild` | Wipe all cached data and re-sync from GitHub |

## Testing

### Backend (Jest)

```bash
cd backend
npm test            # run all tests with coverage
npm run test:watch  # watch mode
```

### Frontend (Vitest)

```bash
cd frontend
npm test            # run all tests
npm run test:watch  # watch mode
```

## Mock data for demos

To seed the database with realistic sample data (useful for screenshots and demos):

```bash
node backend/scripts/seed-mock-data.js
```

## Acknowledgements

GitActionsView is inspired by **[gitactionboard](https://github.com/otto-de/gitactionboard)** by Otto GmbH, which provides a similar dashboard using Java/Spring Boot. This project reimplements the concept with a Node.js backend, a chronological log-style UI, and drill-down into individual jobs.

## License

[MIT](LICENSE)
