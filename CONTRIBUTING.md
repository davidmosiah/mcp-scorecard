# Contributing

Contributions should make MCP servers easier for agents to discover, audit and
use safely.

## Good Areas

- New checks with clear, deterministic scoring.
- Better suggested fixes for common MCP readiness failures.
- Regression tests for stdio, hosted, remote and metadata probes.
- Documentation that helps maintainers fix their own score.

## Development

```bash
npm install
npm test
```

`npm test` must stay offline and must not require target server credentials.

## Pull Request Checklist

- Add or update tests for any scoring change.
- Keep findings actionable: every failure should explain what to change.
- Do not collect, persist or print target secrets.
- Do not make network calls from stdio checks unless the user explicitly chose a
  hosted/remote audit mode.
