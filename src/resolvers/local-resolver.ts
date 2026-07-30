/**
 * Local resolver — the subject is a path to a built MCP binary or a package
 * directory whose package.json declares a bin/main entry.
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

/** Absolute path for a subject, whether the user passed abs or relative. */
export function resolveSubjectPath(targetPath: string): string {
  return isAbsolute(targetPath) ? targetPath : pathResolve(process.cwd(), targetPath);
}

/**
 * True when the subject should be treated as a local filesystem target
 * (not an npm package name). Absolute paths, relative path-like strings,
 * and *.mjs/*.js/*.cjs files that exist on disk qualify.
 */
export function isLocalSubject(subject: string): boolean {
  const abs = resolveSubjectPath(subject);
  if (!existsSync(abs)) return false;
  if (isAbsolute(subject)) return true;
  // Relative: only claim local when it looks like a path/file, so bare
  // npm package names that happen to match a cwd file stay npm-resolved.
  if (subject.startsWith('.') || subject.includes('/') || subject.includes('\\')) return true;
  return /\.(m?js|cjs)$/i.test(subject);
}

function resolvePackageEntry(dir: string, pkg: Record<string, unknown>): string | undefined {
  const bin = pkg.bin;
  if (typeof bin === 'string') return pathResolve(dir, bin);
  if (bin && typeof bin === 'object' && !Array.isArray(bin)) {
    const values = Object.values(bin as Record<string, unknown>);
    const first = values.find((v): v is string => typeof v === 'string');
    if (first) return pathResolve(dir, first);
  }
  if (typeof pkg.main === 'string') return pathResolve(dir, pkg.main);
  for (const candidate of ['dist/index.js', 'index.js', 'src/index.js']) {
    const p = pathResolve(dir, candidate);
    if (existsSync(p)) return p;
  }
  return undefined;
}

export function resolveLocal(targetPath: string): ResolvedTarget {
  const abs = resolveSubjectPath(targetPath);
  if (!existsSync(abs)) {
    throw new Error(`Local target does not exist: ${abs}`);
  }
  const st = statSync(abs);

  if (st.isDirectory()) {
    const pkgPath = pathResolve(abs, 'package.json');
    if (!existsSync(pkgPath)) {
      throw new Error(`Local directory has no package.json: ${abs}`);
    }
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    } catch {
      throw new Error(`Local directory has unparseable package.json: ${abs}`);
    }
    const entry = resolvePackageEntry(abs, pkg);
    if (!entry || !existsSync(entry)) {
      throw new Error(
        `Could not resolve MCP entry from package.json bin/main in ${abs}. Pass the built file path explicitly (e.g. dist/index.js).`
      );
    }
    const displayName = (pkg.name as string | undefined) ?? abs;
    const version = pkg.version as string | undefined;
    return {
      displayName,
      version,
      command: 'node',
      args: [entry],
      packageDir: abs,
      packageJson: pkg
    };
  }

  if (!st.isFile()) {
    throw new Error(`Local target must be a file or package directory: ${abs}`);
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
