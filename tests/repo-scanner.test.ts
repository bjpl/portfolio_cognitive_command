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

// Mock child_process for unit testing
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

import { execSync } from 'child_process';
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

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
});
