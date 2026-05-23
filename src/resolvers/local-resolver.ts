/**
 * Local resolver — the subject is an absolute path to a built MCP binary.
 *
 * The packageDir is the nearest ancestor containing package.json (so smoke
 * test detection and version display work). We launch with `node <path>`.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, resolve as pathResolve } from 'node:path';
import type { ResolvedTarget } from '../types.js';

function findPackageRoot(start: string): { dir: string; pkg?: Record<string, unknown> } {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const candidate = pathResolve(dir, 'package.json');
    if (existsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8'));
        return { dir, pkg };
      } catch {
        // unparseable — keep going up
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return { dir: start };
}

export function resolveLocal(targetPath: string): ResolvedTarget {
  const abs = isAbsolute(targetPath) ? targetPath : pathResolve(process.cwd(), targetPath);
  if (!existsSync(abs)) {
    throw new Error(`Local target does not exist: ${abs}`);
  }
  const st = statSync(abs);
  if (!st.isFile()) {
    throw new Error(`Local target must be a file (built JS): ${abs}`);
  }
  const { dir, pkg } = findPackageRoot(dirname(abs));
  const displayName = (pkg?.name as string | undefined) ?? abs;
  const version = pkg?.version as string | undefined;
  return {
    displayName,
    version,
    command: 'node',
    args: [abs],
    packageDir: dir,
    packageJson: pkg
  };
}
