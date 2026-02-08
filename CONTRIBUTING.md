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
      db/             # SQLite setup and migrations
      routes/         # Express route handlers
      services/       # GitHub API client, sync service, dispatcher
      utils/          # Helper functions (duration formatting)
      config.js       # Environment variable parsing
      index.js        # Express app entry point
    tests/            # Jest test files
    scripts/          # Utility scripts (mock data seeder)
  frontend/
    src/
      components/     # Vue single-file components
      plugins/        # Vuetify configuration
      router/         # Vue Router setup with auth guard
      services/       # API client (fetch wrapper)
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

## Reporting issues

Please open a GitHub issue with:

1. A clear description of the problem
2. Steps to reproduce
3. Expected vs actual behaviour
4. Environment details (OS, Node.js version, Docker version if applicable)

## Architectural decisions

### Why SQLite?

SQLite provides a zero-dependency embedded database that works well for single-instance deployments. WAL mode ensures concurrent reads during writes, and the synchronous `better-sqlite3` driver avoids callback complexity.

### Why polling instead of webhooks?

GitHub Actions does not provide a real-time push API (no WebSocket or SSE). Webhooks are possible but require a publicly reachable URL, which complicates self-hosted setups behind NAT or firewalls. Polling with a two-tier strategy (infrequent discovery + frequent active run checks) provides a good balance of freshness and API quota usage.

### Why hash-based routing?

Hash-based routing (`/#/runs`) works reliably when serving the SPA from a static file server without special server-side rewrite rules. This simplifies the Docker and Express setup.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
