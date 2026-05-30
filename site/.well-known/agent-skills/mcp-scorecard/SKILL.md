# Skill: Grade an MCP server's agent-readiness (mcp-scorecard)

Audit any MCP server for agent-readiness — get a 0–100 score across 10 checks with the exact fixes. Local-first, zero credentials.

## Use it

```
npx -y mcp-scorecard <target>
```

- `<target>`: a published npm package, a GitHub repo URL, or a local `dist/index.js`.
- `--json` — structured output for CI / piping.
- `--min-score 80` — exit non-zero if the score drops below a threshold (CI gate).

## The 10 checks (each 0–10)

manifest discoverability · tool naming · tool descriptions · schema validity · annotations · mutation gating · privacy modes · resources · agent manifest · smoke test.

## Links

- Live + leaderboard: https://mcp-scorecard.vercel.app
- GitHub: https://github.com/davidmosiah/mcp-scorecard
- npm: https://www.npmjs.com/package/mcp-scorecard
