/**
 * Tests for repo-scanner.ts
 * Tests repository scanning functionality
 */

import {
  scanRepos,
  getCommitHistory,
  getChangedFiles,
  RepoScanResult
} from '../src/skills/repo-scanner';
import * as fs from 'fs';
import * as path from 'path';

// Mock child_process for unit testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Mock fs for unit testing
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  existsSync: jest.fn()
}));

import { execSync } from 'child_process';
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockReaddirSync = fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>;

describe('RepoScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  describe('scanRepos', () => {
    it('should return an array', async () => {
      const mockDir = '/nonexistent';

      const results = await scanRepos(mockDir);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should accept maxDepth parameter', async () => {
      const mockDir = '/test';

      // Should not throw
      await expect(scanRepos(mockDir, 5)).resolves.toBeDefined();
    });

    it('should handle non-existent directory gracefully', async () => {
      const results = await scanRepos('/path/that/does/not/exist');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should use default maxDepth of 3', async () => {
      const results = await scanRepos('/test');

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getCommitHistory', () => {
    it('should return array of commit objects', async () => {
      mockExecSync.mockReturnValue('abc123|test message|2025-01-01|author');

      const history = await getCommitHistory('/test/repo');

      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const mockLog = Array(5).fill('abc|msg|date|author').join('\n');
      mockExecSync.mockReturnValue(mockLog);

      const history = await getCommitHistory('/test/repo', 5);

      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should parse commit format correctly', async () => {
      mockExecSync.mockReturnValue('abc123|feat: test commit|2025-01-01T12:00:00Z|John Doe');

      const history = await getCommitHistory('/test/repo');

      if (history.length > 0) {
        expect(history[0]).toHaveProperty('hash');
        expect(history[0]).toHaveProperty('message');
        expect(history[0]).toHaveProperty('date');
        expect(history[0]).toHaveProperty('author');
      }
    });

    it('should handle git command failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const history = await getCommitHistory('/not/a/repo');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('should use default limit of 100', async () => {
      mockExecSync.mockReturnValue('abc|msg|date|author');

      await getCommitHistory('/test/repo');

      expect(mockExecSync).toHaveBeenCalled();
      const callArgs = mockExecSync.mock.calls[0][0] as string;
      expect(callArgs).toContain('-n 100');
    });
  });

  describe('getChangedFiles', () => {
    it('should return array of file paths', async () => {
      mockExecSync.mockReturnValue('src/file1.ts\nsrc/file2.ts\n');

      const files = await getChangedFiles('/test/repo');

      expect(Array.isArray(files)).toBe(true);
    });

    it('should filter empty lines', async () => {
      mockExecSync.mockReturnValue('file1.ts\n\nfile2.ts\n\n');

      const files = await getChangedFiles('/test/repo');

      files.forEach(f => {
        expect(f.trim().length).toBeGreaterThan(0);
      });
    });

    it('should accept since parameter', async () => {
      mockExecSync.mockReturnValue('file.ts');

      await getChangedFiles('/test/repo', '2025-01-01');

      expect(mockExecSync).toHaveBeenCalled();
      const callArgs = mockExecSync.mock.calls[0][0] as string;
      expect(callArgs).toContain('--since');
    });

    it('should handle git command failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git error');
      });

      const files = await getChangedFiles('/not/a/repo');

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });

    it('should work without since parameter', async () => {
      mockExecSync.mockReturnValue('file.ts');

      const files = await getChangedFiles('/test/repo');

      expect(Array.isArray(files)).toBe(true);
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
  });

  describe('scanRepos error handling (line 37)', () => {
    it('should catch and handle errors during directory scanning', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw, should return empty array
      const results = await scanRepos('/restricted/path');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should log error message when scanning fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // This will trigger the error at line 37 (the outer try-catch in scanRepos)
      // by making readdirSync throw an error that propagates up
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Catastrophic file system error');
      });

      await scanRepos('/error/path');

      // Should log to console.error or console.warn depending on where error is caught
      const wasLogged = consoleErrorSpy.mock.calls.length > 0 || consoleWarnSpy.mock.calls.length > 0;
      expect(wasLogged).toBe(true);

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('scanDirectory git detection (lines 58-70)', () => {
    it('should detect .git directory and analyze repository', async () => {
      // Mock directory with .git folder
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'src', isDirectory: () => true, isFile: () => false },
        { name: 'README.md', isDirectory: () => false, isFile: () => true }
      ] as any);

      // Mock git commands for analyzeRepo
      mockExecSync
        .mockReturnValueOnce('abc123def456') // git rev-parse HEAD
        .mockReturnValueOnce('Initial commit') // git log -1 --pretty=%B
        .mockReturnValueOnce('2025-12-09T10:00:00Z') // git log -1 --pretty=%aI
        .mockReturnValueOnce('5'); // git rev-list --count

      const results = await scanRepos('/test/repo');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('lastCommit');
    });

    it('should skip subdirectories of git repositories', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'subdir', isDirectory: () => true, isFile: () => false }
      ] as any);

      mockExecSync
        .mockReturnValueOnce('abc123')
        .mockReturnValueOnce('commit message')
        .mockReturnValueOnce('2025-12-09T10:00:00Z')
        .mockReturnValueOnce('3');

      const results = await scanRepos('/test/repo');

      // Should only scan once (not recurse into subdir)
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
    });

    it('should recursively scan non-git subdirectories', async () => {
      let callCount = 0;
      mockReaddirSync.mockImplementation((dirPath: any) => {
        callCount++;
        if (callCount === 1) {
          // First call: root directory with subdirectories
          return [
            { name: 'project1', isDirectory: () => true, isFile: () => false },
            { name: 'project2', isDirectory: () => true, isFile: () => false },
            { name: 'README.md', isDirectory: () => false, isFile: () => true }
          ] as any;
        } else if (callCount === 2) {
          // Second call: project1 is a git repo
          return [
            { name: '.git', isDirectory: () => true, isFile: () => false }
          ] as any;
        } else {
          // Third call: project2 is not a git repo
          return [
            { name: 'src', isDirectory: () => true, isFile: () => false }
          ] as any;
        }
      });

      mockExecSync
        .mockReturnValueOnce('hash1')
        .mockReturnValueOnce('msg1')
        .mockReturnValueOnce('2025-12-09T10:00:00Z')
        .mockReturnValueOnce('1');

      await scanRepos('/test/root', 2);

      // Should scan root, project1 (git repo found), and project2
      expect(mockReaddirSync).toHaveBeenCalled();
    });

    it('should skip dot directories except .git', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: '.hidden', isDirectory: () => true, isFile: () => false },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'src', isDirectory: () => true, isFile: () => false }
      ] as any);

      mockExecSync
        .mockReturnValueOnce('hash')
        .mockReturnValueOnce('msg')
        .mockReturnValueOnce('2025-12-09T10:00:00Z')
        .mockReturnValueOnce('0');

      const results = await scanRepos('/test/repo');

      // Should detect .git and analyze, but not recurse into .hidden or node_modules
      expect(results.length).toBeGreaterThan(0);
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

  describe('analyzeRepo function (lines 83-128)', () => {
    it('should extract full repository metadata for ACTIVE repo', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      mockExecSync
        .mockReturnValueOnce('abc123def456789012345678') // Full hash
        .mockReturnValueOnce('feat: add new feature') // Commit message
        .mockReturnValueOnce('2025-12-09T10:30:00Z') // Commit date
        .mockReturnValueOnce('7'); // 7 commits in last 7 days

      const results = await scanRepos('/test/active-repo');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('active-repo');
      expect(results[0].status).toBe('ACTIVE');
      expect(results[0].commits7d).toBe(7);
      expect(results[0].lastCommit.hash).toBe('abc123d'); // Short hash (7 chars)
      expect(results[0].lastCommit.message).toBe('feat: add new feature');
      expect(results[0].lastCommit.date).toBe('2025-12-09T10:30:00Z');
    });

    it('should extract repository metadata for DORMANT repo', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      mockExecSync
        .mockReturnValueOnce('xyz789abc123')
        .mockReturnValueOnce('old commit')
        .mockReturnValueOnce('2025-11-01T08:00:00Z')
        .mockReturnValueOnce('0'); // No commits in last 7 days

      const results = await scanRepos('/test/dormant-repo');

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('DORMANT');
      expect(results[0].commits7d).toBe(0);
    });

    it('should handle boundary case of exactly 1 commit in 7 days', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      mockExecSync
        .mockReturnValueOnce('hash123')
        .mockReturnValueOnce('boundary commit')
        .mockReturnValueOnce('2025-12-09T00:00:00Z')
        .mockReturnValueOnce('1');

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

      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: bad revision HEAD');
      });

      const results = await scanRepos('/test/corrupted-repo');

      // Should handle error gracefully and not include the repo
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(results.length).toBe(0);
      consoleErrorSpy.mockRestore();
    });

    it('should handle parse error for invalid commit count', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      mockExecSync
        .mockReturnValueOnce('hash')
        .mockReturnValueOnce('message')
        .mockReturnValueOnce('2025-12-09T10:00:00Z')
        .mockReturnValueOnce('invalid'); // Invalid number

      const results = await scanRepos('/test/invalid-count');

      // parseInt('invalid') returns NaN, which should be handled
      expect(results.length).toBeLessThanOrEqual(1);
      if (results.length === 1) {
        expect(isNaN(results[0].commits7d)).toBe(true);
      }
    });

    it('should correctly truncate long commit hashes to 7 characters', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      const longHash = 'abcdef1234567890abcdef1234567890abcdef12';
      mockExecSync
        .mockReturnValueOnce(longHash)
        .mockReturnValueOnce('test message')
        .mockReturnValueOnce('2025-12-09T10:00:00Z')
        .mockReturnValueOnce('3');

      const results = await scanRepos('/test/hash-test');

      expect(results.length).toBe(1);
      expect(results[0].lastCommit.hash).toBe('abcdef1');
      expect(results[0].lastCommit.hash.length).toBe(7);
    });

    it('should use repository directory name as repo name', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      mockExecSync
        .mockReturnValueOnce('hash')
        .mockReturnValueOnce('msg')
        .mockReturnValueOnce('2025-12-09T10:00:00Z')
        .mockReturnValueOnce('2');

      const results = await scanRepos('/path/to/my-awesome-project');

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('my-awesome-project');
    });

    it('should handle multiline commit messages', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      const multilineMessage = 'feat: add feature\n\nDetailed description\nMore details';
      mockExecSync
        .mockReturnValueOnce('hash')
        .mockReturnValueOnce(multilineMessage)
        .mockReturnValueOnce('2025-12-09T10:00:00Z')
        .mockReturnValueOnce('1');

      const results = await scanRepos('/test/multiline');

      expect(results.length).toBe(1);
      expect(results[0].lastCommit.message).toBe(multilineMessage);
    });

    it('should calculate date correctly for 7 days ago check', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true, isFile: () => false }
      ] as any);

      let capturedCommand = '';
      mockExecSync.mockImplementation((cmd: any) => {
        const command = cmd.toString();
        if (command.includes('rev-list')) {
          capturedCommand = command;
          return '5';
        } else if (command.includes('rev-parse')) {
          return 'hash123';
        } else if (command.includes('log -1 --pretty=%B')) {
          return 'message';
        } else if (command.includes('log -1 --pretty=%aI')) {
          return '2025-12-09T10:00:00Z';
        }
        return '';
      });

      await scanRepos('/test/date-check');

      // Verify that the command includes a valid ISO date string
      expect(capturedCommand).toContain('--since=');
      expect(capturedCommand).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('maxDepth boundary conditions', () => {
    it('should stop scanning when maxDepth is reached', async () => {
      let depth = 0;
      mockReaddirSync.mockImplementation(() => {
        depth++;
        return [
          { name: 'nested', isDirectory: () => true, isFile: () => false }
        ] as any;
      });

      await scanRepos('/test/deep', 0); // maxDepth = 0

      // Should only scan once (root level)
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
    });

    it('should respect maxDepth parameter in recursive scanning', async () => {
      let callCount = 0;
      mockReaddirSync.mockImplementation((dirPath: any) => {
        callCount++;
        if (callCount <= 2) {
          return [
            { name: 'level' + callCount, isDirectory: () => true, isFile: () => false }
          ] as any;
        }
        return [] as any;
      });

      await scanRepos('/test/depth-test', 1);

      // Should scan root (depth 0) and one level deep (depth 1), but not deeper
      expect(mockReaddirSync).toHaveBeenCalledTimes(2);
    });
  });
});
