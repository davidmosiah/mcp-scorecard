# Agent Development Notes

## Scope

This repo is an agent-readiness scorecard for MCP servers. It launches a target over stdio, inspects the MCP contract, and emits a scored report without persisting private tool payloads.

## Commands

- Install: `npm ci`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Self smoke: `npm run test:self`
- Full gate: `npm test`
- Package preview: `npm pack --dry-run`

## Rules

- Do not persist raw MCP responses from probed servers. Keep reports limited to scores, counts, labels, and redacted findings.
- Preserve `MCP_PROBE=1` behavior so auth-heavy MCPs can expose contracts without live credentials.
- New checks must be deterministic and explain the exact remediation in `fixes`.
- Keep the score stable enough for CI gates; avoid changing weights casually.
- Any new network behavior must be explicit in docs and disabled for local-path targets unless required.

## Agent-readiness checklist

Before publishing a new version:

1. `npm test`
2. `npm pack --dry-run`
3. Run the built CLI against at least one known local-first MCP package
4. Confirm markdown and JSON outputs both include actionable fixes
5. Update `CHANGELOG.md` for score or output-shape changes
