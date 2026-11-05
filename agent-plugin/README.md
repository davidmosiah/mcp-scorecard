# MCP Scorecard — Agent Plugins package

Portable [Agent Plugins](https://agent-plugins.org/) v1 package for
[Hermes Agent](https://github.com/NousResearch/hermes-agent) and other Agent Plugins clients:
the `mcp-scorecard` MCP server (`mcp-scorecard@0.5.13` over stdio) plus the `mcp-scorecard` workflow skill.

## Install (Hermes Agent)

```bash
hermes plugins install davidmosiah/mcp-scorecard/agent-plugin --no-enable
hermes plugins enable mcp-scorecard
```

Requires Node.js 22+ (`npx` on PATH). The skill loads as `mcp-scorecard:mcp-scorecard`.

## Disclosure

Runs the `mcp-scorecard@0.5.13` npm package locally over stdio through `npx` (Node.js 22+ required); the package is downloaded from npm on first start. Data source: it audits the subject the user names: an npm package or GitHub repo is downloaded and started locally to probe its MCP surface; an https URL is probed remotely. Auditing an npm package or repository executes that third-party code on this machine with the user's privileges. Only audit subjects the user named, and say so before running one. The tool set comes from the pinned npm version, not from this repository's source tree.
