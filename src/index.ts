#!/usr/bin/env node
/**
 * mcp-scorecard CLI entrypoint.
 *
 * Thin wrapper around src/cli/commands.ts so the bin field can point at
 * a single file that just dispatches argv.
 */
import { run } from './cli/commands.js';

run(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  }
);
