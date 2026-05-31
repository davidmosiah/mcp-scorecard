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
import { runWebAudit } from '../audit/web/web-runner.js';

/** A hosted/remote target (http[s] URL that isn't a GitHub repo) → web audit path. */
function isWebTarget(subject: string): boolean {
  return /^https?:\/\//.test(subject) && !/github\.com/.test(subject);
}
import { readFileSync } from 'node:fs';
import type { AuditReport, ResolvedTarget } from '../types.js';
import { applyProfile, isProfile } from '../profiles.js';
import { renderBadge, renderBaseline, renderCompare, renderHtml, renderJson, renderMarkdown } from './output.js';

const USAGE = `mcp-scorecard v${SERVER_VERSION}

Usage:
  mcp-scorecard <subject> [--json|--badge|--html] [--profile P] [--baseline f.json] [--min-score N]
  mcp-scorecard serve            run AS an MCP server (agents can call the 'audit' tool)
  mcp-scorecard compare a b c    audit several subjects, print a side-by-side table

Subjects:
  npm-package            e.g. whoop-mcp-unofficial[@version]
  github-url             e.g. https://github.com/davidmosiah/whoop-mcp
  https://host           a HOSTED/remote MCP server or site (web security + agent-readiness audit)
  /abs/path/dist/index.js  built MCP server entry

Flags:
  --json           emit structured JSON to stdout
  --badge          emit a markdown shields.io badge (paste into your README)
  --html           emit a self-contained HTML scorecard
  --profile P      score only one category: all | security | quality | agent-ready
  --baseline f     diff against a previous --json report (regression view)
  --min-score N    exit non-zero if total score < N (default 0)
  --version        print version
  --help, -h       print this message

Privacy: the probe sets MCP_PROBE=1 so MCP authors can detect an audit and
skip auth-only side effects. Probe responses are NEVER persisted; only
counts and field names are recorded. See the README for the security model.`;

interface ParsedArgs {
  subject?: string;
  json: boolean;
  badge: boolean;
  html: boolean;
  baseline?: string;
  profile?: string;
  minScore: number;
  help: boolean;
  showVersion: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { json: false, badge: false, html: false, minScore: 0, help: false, showVersion: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--version') out.showVersion = true;
    else if (arg === '--json') out.json = true;
    else if (arg === '--badge') out.badge = true;
    else if (arg === '--html') out.html = true;
    else if (arg === '--baseline') {
      out.baseline = argv[++i];
      if (!out.baseline) throw new Error('--baseline expects a path to a previous --json report');
    } else if (arg === '--profile') {
      out.profile = argv[++i];
      if (!out.profile || !isProfile(out.profile)) throw new Error(`--profile expects one of: all, security, quality, agent-ready`);
    } else if (arg === '--min-score') {
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

/** Audit one subject — web mode for hosted URLs, stdio mode otherwise. */
async function auditSubject(subject: string): Promise<AuditReport> {
  if (isWebTarget(subject)) return runWebAudit(subject);
  return runAudit(await resolveSubject(subject));
}

export async function run(argv: string[]): Promise<number> {
  // `serve` → run mcp-scorecard itself AS an MCP server (agents call the audit tool).
  if (argv[0] === 'serve') {
    const { serve } = await import('../mcp-server.js');
    await serve();
    // Keep the process alive for the stdio transport (the CLI entry would
    // otherwise process.exit() as soon as run() resolves).
    await new Promise<void>(() => {});
    return 0;
  }

  // `compare a b c` → audit each and print a side-by-side table.
  if (argv[0] === 'compare') {
    const subjects = argv.slice(1).filter((a) => !a.startsWith('--'));
    if (subjects.length < 2) {
      process.stderr.write(`compare needs at least 2 subjects.\n\n${USAGE}\n`);
      return 2;
    }
    const reports: AuditReport[] = [];
    for (const s of subjects) {
      try {
        reports.push(await auditSubject(s));
      } catch (err) {
        process.stderr.write(`skip ${s}: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
    if (reports.length === 0) return 1;
    process.stdout.write(`${renderCompare(reports)}\n`);
    return 0;
  }

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

  let report: AuditReport;
  try {
    report = await auditSubject(parsed.subject);
  } catch (err) {
    process.stderr.write(`Audit error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  if (parsed.profile) report = applyProfile(report, parsed.profile);

  let baseline: AuditReport | undefined;
  if (parsed.baseline) {
    try {
      baseline = JSON.parse(readFileSync(parsed.baseline, 'utf8')) as AuditReport;
    } catch (err) {
      process.stderr.write(`--baseline read error: ${err instanceof Error ? err.message : String(err)}\n`);
      return 1;
    }
  }

  const out = parsed.badge ? renderBadge(report)
    : parsed.json ? renderJson(report)
    : parsed.html ? renderHtml(report)
    : baseline ? renderBaseline(report, baseline)
    : renderMarkdown(report);
  process.stdout.write(`${out}\n`);

  if (report.totalScore < parsed.minScore) {
    process.stderr.write(`\nScore ${report.totalScore} < --min-score ${parsed.minScore}\n`);
    return 1;
  }
  return 0;
}
