import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GitRepository } from '../GitRepository';
import type { FileOperation } from '../types';

describe('GitRepository', () => {
  let gitRepo: GitRepository;

  beforeEach(() => {
    gitRepo = new GitRepository();
  });

  describe('createCommit', () => {
    it('should create a commit with file modifications', async () => {
      const operations: FileOperation[] = [
        { type: 'modify', path: '/test.txt', content: 'Test content' }
      ];

      const sha = await gitRepo.createCommit('Test commit', operations);
      expect(sha).toBeTruthy();

      const history = await gitRepo.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Test commit');
    });

    it('should handle file deletions', async () => {
      const operations: FileOperation[] = [
        { type: 'delete', path: '/delete.txt' }
      ];

      await gitRepo.createCommit('Delete file', operations);
      const files = await gitRepo.getFilesAtCommit('HEAD');
      
      expect(files).not.toHaveProperty('/delete.txt');
    });
  });

  describe('createMergeCommit', () => {
    it('should merge external changes', async () => {
      // Create initial commit
      await gitRepo.createCommit('Initial', [
        { type: 'modify', path: '/test.txt', content: 'Initial' }
      ]);

      // Create merge commit with external changes
      const operations: FileOperation[] = [
        { type: 'modify', path: '/test.txt', content: 'External' }
      ];

      await gitRepo.createMergeCommit('External changes', operations);

      const files = await gitRepo.getFilesAtCommit('HEAD');
      expect(files['/test.txt']).toBe('External');
    });
  });

  describe('getHistory', () => {
    it('should return commit history for specific file', async () => {
      const path = '/history.txt';
      
      await gitRepo.createCommit('First', [
        { type: 'modify', path, content: 'v1' }
      ]);
      
      await gitRepo.createCommit('Second', [
        { type: 'modify', path, content: 'v2' }
      ]);

      const history = await gitRepo.getHistory(path);
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Second');
      expect(history[1].message).toBe('First');
    });
  });

  describe('checkout', () => {
    it('should restore files to specified commit state', async () => {
      const path = '/checkout.txt';
      
      await gitRepo.createCommit('First', [
        { type: 'modify', path, content: 'v1' }
      ]);
      
      const firstCommit = (await gitRepo.getHistory())[0].hash;
      
      await gitRepo.createCommit('Second', [
        { type: 'modify', path, content: 'v2' }
      ]);

      await gitRepo.checkout(firstCommit);
      const files = await gitRepo.getFilesAtCommit('HEAD');
      
      expect(files[path]).toBe('v1');
    });
  });
});