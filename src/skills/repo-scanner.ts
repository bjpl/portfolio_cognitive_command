/**
 * Repository Scanner Skill
 * Scans git repositories and extracts metadata
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Validates and sanitizes a repository path to prevent path traversal attacks
 * @param repoPath - Path to validate
 * @returns Sanitized absolute path
 * @throws Error if path is invalid or contains traversal attempts
 */
function validateRepoPath(repoPath: string): string {
  // Resolve to absolute path
  const absolutePath = path.resolve(repoPath);

  // Check for path traversal attempts
  const normalizedPath = path.normalize(repoPath);
  if (normalizedPath.includes('..') && !absolutePath.startsWith(path.resolve('.'))) {
    throw new Error(`Invalid repository path: potential path traversal detected`);
  }

  // Verify path exists and is a directory
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Repository path does not exist: ${absolutePath}`);
  }

  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    throw new Error(`Repository path is not a directory: ${absolutePath}`);
  }

  return absolutePath;
}

/**
 * Validates that an integer is within expected bounds
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param name - Parameter name for error messages
 * @returns Validated number
 */
function validateInt(value: number, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}: must be integer between ${min} and ${max}`);
  }
  return value;
}

export interface RepoScanResult {
  name: string;
  path: string;
  status: 'ACTIVE' | 'DORMANT';
  commits7d: number;
  lastCommit: {
    hash: string;
    message: string;
    date: string;
  };
}

/**
 * Scans directories recursively for git repositories
 * @param basePath - Root directory to start scanning
 * @param maxDepth - Maximum directory depth to scan
 * @returns Array of repository scan results
 */
export async function scanRepos(
  basePath: string,
  maxDepth: number = 3
): Promise<RepoScanResult[]> {
  const results: RepoScanResult[] = [];

  try {
    await scanDirectory(basePath, 0, maxDepth, results);
  } catch (error) {
    console.error(`Error scanning repositories: ${error}`);
  }

  return results;
}

/**
 * Recursively scans a directory for git repositories
 */
async function scanDirectory(
  dirPath: string,
  currentDepth: number,
  maxDepth: number,
  results: RepoScanResult[]
): Promise<void> {
  if (currentDepth > maxDepth) return;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // Check if current directory is a git repository
    if (entries.some(e => e.name === '.git' && e.isDirectory())) {
      const repoResult = await analyzeRepo(dirPath);
      if (repoResult) {
        results.push(repoResult);
      }
      return; // Don't scan subdirectories of git repos
    }

    // Recursively scan subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subPath = path.join(dirPath, entry.name);
        await scanDirectory(subPath, currentDepth + 1, maxDepth, results);
      }
    }
  } catch (error) {
    // Skip directories we can't access
    console.warn(`Cannot access directory: ${dirPath}`);
  }
}

/**
 * Analyzes a git repository and extracts metadata
 * Uses execFile instead of execSync to prevent command injection
 */
async function analyzeRepo(repoPath: string): Promise<RepoScanResult | null> {
  try {
    // Validate and sanitize the path
    const safePath = validateRepoPath(repoPath);
    const name = path.basename(safePath);

    // Verify this is a git repository
    const gitDir = path.join(safePath, '.git');
    if (!fs.existsSync(gitDir)) {
      throw new Error('Not a git repository');
    }

    // Get last commit info using execFile (safe from command injection)
    const { stdout: lastCommitHash } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: safePath,
      encoding: 'utf8'
    });

    const { stdout: lastCommitMessage } = await execFileAsync('git', ['log', '-1', '--pretty=%B'], {
      cwd: safePath,
      encoding: 'utf8'
    });

    const { stdout: lastCommitDate } = await execFileAsync('git', ['log', '-1', '--pretty=%aI'], {
      cwd: safePath,
      encoding: 'utf8'
    });

    // Count commits in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { stdout: commits7d } = await execFileAsync('git', [
      'rev-list',
      '--count',
      `--since=${sevenDaysAgo.toISOString()}`,
      'HEAD'
    ], { cwd: safePath, encoding: 'utf8' });

    const commits7dCount = parseInt(commits7d.trim(), 10);

    // Determine status (ACTIVE if commits in last 7 days, DORMANT otherwise)
    const status: 'ACTIVE' | 'DORMANT' = commits7dCount > 0 ? 'ACTIVE' : 'DORMANT';

    return {
      name,
      path: safePath,
      status,
      commits7d: commits7dCount,
      lastCommit: {
        hash: lastCommitHash.trim().substring(0, 7), // Short hash
        message: lastCommitMessage.trim(),
        date: lastCommitDate.trim()
      }
    };
  } catch (error) {
    console.error(`Error analyzing repository at ${repoPath}: ${error}`);
    return null;
  }
}

/**
 * Gets detailed commit history for a repository
 * @param repoPath - Path to git repository
 * @param limit - Maximum number of commits to retrieve
 * @returns Array of commit objects
 */
export async function getCommitHistory(
  repoPath: string,
  limit: number = 100
): Promise<Array<{ hash: string; message: string; date: string; author: string }>> {
  try {
    // Validate inputs
    const safePath = validateRepoPath(repoPath);
    const safeLimit = validateInt(limit, 1, 10000, 'limit');

    // Use execFile with array arguments (safe from injection)
    const { stdout: logOutput } = await execFileAsync('git', [
      'log',
      '--pretty=format:%H|%s|%aI|%an',
      '-n',
      String(safeLimit)
    ], { cwd: safePath, encoding: 'utf8' });

    return logOutput.split('\n').filter(line => line.trim()).map(line => {
      const [hash, message, date, author] = line.split('|');
      return { hash, message, date, author };
    });
  } catch (error) {
    console.error(`Error getting commit history: ${error}`);
    return [];
  }
}

/**
 * Gets changed files in recent commits
 * @param repoPath - Path to git repository
 * @param since - Date to get changes since (ISO string)
 * @returns Array of file paths
 */
export async function getChangedFiles(
  repoPath: string,
  since?: string
): Promise<string[]> {
  try {
    // Validate inputs
    const safePath = validateRepoPath(repoPath);

    // Build git args safely
    const gitArgs = ['log', '--name-only', '--pretty=format:'];
    if (since) {
      // Validate since is a valid ISO date string
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        throw new Error('Invalid date format for since parameter');
      }
      gitArgs.push(`--since=${sinceDate.toISOString()}`);
    }

    // Use execFile with array arguments (safe from injection)
    const { stdout: filesOutput } = await execFileAsync('git', gitArgs, {
      cwd: safePath,
      encoding: 'utf8'
    });

    // Deduplicate and filter results
    const files = filesOutput
      .split('\n')
      .filter(f => f.trim().length > 0);

    return [...new Set(files)].sort();
  } catch (error) {
    console.error(`Error getting changed files: ${error}`);
    return [];
  }
}
