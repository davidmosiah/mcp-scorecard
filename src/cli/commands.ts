/**
 * CLI parser — plain argv, no commander. The first positional is the
 * subject (npm package, GitHub URL, or absolute path). Flags:
 *
 *   --json            emit JSON instead of markdown
 *   --min-score N     exit 1 if total score < N (CI gate)
 *   --version         print scorecard version
 *   --help, -h        print usage
 */

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { SERVER_VERSION } from '../constants.js';
import { runAudit } from '../audit/runner.js';
import { resolveGithubRepo } from '../resolvers/github-resolver.js';
import { resolveLocal } from '../resolvers/local-resolver.js';
import { resolveNpmPackage } from '../resolvers/npm-resolver.js';
import type { ResolvedTarget } from '../types.js';
import { renderJson, renderMarkdown } from './output.js';

const USAGE = `mcp-scorecard v${SERVER_VERSION}

Usage:
  mcp-scorecard <subject> [--json] [--min-score N]

Subjects:
  npm-package            e.g. whoop-mcp-unofficial[@version]
  github-url             e.g. https://github.com/davidmosiah/whoop-mcp
  /abs/path/dist/index.js  built MCP server entry

Flags:
  --json           emit structured JSON to stdout
  --min-score N    exit non-zero if total score < N (default 0)
  --version        print version
  --help, -h       print this message

Privacy: the probe sets MCP_PROBE=1 so MCP authors can detect an audit and
skip auth-only side effects. Probe responses are NEVER persisted; only
counts and field names are recorded. See the README for the security model.`;

interface ParsedArgs {
  subject?: string;
  json: boolean;
  minScore: number;
  help: boolean;
  showVersion: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { json: false, minScore: 0, help: false, showVersion: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--version') out.showVersion = true;
    else if (arg === '--json') out.json = true;
    else if (arg === '--min-score') {
      const v = argv[++i];
      const n = Number.parseInt(v, 10);
      if (!Number.isFinite(n)) throw new Error(`--min-score expects a number, got: ${v}`);
      out.minScore = n;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else if (!out.subject) {
      out.subject = arg;
    }
  }
  return out;
}

function classifySubject(subject: string): 'github' | 'local' | 'npm' {
  if (/^https?:\/\/github\.com\//.test(subject) || /^github:/.test(subject)) return 'github';
  if (isAbsolute(subject) && existsSync(subject)) return 'local';
  return 'npm';
}

async function resolveSubject(subject: string): Promise<ResolvedTarget> {
  const kind = classifySubject(subject);
  if (kind === 'github') return resolveGithubRepo(subject);
  if (kind === 'local') return resolveLocal(subject);
  return resolveNpmPackage(subject);
}

export async function run(argv: string[]): Promise<number> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n\n${USAGE}\n`);
    return 2;
  }

  if (parsed.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (parsed.showVersion) {
    process.stdout.write(`${SERVER_VERSION}\n`);
    return 0;
  }
  if (!parsed.subject) {
    process.stderr.write(`Missing subject.\n\n${USAGE}\n`);
    return 2;
  }

  let target: ResolvedTarget;
  try {
    target = await resolveSubject(parsed.subject);
  } catch (err) {
    process.stderr.write(`Resolver error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  let report: Awaited<ReturnType<typeof runAudit>>;
  try {
    report = await runAudit(target);
  } catch (err) {
    process.stderr.write(`Audit error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  process.stdout.write(parsed.json ? renderJson(report) : renderMarkdown(report));
  process.stdout.write('\n');

  if (report.totalScore < parsed.minScore) {
    process.stderr.write(`\nScore ${report.totalScore} < --min-score ${parsed.minScore}\n`);
    return 1;
  }
  return 0;
}
