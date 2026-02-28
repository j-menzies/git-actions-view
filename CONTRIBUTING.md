# Contributing to GitActionsView

Thank you for considering contributing to GitActionsView! This guide will help you get up and running.

## Development setup

### Prerequisites

- **Node.js** 20.x or 22.x (see `frontend/package.json` engines field)
- **npm** 10+
- **Docker** and **Docker Compose** (optional, for containerised builds)

### Clone and install

```bash
git clone https://github.com/your-org/gitactionsview.git
cd gitactionsview

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### Running locally

Start the backend:

```bash
cd backend
GITHUB_REPOS=owner/repo GITHUB_ACCESS_TOKEN=ghp_xxx node src/index.js
```

In a separate terminal, start the Vite dev server:

```bash
cd frontend
npm run dev
```

The frontend dev server at `http://localhost:5173` proxies API calls to the backend at `http://localhost:9000`.

### Running with Docker

```bash
docker compose up --build
```

Visit `http://localhost:9000`.

## Project structure

```
gitactionsview/
  backend/
    src/
      auth/           # Passport.js strategies, middleware
      db/             # SQLite setup and migrations (settings, repos tables)
      routes/         # Express route handlers (runs, jobs, settings, repos, admin, webhooks)
      services/       # GitHub API, sync, dispatcher, webhook handler, settings, repos services
      utils/          # Helper functions (duration formatting)
      config.js       # Environment variable parsing + loadFromDb()
      index.js        # Express app entry point
    tests/            # Jest test files
    scripts/          # Utility scripts (mock data seeder)
  frontend/
    src/
      components/     # Vue SFCs (RunCard, RunLog, SettingsPage, AppBar, etc.)
      plugins/        # Vuetify configuration (theme persistence)
      router/         # Vue Router setup with auth guard
      services/       # API client (runs, jobs, settings, repos, admin)
      __tests__/      # Vitest test files
      App.vue         # Root component
      main.js         # Vue app bootstrap
  Dockerfile          # Multi-stage build
  docker-compose.yml
```

## Running tests

### Backend

```bash
cd backend
npm test              # Jest with coverage report
npm run test:watch    # Watch mode
```

Target: **>60% statement coverage** (currently >90%).

### Frontend

```bash
cd frontend
npm test              # Vitest
npm run test:watch    # Watch mode
```

## Code style

- **Backend**: CommonJS modules, 2-space indentation
- **Frontend**: ES modules, Vue 3 Composition API with `<script setup>`, 2-space indentation
- Keep functions small and focused
- Use descriptive variable names
- Add JSDoc comments for public functions

## Making changes

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/my-change
   ```

2. **Make your changes** and add tests where appropriate.

3. **Run the test suite** to ensure nothing is broken:
   ```bash
   cd backend && npm test && cd ../frontend && npm test
   ```

4. **Commit** with a clear, descriptive message:
   ```bash
   git commit -m "Add filter by date range to runs API"
   ```

5. **Push** and open a pull request against `main`.

## Pull request checklist

- [ ] Tests pass (`npm test` in both backend and frontend)
- [ ] New features have accompanying tests
- [ ] Code follows the existing style
- [ ] PR description explains _what_ changed and _why_
- [ ] Breaking changes are clearly documented

## Releasing

GitActionsView uses semantic versioning with git tags. When you're ready to publish a new release:

1. **Ensure `main` is up to date** and all tests pass.

2. **Tag the release** on `main`:
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

3. The CI pipeline will automatically:
   - Run backend and frontend tests
   - Build the Docker image
   - Push to GitHub Container Registry (`ghcr.io/j-menzies/git-actions-view`)
   - Tag the image with `1.2.0`, `1.2`, `1`, and `latest`

### Versioning guidelines

- **Patch** (`v1.0.1`): Bug fixes, dependency updates
- **Minor** (`v1.1.0`): New features, backwards-compatible changes
- **Major** (`v2.0.0`): Breaking changes (config format, API, database schema)

## Reporting issues

Please open a GitHub issue with:

1. A clear description of the problem
2. Steps to reproduce
3. Expected vs actual behaviour
4. Environment details (OS, Node.js version, Docker version if applicable)

## Architectural decisions

### Why SQLite?

SQLite provides a zero-dependency embedded database that works well for single-instance deployments. WAL mode ensures concurrent reads during writes, and the synchronous `better-sqlite3` driver avoids callback complexity.

### Why polling by default, with optional webhooks?

Polling is the default because it works in any environment — no public URL required. Webhooks are supported as an optional enhancement via `GITHUB_WEBHOOK_SECRET`. When enabled, `workflow_run` and `workflow_job` events push real-time updates, and polling intervals automatically increase to serve as a reconciliation fallback. For environments behind NAT or firewalls, [smee.io](https://smee.io/) can proxy webhook events to the container (set `SMEE_URL`). ETag conditional requests further reduce API consumption — unchanged data returns `304 Not Modified` at zero rate limit cost.

### Why hash-based routing?

Hash-based routing (`/#/runs`) works reliably when serving the SPA from a static file server without special server-side rewrite rules. This simplifies the Docker and Express setup.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
