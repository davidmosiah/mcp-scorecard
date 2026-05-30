# mcp-scorecard — grade any MCP server's agent-readiness

A CLI + MCP that probes any MCP server over stdio, runs **10 agent-readiness checks**, and outputs a **0–100 score** with the exact fixes. Open source (MIT), local-first, zero credentials.

## Use it

```
npx -y mcp-scorecard <target>
```

`<target>` = an npm package, a GitHub repo URL, or a local `dist/index.js`. `--json` for CI, `--min-score 80` to gate a build.

## The 10 checks (each 0–10)

manifest discoverability · tool naming · tool descriptions · schema validity · annotations · mutation gating · privacy modes · resources · agent manifest · smoke test.

## Leaderboard (2026-05-30)

Top: garmin-mcp-unofficial 97 (A); whoop / strava / oura / google-health-mcp-unofficial 90 (A). The official `@modelcontextprotocol` reference servers score 34–44 (F). Full data: /leaderboard.json.

## Links

- Live: https://mcp-scorecard.vercel.app
- GitHub: https://github.com/davidmosiah/mcp-scorecard
- npm: https://www.npmjs.com/package/mcp-scorecard
