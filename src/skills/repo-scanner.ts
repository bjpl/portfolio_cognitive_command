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
  commits30d: number;
  lastCommit: {
    hash: string;
    message: string;
    date: string;
  };
  // Enhanced scan data
  techStack: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
    primaryLanguage: string;
  };
  deployment: {
    platform: 'vercel' | 'netlify' | 'github-pages' | 'railway' | 'docker' | 'local' | 'unknown';
    hasConfig: boolean;
  };
  integrations: {
    hasCI: boolean;
    ciPlatform?: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci' | 'other';
    hasTests: boolean;
    hasDocker: boolean;
    hasLinting: boolean;
    hasTypeScript: boolean;
    hasReadme: boolean;
    hasSupabase: boolean;
  };
  recentCommitTypes: {
    features: number;
    fixes: number;
    docs: number;
    refactors: number;
    tests: number;
    other: number;
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

    // Count commits in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { stdout: commits30d } = await execFileAsync('git', [
      'rev-list',
      '--count',
      `--since=${thirtyDaysAgo.toISOString()}`,
      'HEAD'
    ], { cwd: safePath, encoding: 'utf8' });

    const commits7dCount = parseInt(commits7d.trim(), 10);
    const commits30dCount = parseInt(commits30d.trim(), 10);

    // Determine status (ACTIVE if commits in last 7 days, DORMANT otherwise)
    const status: 'ACTIVE' | 'DORMANT' = commits7dCount > 0 ? 'ACTIVE' : 'DORMANT';

    // Detect tech stack
    const techStack = await detectTechStack(safePath);

    // Detect deployment platform
    const deployment = detectDeployment(safePath);

    // Detect integrations
    const integrations = detectIntegrations(safePath);

    // Analyze recent commit types
    const recentCommitTypes = await analyzeCommitTypes(safePath, thirtyDaysAgo);

    return {
      name,
      path: safePath,
      status,
      commits7d: commits7dCount,
      commits30d: commits30dCount,
      lastCommit: {
        hash: lastCommitHash.trim().substring(0, 7), // Short hash
        message: lastCommitMessage.trim(),
        date: lastCommitDate.trim()
      },
      techStack,
      deployment,
      integrations,
      recentCommitTypes
    };
  } catch (error) {
    console.error(`Error analyzing repository at ${repoPath}: ${error}`);
    return null;
  }
}

/**
 * Detects the tech stack of a repository based on files present
 */
