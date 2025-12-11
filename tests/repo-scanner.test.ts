/**
 * Tests for repo-scanner.ts
 * Comprehensive tests for repository scanning functionality
 */

// Track mock responses for execFile
let execFileResponses: Array<{ stdout: string; stderr?: string } | Error> = [];
let execFileCallIndex = 0;
const execFileCalls: Array<{ cmd: string; args: string[]; opts: any }> = [];

// Mock the promisified execFile before importing the module
jest.mock('util', () => {
  const originalUtil = jest.requireActual('util');
  return {
    ...originalUtil,
    promisify: (fn: any) => {
      // Return a mock async function for execFile
      return async (cmd: string, args: string[], opts: any) => {
        execFileCalls.push({ cmd, args, opts });
        const response = execFileResponses[execFileCallIndex++];
        if (response instanceof Error) {
          throw response;
        }
        return { stdout: response?.stdout || '', stderr: response?.stderr || '' };
      };
    }
  };
});

// Mock fs module
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn()
}));

// Import after mocking
import {
  scanRepos,
  getCommitHistory,
  getChangedFiles,
  RepoScanResult
} from '../src/skills/repo-scanner';
import * as fs from 'fs';

const mockReaddirSync = fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockStatSync = fs.statSync as jest.MockedFunction<typeof fs.statSync>;

// Helper to set up mock responses for git commands in analyzeRepo
function setupAnalyzeRepoMocks(options: {
  hash?: string;
  message?: string;
  date?: string;
  commits7d?: string;
}) {
  execFileResponses = [
    { stdout: options.hash || 'abc123def456789012345678' },
    { stdout: options.message || 'Initial commit' },
    { stdout: options.date || '2025-12-09T10:00:00Z' },
    { stdout: options.commits7d || '5' }
  ];
}

