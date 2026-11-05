---
name: mcp-scorecard
description: >-
  Score any MCP server for security, quality and agent-readiness (0-100, per-check findings) with the mcp-scorecard MCP server. Use when the user asks to audit, review, grade or compare an MCP server given as an npm package, GitHub repository or https URL, or wants a readiness badge. Warns before auditing local packages because that executes third-party code.
---

# MCP Scorecard

MCP server `mcp-scorecard` from the `mcp-scorecard@0.5.13` npm package, run locally through `npx`. It reads a 0-100 security, quality and agent-readiness score with per-check findings for any MCP server. Data source: it audits the subject the user names: an npm package or GitHub repo is downloaded and started locally to probe its MCP surface; an https URL is probed remotely.

## Workflow

1. Start with `audit`.
2. Pass the subject the user named (`whoop-mcp-unofficial@0.6.7`, `https://github.com/owner/repo`, or `https://host/mcp`). For npm and GitHub subjects, say first that auditing runs that code locally.
3. Report the total score, the failing checks and the concrete fix for each, highest impact first.

## Setup (the user runs this in a terminal, not in chat)

No setup.

## Safety

- Auditing an npm package or repository executes that third-party code on this machine with the user's privileges. Only audit subjects the user named, and say so before running one.
