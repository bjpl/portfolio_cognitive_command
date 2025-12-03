/**
 * Repository Scanner Skill
 * Scans git repositories and extracts metadata
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
 */
async function analyzeRepo(repoPath: string): Promise<RepoScanResult | null> {
  try {
    const name = path.basename(repoPath);

    // Get last commit info
    const lastCommitHash = execSync('git rev-parse HEAD', {
      cwd: repoPath,
      encoding: 'utf8'
    }).trim();

    const lastCommitMessage = execSync('git log -1 --pretty=%B', {
      cwd: repoPath,
      encoding: 'utf8'
    }).trim();

    const lastCommitDate = execSync('git log -1 --pretty=%aI', {
      cwd: repoPath,
      encoding: 'utf8'
    }).trim();

    // Count commits in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const commits7d = execSync(
      `git rev-list --count --since="${sevenDaysAgo.toISOString()}" HEAD`,
      { cwd: repoPath, encoding: 'utf8' }
    ).trim();

    const commits7dCount = parseInt(commits7d, 10);

    // Determine status (ACTIVE if commits in last 7 days, DORMANT otherwise)
    const status: 'ACTIVE' | 'DORMANT' = commits7dCount > 0 ? 'ACTIVE' : 'DORMANT';

    return {
      name,
      path: repoPath,
      status,
      commits7d: commits7dCount,
      lastCommit: {
        hash: lastCommitHash.substring(0, 7), // Short hash
        message: lastCommitMessage,
        date: lastCommitDate
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
    const logOutput = execSync(
      `git log --pretty=format:"%H|%s|%aI|%an" -n ${limit}`,
      { cwd: repoPath, encoding: 'utf8' }
    );

    return logOutput.split('\n').map(line => {
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
    const sinceArg = since ? `--since="${since}"` : '';
    const filesOutput = execSync(
      `git log ${sinceArg} --name-only --pretty=format: | sort | uniq`,
      { cwd: repoPath, encoding: 'utf8' }
    );

    return filesOutput
      .split('\n')
      .filter(f => f.trim().length > 0);
  } catch (error) {
    console.error(`Error getting changed files: ${error}`);
    return [];
  }
}