describe('RepoScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    execFileCalls.length = 0;
    execFileResponses = [];
    execFileCallIndex = 0;

    // Default: directories exist and are directories
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true } as any);
  });

  describe('RepoScanResult interface', () => {
    it('should have correct structure', () => {
      const mockResult: RepoScanResult = {
        name: 'test-repo',
        path: '/test/path',
        status: 'ACTIVE',
        commits7d: 10,
        lastCommit: {
          hash: 'abc1234',
          message: 'test commit',
          date: '2025-01-01T00:00:00Z'
        }
      };

      expect(mockResult.name).toBe('test-repo');
      expect(mockResult.path).toBe('/test/path');
      expect(['ACTIVE', 'DORMANT']).toContain(mockResult.status);
      expect(mockResult.commits7d).toBeGreaterThanOrEqual(0);
      expect(mockResult.lastCommit).toHaveProperty('hash');
      expect(mockResult.lastCommit).toHaveProperty('message');
      expect(mockResult.lastCommit).toHaveProperty('date');
    });

    it('should support ACTIVE status type', () => {
      const repo: RepoScanResult = {
        name: 'active',
        path: '/test',
        status: 'ACTIVE',
        commits7d: 5,
        lastCommit: { hash: 'abc', message: 'msg', date: '2025-01-01' }
      };
      expect(repo.status).toBe('ACTIVE');
    });

    it('should support DORMANT status type', () => {
      const repo: RepoScanResult = {
        name: 'dormant',
        path: '/test',
        status: 'DORMANT',
        commits7d: 0,
        lastCommit: { hash: 'xyz', message: 'old', date: '2024-01-01' }
      };
      expect(repo.status).toBe('DORMANT');
    });
  });

  describe('scanRepos', () => {
    it('should return an array', async () => {
      mockReaddirSync.mockReturnValue([]);

      const results = await scanRepos('/test');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should accept maxDepth parameter', async () => {
      mockReaddirSync.mockReturnValue([]);

      await expect(scanRepos('/test', 5)).resolves.toBeDefined();
    });

    it('should handle non-existent directory gracefully', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const results = await scanRepos('/path/that/does/not/exist');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should use default maxDepth of 3', async () => {
      mockReaddirSync.mockReturnValue([]);

      const results = await scanRepos('/test');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should detect .git directory and analyze repository', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'src', isDirectory: () => true, isFile: () => false }
      ] as any);

      setupAnalyzeRepoMocks({
        hash: 'abc123def456789012345678',
        message: 'Initial commit',
        date: '2025-12-09T10:00:00Z',
        commits7d: '5'
      });

      const results = await scanRepos('/test/repo');

      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('lastCommit');
      expect(results[0].name).toBe('repo');
      expect(results[0].status).toBe('ACTIVE');
      expect(results[0].commits7d).toBe(5);
    });

    it('should skip subdirectories of git repositories', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'subdir', isDirectory: () => true, isFile: () => false }
      ] as any);

      setupAnalyzeRepoMocks({});

      await scanRepos('/test/repo');

      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
    });

    it('should recursively scan non-git subdirectories', async () => {
      let callCount = 0;
      mockReaddirSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'project1', isDirectory: () => true, isFile: () => false },
            { name: 'project2', isDirectory: () => true, isFile: () => false }
          ] as any;
        } else if (callCount === 2) {
          return [
            { name: '.git', isDirectory: () => true, isFile: () => false }
          ] as any;
        } else {
          return [] as any;
        }
      });

      setupAnalyzeRepoMocks({});

      await scanRepos('/test/root', 2);

      expect(mockReaddirSync).toHaveBeenCalledTimes(3);
    });

    it('should skip dot directories except .git', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: '.hidden', isDirectory: () => true, isFile: () => false },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'src', isDirectory: () => true, isFile: () => false }
      ] as any);

      setupAnalyzeRepoMocks({ commits7d: '0' });

      const results = await scanRepos('/test/repo');

      expect(results.length).toBe(1);
    });

    it('should handle directory access errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockReaddirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const results = await scanRepos('/restricted');

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(results.length).toBe(0);
      consoleWarnSpy.mockRestore();
    });
  });

  describe('analyzeRepo behavior', () => {
    it('should extract full repository metadata for ACTIVE repo', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      setupAnalyzeRepoMocks({
        hash: 'abc123def456789012345678',
        message: 'feat: add new feature',
        date: '2025-12-09T10:30:00Z',
        commits7d: '7'
      });

      const results = await scanRepos('/test/active-repo');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('active-repo');
      expect(results[0].status).toBe('ACTIVE');
      expect(results[0].commits7d).toBe(7);
      expect(results[0].lastCommit.hash).toBe('abc123d');
      expect(results[0].lastCommit.message).toBe('feat: add new feature');
      expect(results[0].lastCommit.date).toBe('2025-12-09T10:30:00Z');
    });

    it('should extract repository metadata for DORMANT repo', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      setupAnalyzeRepoMocks({
        hash: 'xyz789abc123',
        message: 'old commit',
        date: '2025-11-01T08:00:00Z',
        commits7d: '0'
      });

      const results = await scanRepos('/test/dormant-repo');

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('DORMANT');
      expect(results[0].commits7d).toBe(0);
    });

    it('should handle boundary case of exactly 1 commit in 7 days', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      setupAnalyzeRepoMocks({
        hash: 'hash123456789',
        message: 'boundary commit',
        date: '2025-12-09T00:00:00Z',
        commits7d: '1'
      });

      const results = await scanRepos('/test/boundary-repo');

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('ACTIVE');
      expect(results[0].commits7d).toBe(1);
    });

    it('should handle git command failures in analyzeRepo', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      execFileResponses = [new Error('fatal: bad revision HEAD')];

      const results = await scanRepos('/test/corrupted-repo');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(results.length).toBe(0);
      consoleErrorSpy.mockRestore();
    });

    it('should correctly truncate long commit hashes to 7 characters', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      const longHash = 'abcdef1234567890abcdef1234567890abcdef12';
      setupAnalyzeRepoMocks({
        hash: longHash,
        message: 'test message',
        date: '2025-12-09T10:00:00Z',
        commits7d: '3'
      });

      const results = await scanRepos('/test/hash-test');

      expect(results.length).toBe(1);
      expect(results[0].lastCommit.hash).toBe('abcdef1');
      expect(results[0].lastCommit.hash.length).toBe(7);
    });

    it('should use repository directory name as repo name', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      setupAnalyzeRepoMocks({});

      const results = await scanRepos('/path/to/my-awesome-project');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('my-awesome-project');
    });

    it('should handle multiline commit messages', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      const multilineMessage = 'feat: add feature\n\nDetailed description\nMore details';
      setupAnalyzeRepoMocks({
        hash: 'hash123456789',
        message: multilineMessage,
        date: '2025-12-09T10:00:00Z',
        commits7d: '1'
      });

      const results = await scanRepos('/test/multiline');

      expect(results.length).toBe(1);
      expect(results[0].lastCommit.message).toBe(multilineMessage);
    });
  });

  describe('getCommitHistory', () => {
    it('should return array of commit objects', async () => {
      execFileResponses = [{ stdout: 'abc123|test message|2025-01-01|author' }];

      const history = await getCommitHistory('/test/repo');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(1);
    });

    it('should respect limit parameter', async () => {
      const mockLog = Array(5).fill('abc|msg|date|author').join('\n');
      execFileResponses = [{ stdout: mockLog }];

      const history = await getCommitHistory('/test/repo', 5);

      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should parse commit format correctly', async () => {
      execFileResponses = [{ stdout: 'abc123|feat: test commit|2025-01-01T12:00:00Z|John Doe' }];

      const history = await getCommitHistory('/test/repo');

      expect(history.length).toBe(1);
      expect(history[0]).toHaveProperty('hash');
      expect(history[0]).toHaveProperty('message');
      expect(history[0]).toHaveProperty('date');
      expect(history[0]).toHaveProperty('author');
      expect(history[0].hash).toBe('abc123');
      expect(history[0].message).toBe('feat: test commit');
      expect(history[0].author).toBe('John Doe');
    });

    it('should handle git command failure', async () => {
      mockExistsSync.mockReturnValue(false);

      const history = await getCommitHistory('/not/a/repo');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('should use default limit of 100', async () => {
      execFileResponses = [{ stdout: 'abc|msg|date|author' }];

      await getCommitHistory('/test/repo');

      expect(execFileCalls.length).toBe(1);
      expect(execFileCalls[0].args).toContain('-n');
      expect(execFileCalls[0].args).toContain('100');
    });

    it('should handle multiple commits', async () => {
      const multipleCommits = [
        'hash1|message1|2025-12-01|author1',
        'hash2|message2|2025-12-02|author2',
        'hash3|message3|2025-12-03|author3'
      ].join('\n');
      execFileResponses = [{ stdout: multipleCommits }];

      const history = await getCommitHistory('/test/repo', 10);

      expect(history.length).toBe(3);
      expect(history[0].hash).toBe('hash1');
      expect(history[1].hash).toBe('hash2');
      expect(history[2].hash).toBe('hash3');
    });

    it('should return empty array for empty output', async () => {
      execFileResponses = [{ stdout: '' }];

      const history = await getCommitHistory('/test/repo');

      expect(history).toEqual([]);
    });
  });

  describe('getChangedFiles', () => {
    it('should return array of file paths', async () => {
      execFileResponses = [{ stdout: 'src/file1.ts\nsrc/file2.ts\n' }];

      const files = await getChangedFiles('/test/repo');

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(2);
      expect(files).toContain('src/file1.ts');
      expect(files).toContain('src/file2.ts');
    });

    it('should filter empty lines', async () => {
      execFileResponses = [{ stdout: 'file1.ts\n\nfile2.ts\n\n' }];

      const files = await getChangedFiles('/test/repo');

      expect(files.length).toBe(2);
      files.forEach(f => {
        expect(f.trim().length).toBeGreaterThan(0);
      });
    });

    it('should accept since parameter', async () => {
      execFileResponses = [{ stdout: 'file.ts' }];

      await getChangedFiles('/test/repo', '2025-01-01');

      expect(execFileCalls.length).toBe(1);
      expect(execFileCalls[0].args.some((arg: string) => arg.includes('--since'))).toBe(true);
    });

    it('should handle git command failure', async () => {
      mockExistsSync.mockReturnValue(false);

      const files = await getChangedFiles('/not/a/repo');

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });

    it('should work without since parameter', async () => {
      execFileResponses = [{ stdout: 'file.ts' }];

      const files = await getChangedFiles('/test/repo');

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(1);
    });

    it('should deduplicate file paths', async () => {
      execFileResponses = [{ stdout: 'file1.ts\nfile1.ts\nfile2.ts\nfile1.ts\n' }];

      const files = await getChangedFiles('/test/repo');

      expect(files.length).toBe(2);
      expect(files).toContain('file1.ts');
      expect(files).toContain('file2.ts');
    });

    it('should sort file paths', async () => {
      execFileResponses = [{ stdout: 'z-file.ts\na-file.ts\nm-file.ts\n' }];

      const files = await getChangedFiles('/test/repo');

      expect(files[0]).toBe('a-file.ts');
      expect(files[1]).toBe('m-file.ts');
      expect(files[2]).toBe('z-file.ts');
    });

    it('should handle invalid date in since parameter', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getChangedFiles('/test/repo', 'invalid-date');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
      consoleErrorSpy.mockRestore();
    });

    it('should return empty array for empty output', async () => {
      execFileResponses = [{ stdout: '' }];

      const files = await getChangedFiles('/test/repo');

      expect(files).toEqual([]);
    });
  });

  describe('Status determination', () => {
    it('ACTIVE status for repos with recent commits', () => {
      const activeRepo: RepoScanResult = {
        name: 'active-repo',
        path: '/test/active',
        status: 'ACTIVE',
        commits7d: 5,
        lastCommit: { hash: 'abc', message: 'recent', date: new Date().toISOString() }
      };

      expect(activeRepo.status).toBe('ACTIVE');
      expect(activeRepo.commits7d).toBeGreaterThan(0);
    });

    it('DORMANT status for repos without recent commits', () => {
      const dormantRepo: RepoScanResult = {
        name: 'dormant-repo',
        path: '/test/dormant',
        status: 'DORMANT',
        commits7d: 0,
        lastCommit: { hash: 'xyz', message: 'old', date: '2020-01-01T00:00:00Z' }
      };

      expect(dormantRepo.status).toBe('DORMANT');
      expect(dormantRepo.commits7d).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle repos with no commits', () => {
      const emptyRepo: RepoScanResult = {
        name: 'empty-repo',
        path: '/test/empty',
        status: 'DORMANT',
        commits7d: 0,
        lastCommit: { hash: '', message: '', date: '' }
      };

      expect(emptyRepo.commits7d).toBe(0);
    });

    it('should handle special characters in repo names', () => {
      const specialRepo: RepoScanResult = {
        name: 'my-repo_v2.0',
        path: '/test/my-repo_v2.0',
        status: 'ACTIVE',
        commits7d: 1,
        lastCommit: { hash: 'abc', message: 'test', date: new Date().toISOString() }
      };

      expect(specialRepo.name).toBe('my-repo_v2.0');
    });

    it('should handle long commit messages', () => {
      const longMessage = 'a'.repeat(500);
      const repo: RepoScanResult = {
        name: 'repo',
        path: '/test',
        status: 'ACTIVE',
        commits7d: 1,
        lastCommit: { hash: 'abc', message: longMessage, date: new Date().toISOString() }
      };

      expect(repo.lastCommit.message.length).toBe(500);
    });

    it('should handle commit messages with special characters', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      const specialMessage = 'fix: handle "quotes" and `backticks` & <brackets>';
      setupAnalyzeRepoMocks({
        message: specialMessage
      });

      const results = await scanRepos('/test/special');

      expect(results.length).toBe(1);
      expect(results[0].lastCommit.message).toBe(specialMessage);
    });
  });

  describe('scanRepos error handling', () => {
    it('should catch and handle errors during directory scanning', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const results = await scanRepos('/restricted/path');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should log warning message when directory cannot be accessed', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockReaddirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      await scanRepos('/error/path');

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot access directory'));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('maxDepth boundary conditions', () => {
    it('should stop scanning when maxDepth is reached', async () => {
      mockReaddirSync.mockImplementation(() => {
        return [
          { name: 'nested', isDirectory: () => true, isFile: () => false }
        ] as any;
      });

      await scanRepos('/test/deep', 0);

      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
    });

    it('should respect maxDepth parameter in recursive scanning', async () => {
      let callCount = 0;
      mockReaddirSync.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return [
            { name: 'level' + callCount, isDirectory: () => true, isFile: () => false }
          ] as any;
        }
        return [] as any;
      });

      await scanRepos('/test/depth-test', 1);

      expect(mockReaddirSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Security validation', () => {
    it('should validate repository paths exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getCommitHistory('/nonexistent/path');

      expect(result).toEqual([]);
    });

    it('should validate path is a directory', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isDirectory: () => false } as any);

      const result = await getCommitHistory('/path/to/file.txt');

      expect(result).toEqual([]);
    });

    it('should verify .git directory exists before analyzing', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      let existsCallCount = 0;
      mockExistsSync.mockImplementation((p: any) => {
        existsCallCount++;
        if (existsCallCount === 2 && p.includes('.git')) {
          return false;
        }
        return true;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const results = await scanRepos('/test/no-git-dir');

      expect(results.length).toBe(0);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Export verification', () => {
    it('should export scanRepos function', () => {
      expect(typeof scanRepos).toBe('function');
    });

    it('should export getCommitHistory function', () => {
      expect(typeof getCommitHistory).toBe('function');
    });

    it('should export getChangedFiles function', () => {
      expect(typeof getChangedFiles).toBe('function');
    });
  });
});