async function detectTechStack(repoPath: string): Promise<RepoScanResult['techStack']> {
  const languages: string[] = [];
  const frameworks: string[] = [];
  const databases: string[] = [];
  const tools: string[] = [];

  // Check for language indicators
  const fileChecks: Array<{ file: string; language?: string; framework?: string; database?: string; tool?: string }> = [
    { file: 'package.json', language: 'JavaScript/TypeScript' },
    { file: 'tsconfig.json', language: 'TypeScript' },
    { file: 'requirements.txt', language: 'Python' },
    { file: 'Pipfile', language: 'Python' },
    { file: 'pyproject.toml', language: 'Python' },
    { file: 'go.mod', language: 'Go' },
    { file: 'Cargo.toml', language: 'Rust' },
    { file: 'pom.xml', language: 'Java' },
    { file: 'build.gradle', language: 'Java/Kotlin' },
    { file: 'Gemfile', language: 'Ruby' },
    { file: 'composer.json', language: 'PHP' },
  ];

  for (const check of fileChecks) {
    if (fs.existsSync(path.join(repoPath, check.file))) {
      if (check.language && !languages.includes(check.language)) {
        languages.push(check.language);
      }
    }
  }

  // Check package.json for frameworks
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Framework detection
      if (deps['react']) frameworks.push('React');
      if (deps['vue']) frameworks.push('Vue');
      if (deps['@angular/core']) frameworks.push('Angular');
      if (deps['svelte']) frameworks.push('Svelte');
      if (deps['next']) frameworks.push('Next.js');
      if (deps['nuxt']) frameworks.push('Nuxt.js');
      if (deps['express']) frameworks.push('Express');
      if (deps['fastify']) frameworks.push('Fastify');
      if (deps['nestjs'] || deps['@nestjs/core']) frameworks.push('NestJS');
      if (deps['electron']) frameworks.push('Electron');
      if (deps['react-native']) frameworks.push('React Native');

      // Database detection
      if (deps['mongoose'] || deps['mongodb']) databases.push('MongoDB');
      if (deps['pg'] || deps['postgres']) databases.push('PostgreSQL');
      if (deps['mysql'] || deps['mysql2']) databases.push('MySQL');
      if (deps['redis'] || deps['ioredis']) databases.push('Redis');
      if (deps['sqlite3'] || deps['better-sqlite3']) databases.push('SQLite');
      if (deps['prisma'] || deps['@prisma/client']) tools.push('Prisma');
      if (deps['sequelize']) tools.push('Sequelize');
      if (deps['typeorm']) tools.push('TypeORM');

      // Tool detection
      if (deps['jest']) tools.push('Jest');
      if (deps['vitest']) tools.push('Vitest');
      if (deps['mocha']) tools.push('Mocha');
      if (deps['eslint']) tools.push('ESLint');
      if (deps['prettier']) tools.push('Prettier');
      if (deps['webpack']) tools.push('Webpack');
      if (deps['vite']) tools.push('Vite');
      if (deps['rollup']) tools.push('Rollup');
      if (deps['tailwindcss']) tools.push('Tailwind CSS');
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Check requirements.txt for Python frameworks
  const requirementsPath = path.join(repoPath, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    try {
      const requirements = fs.readFileSync(requirementsPath, 'utf8').toLowerCase();
      if (requirements.includes('django')) frameworks.push('Django');
      if (requirements.includes('flask')) frameworks.push('Flask');
      if (requirements.includes('fastapi')) frameworks.push('FastAPI');
      if (requirements.includes('pytorch') || requirements.includes('torch')) tools.push('PyTorch');
      if (requirements.includes('tensorflow')) tools.push('TensorFlow');
      if (requirements.includes('pandas')) tools.push('Pandas');
      if (requirements.includes('sqlalchemy')) tools.push('SQLAlchemy');
    } catch {
      // Ignore read errors
    }
  }

  // Determine primary language
  let primaryLanguage = 'Unknown';
  if (languages.length > 0) {
    // TypeScript takes precedence over JavaScript
    if (languages.includes('TypeScript')) {
      primaryLanguage = 'TypeScript';
    } else {
      primaryLanguage = languages[0];
    }
  }

  return {
    languages: [...new Set(languages)],
    frameworks: [...new Set(frameworks)],
    databases: [...new Set(databases)],
    tools: [...new Set(tools)],
    primaryLanguage
  };
}

/**
 * Detects deployment configuration in a repository
 */
function detectDeployment(repoPath: string): RepoScanResult['deployment'] {
  // Check for deployment configurations
  if (fs.existsSync(path.join(repoPath, 'vercel.json')) ||
      fs.existsSync(path.join(repoPath, '.vercel'))) {
    return { platform: 'vercel', hasConfig: true };
  }

  if (fs.existsSync(path.join(repoPath, 'netlify.toml')) ||
      fs.existsSync(path.join(repoPath, '_redirects'))) {
    return { platform: 'netlify', hasConfig: true };
  }

  if (fs.existsSync(path.join(repoPath, 'railway.json')) ||
      fs.existsSync(path.join(repoPath, 'railway.toml'))) {
    return { platform: 'railway', hasConfig: true };
  }

  if (fs.existsSync(path.join(repoPath, 'Dockerfile')) ||
      fs.existsSync(path.join(repoPath, 'docker-compose.yml')) ||
      fs.existsSync(path.join(repoPath, 'docker-compose.yaml'))) {
    return { platform: 'docker', hasConfig: true };
  }

  // Check for GitHub Pages
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.homepage?.includes('github.io') ||
          packageJson.scripts?.deploy?.includes('gh-pages')) {
        return { platform: 'github-pages', hasConfig: true };
      }
    } catch {
      // Ignore errors
    }
  }

  return { platform: 'unknown', hasConfig: false };
}

/**
 * Detects integrations and tooling in a repository
 */
