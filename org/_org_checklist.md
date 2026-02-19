# Org-wide Security & Quality Checklist

Use this checklist when onboarding a new repository.

---

## 1. GitHub Advanced Security

- [ ] **Enable Advanced Security** on the repo (Settings → Security → Code security and analysis).
  - For public repos: free by default.
  - For private repos: requires GitHub Advanced Security license.
- [ ] **Enable Code Scanning** via Default Setup (recommended) or Advanced Setup:
  - **Default Setup**: Settings → Code security → Code scanning → CodeQL analysis → Default → Enable.
  - **Advanced Setup**: Copy `.github/workflows/codeql.yml` from this repo into the target repo.
- [ ] **Enable Copilot Autofix** for Code Scanning (Settings → Code security → Code scanning → Copilot Autofix → Enable).
- [ ] Verify alerts appear in the **Security → Code scanning alerts** tab after first PR or push to main.

## 2. Branch Protection / Required Status Checks

- [ ] Go to **Settings → Branches → Add branch protection rule** for `main`.
- [ ] Enable **Require status checks to pass before merging**.
- [ ] Add these required checks:
  - `code-scanning` (CodeQL results)
  - `build-and-test` (CI tests job name — adjust to match your CI workflow)
- [ ] Enable **Require branches to be up to date before merging** (strict mode).
- [ ] Enable **Enforce for admins** so nobody bypasses.

**GH CLI shortcut** (adjust `<OWNER>/<REPO>` and job names):

```bash
gh api \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/<OWNER>/<REPO>/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=code-scanning' \
  -f 'required_status_checks[contexts][]=build-and-test' \
  -f enforce_admins=true \
  -f restrictions=
```

## 3. Reusable CodeQL Workflow

- [ ] Place `org/reusable-codeql.yml` into the org-level repo at `<OWNER>/.github/.github/workflows/reusable-codeql.yml`.
- [ ] In each repo, add a caller workflow:

```yaml
# .github/workflows/ci.yml
name: org-ci
on: [pull_request]
jobs:
  security:
    uses: <OWNER>/.github/.github/workflows/reusable-codeql.yml@main
    secrets: inherit
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test --if-present
```

## 4. Sentry Copilot Extension

- [ ] Install **Sentry for GitHub Copilot** from VS Code Marketplace (or Codespaces).
- [ ] Connect to your Sentry org/project via the extension settings.
- [ ] In PRs / Copilot Chat, use prompts like:
  - `@sentry What are the most recent unresolved errors?`
  - `@sentry Suggest a fix for issue PROJ-1234`
  - `@sentry Generate unit tests for the fix in commit abc123`

## 5. Docker Copilot Extension (if repo uses Docker)

- [ ] Install **Docker for GitHub Copilot** from VS Code Marketplace.
- [ ] Use prompts like:
  - `@docker Optimize this Dockerfile for smaller image size`
  - `@docker Add a healthcheck to my Compose service`
  - `@docker Scan this image for vulnerabilities`
  - `@docker Convert to multi-stage build`

## 6. SECURITY.md

- [ ] Add a `SECURITY.md` to the repo root (see template in this project).

## 7. Verify

- [ ] Open a test PR → CodeQL runs → alerts appear as annotations.
- [ ] Branch protection prevents merge until checks pass.
- [ ] Copilot Autofix appears on any code scanning alert (if applicable).
