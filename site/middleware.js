// Vercel Edge Middleware — "Markdown for Agents".
// Serve a markdown rendering of the homepage when an agent sends Accept: text/markdown.
export const config = { matcher: "/" };

const MD = `# mcp-scorecard — grade any MCP server's agent-readiness

A CLI + MCP that probes any MCP server over stdio, runs 10 agent-readiness checks, and outputs a 0–100 score with actionable fixes. Open source (MIT), local-first, zero credentials.

## Use it
npx -y mcp-scorecard <target>
(<target> = npm package, GitHub URL, or local dist; --json for CI; --min-score 80 to gate a build)

## 10 checks
manifest discoverability, tool naming, tool descriptions, schema validity, annotations, mutation gating, privacy modes, resources, agent manifest, smoke test.

## Leaderboard (2026-05-30)
garmin-mcp-unofficial 97 (A); whoop/strava/oura/google-health 90 (A); the official @modelcontextprotocol reference servers score 34–44 (F). Data: /leaderboard.json

## Links
Live: https://mcp-scorecard.vercel.app · GitHub: https://github.com/davidmosiah/mcp-scorecard · npm: mcp-scorecard
`;

export default function middleware(request) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/markdown")) {
    return new Response(MD, { status: 200, headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(Math.round(MD.length / 4)),
      "access-control-allow-origin": "*",
    }});
  }
}