function detectIntegrations(repoPath: string): RepoScanResult['integrations'] {
  const integrations: RepoScanResult['integrations'] = {
    hasCI: false,
    hasTests: false,
    hasDocker: false,
    hasLinting: false,
    hasTypeScript: false,
    hasReadme: false,
    hasSupabase: false
  };

  // CI Detection
  if (fs.existsSync(path.join(repoPath, '.github', 'workflows'))) {
    integrations.hasCI = true;
    integrations.ciPlatform = 'github-actions';
  } else if (fs.existsSync(path.join(repoPath, '.gitlab-ci.yml'))) {
    integrations.hasCI = true;
    integrations.ciPlatform = 'gitlab-ci';
  } else if (fs.existsSync(path.join(repoPath, 'Jenkinsfile'))) {
    integrations.hasCI = true;
    integrations.ciPlatform = 'jenkins';
  } else if (fs.existsSync(path.join(repoPath, '.circleci'))) {
    integrations.hasCI = true;
    integrations.ciPlatform = 'circleci';
  }

  // Test detection
  integrations.hasTests = fs.existsSync(path.join(repoPath, 'tests')) ||
                          fs.existsSync(path.join(repoPath, 'test')) ||
                          fs.existsSync(path.join(repoPath, '__tests__')) ||
                          fs.existsSync(path.join(repoPath, 'spec'));

  // Docker detection
  integrations.hasDocker = fs.existsSync(path.join(repoPath, 'Dockerfile')) ||
                           fs.existsSync(path.join(repoPath, 'docker-compose.yml')) ||
                           fs.existsSync(path.join(repoPath, 'docker-compose.yaml'));

  // Linting detection
  integrations.hasLinting = fs.existsSync(path.join(repoPath, '.eslintrc.js')) ||
                            fs.existsSync(path.join(repoPath, '.eslintrc.json')) ||
                            fs.existsSync(path.join(repoPath, '.eslintrc')) ||
                            fs.existsSync(path.join(repoPath, 'eslint.config.js')) ||
                            fs.existsSync(path.join(repoPath, '.prettierrc')) ||
                            fs.existsSync(path.join(repoPath, 'prettier.config.js'));

  // TypeScript detection
  integrations.hasTypeScript = fs.existsSync(path.join(repoPath, 'tsconfig.json'));

  // README detection
  integrations.hasReadme = fs.existsSync(path.join(repoPath, 'README.md')) ||
                           fs.existsSync(path.join(repoPath, 'readme.md')) ||
                           fs.existsSync(path.join(repoPath, 'README'));

  // Supabase detection
  integrations.hasSupabase = fs.existsSync(path.join(repoPath, 'supabase')) ||
                              fs.existsSync(path.join(repoPath, 'supabase.config.ts')) ||
                              fs.existsSync(path.join(repoPath, 'supabase.config.js')) ||
                              fs.existsSync(path.join(repoPath, '.supabase')) ||
                              detectSupabaseInPackageJson(repoPath);

  return integrations;
}

/**
 * Checks if Supabase is listed as a dependency in package.json
 */
function detectSupabaseInPackageJson(repoPath: string): boolean {
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return Object.keys(deps).some(dep =>
      dep.includes('supabase') || dep === '@supabase/supabase-js' || dep === '@supabase/auth-helpers-nextjs'
    );
  } catch {
    return false;
  }
}

/**
 * Analyzes commit types from recent commits
 */
async function analyzeCommitTypes(
  repoPath: string,
  since: Date
): Promise<RepoScanResult['recentCommitTypes']> {
  const types: RepoScanResult['recentCommitTypes'] = {
    features: 0,
    fixes: 0,
    docs: 0,
    refactors: 0,
    tests: 0,
    other: 0
  };

  try {
    const { stdout } = await execFileAsync('git', [
      'log',
      '--pretty=%s',
      `--since=${since.toISOString()}`
    ], { cwd: repoPath, encoding: 'utf8' });

    const messages = stdout.split('\n').filter(m => m.trim());

    for (const msg of messages) {
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.startsWith('feat') || lowerMsg.includes('add ') || lowerMsg.includes('implement')) {
        types.features++;
      } else if (lowerMsg.startsWith('fix') || lowerMsg.includes('bug') || lowerMsg.includes('resolve')) {
        types.fixes++;
      } else if (lowerMsg.startsWith('doc') || lowerMsg.includes('readme') || lowerMsg.includes('comment')) {
        types.docs++;
      } else if (lowerMsg.startsWith('refactor') || lowerMsg.includes('cleanup') || lowerMsg.includes('restructure')) {
        types.refactors++;
      } else if (lowerMsg.startsWith('test') || lowerMsg.includes('spec') || lowerMsg.includes('coverage')) {
        types.tests++;
      } else {
        types.other++;
      }
    }
  } catch {
    // Ignore errors
  }

  return types;
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
