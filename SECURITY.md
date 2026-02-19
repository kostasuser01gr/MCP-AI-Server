# Security & Code Scanning

## Code Scanning (CodeQL)

This repository uses **GitHub Code Scanning** powered by CodeQL. Scans run automatically on:

- **Pull requests** targeting `main` — alerts appear as PR annotations.
- **Weekly schedule** (Monday 03:00 UTC) — catches vulnerabilities in existing code.

Results appear under the **Security → Code scanning alerts** tab. Each alert includes a description, severity, CWE reference, and a link to the affected code.

### Copilot Autofix

When Code Scanning detects an issue, **GitHub Copilot Autofix** may generate a suggested patch directly on the alert. These suggestions are convenience aids — **always review the proposed change, run tests, and verify correctness** before merging. Do not rely solely on automated fixes for high-risk or security-sensitive changes.

## Scope

- **Languages**: JavaScript / TypeScript (primary). Extend the CodeQL matrix in `.github/workflows/codeql.yml` to add Python, Java, Go, etc.
- **Folders**: All source under `server/src/`.
- **Schedule**: PRs + weekly. Adjust the cron in the workflow if needed.

## Reporting a Vulnerability

If you discover a security issue, please **do not** open a public GitHub issue. Instead, email the maintainer directly or use GitHub's private vulnerability reporting feature (Security → Advisories → Report a vulnerability).
