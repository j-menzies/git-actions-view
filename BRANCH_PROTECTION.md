# Branch Protection Setup

This document explains how to configure GitHub branch protection rules to prevent unauthorised changes to the `main` branch.

## Recommended configuration

Navigate to **Settings > Branches > Branch protection rules > Add rule** in your GitHub repository.

### Branch name pattern

```
main
```

### Suggested settings

| Setting | Value | Reason |
|---|---|---|
| **Require a pull request before merging** | Enabled | Prevents direct pushes to `main` |
| Require approvals | 1 (minimum) | Ensures at least one reviewer signs off |
| Dismiss stale pull request approvals when new commits are pushed | Enabled | Forces re-review after changes |
| **Require status checks to pass before merging** | Enabled | Blocks merges when CI fails |
| Require branches to be up to date before merging | Enabled | Prevents merge skew |
| Status checks that are required | `test` (or your CI job name) | Ensures tests pass |
| **Require conversation resolution before merging** | Enabled | Ensures review comments are addressed |
| **Do not allow bypassing the above settings** | Enabled | Applies rules to admins too |
| **Restrict who can push to matching branches** | Optional | Limit push access to specific teams |
| **Allow force pushes** | Disabled | Prevents history rewriting |
| **Allow deletions** | Disabled | Prevents branch deletion |

## Setting up with GitHub CLI

You can also configure branch protection using the GitHub CLI:

```bash
# Enable branch protection with required reviews and status checks
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

## GitHub Actions CI workflow

To use these protections effectively, create a CI workflow that runs on pull requests:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: cd backend && npm ci && npm test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: cd frontend && npm ci && npm test

  build-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t gitactionsview .
```

Reference this workflow's job names (e.g., `test-backend`, `test-frontend`) in the required status checks.

## Rulesets (GitHub Enterprise / newer repos)

If your repository supports **Rulesets** (Settings > Rules > Rulesets), these offer more granular control:

1. Create a new ruleset targeting the `main` branch
2. Add rules:
   - **Restrict deletions**
   - **Require a pull request before merging** (min 1 approval)
   - **Require status checks to pass** (add your CI job names)
   - **Block force pushes**
   - **Require signed commits** (optional, for extra security)
3. Set enforcement to **Active**
4. Apply to all repository roles (including administrators)

## CODEOWNERS

For additional review control, create a `CODEOWNERS` file:

```
# .github/CODEOWNERS

# Default owners for everything
*       @your-org/core-team

# Backend changes need backend review
/backend/   @your-org/backend-team

# Frontend changes need frontend review
/frontend/  @your-org/frontend-team
```

When combined with "Require review from Code Owners", this ensures the right people review changes to their areas.

## Summary

At minimum, enable these three protections on `main`:

1. **Require pull request** with at least 1 approval
2. **Require status checks** (CI must pass)
3. **Disable force pushes** and branch deletion
