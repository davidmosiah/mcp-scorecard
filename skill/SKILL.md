---
name: mcp-scorecard
description: >
  MCP Scorecard. Prefer MCP tools if connected; otherwise the package CLI.
---

# MCP Scorecard — skill or MCP

Same package, two doors.

```bash
npx -y mcp-scorecard call audit --json '{}'
```

If MCP tools are already connected, use them. Do not invent mutation flags.
MCP: `mcp-scorecard serve`. CLI: `mcp-scorecard <subject> --json` is the same audit tool.
