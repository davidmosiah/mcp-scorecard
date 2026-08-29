---
name: mcp-scorecard
description: >
  MCP Scorecard. Prefer MCP tools if connected; otherwise the package CLI.
---

# MCP Scorecard — skill or MCP

Same package, two doors. The MCP tool is `audit` and requires `target`.

```bash
npx -y mcp-scorecard call audit --json '{"target":"./dist/index.js"}'
```

If MCP tools are already connected, call `audit` with `{ "target": "..." }`. Do not invent mutation flags.
MCP: `mcp-scorecard serve`. CLI subject form `mcp-scorecard <path> --json` is the same audit once a target is known.
