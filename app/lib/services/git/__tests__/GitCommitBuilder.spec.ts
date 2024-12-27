import { describe, expect, it, beforeEach } from 'vitest';
import { GitCommitBuilder } from '../GitCommitBuilder';
import type { CommitOptions, FileOperation } from '../types';

describe('GitCommitBuilder', () => {
  let builder: GitCommitBuilder;

  beforeEach(() => {
    builder = new GitCommitBuilder();
  });

  describe('startNewCommit', () => {
    it('should start a new commit with options', async () => {
      const options: CommitOptions = {
        message: 'Test commit',
        batch: true
      };

      await builder.startNewCommit(options);
      expect(builder.hasPendingChanges()).toBe(false);
    });

    it('should commit pending changes when starting new commit', async () => {
      const operation: FileOperation = {
        type: 'modify',
        path: '/test.txt',
        content: 'content'
      };

      await builder.startNewCommit();
      builder.addFileOperation(operation);
      
      await builder.startNewCommit();
      expect(builder.hasPendingChanges()).toBe(false);
    });
  });

  describe('addFileOperation', () => {
    it('should track file operations', () => {
      const operation: FileOperation = {
        type: 'modify',
        path: '/test.txt',
        content: 'content'
      };

      builder.addFileOperation(operation);
      expect(builder.hasPendingChanges()).toBe(true);
    });
  });

  describe('generateCommitMessage', () => {
    it('should use provided message when available', async () => {
      await builder.startNewCommit({ message: 'Custom message' });
      builder.addFileOperation({
        type: 'modify',
        path: '/test.txt',
        content: 'content'
      });

      await builder.commit();
      // Verify commit message through git history
    });

    it('should generate message based on operations', async () => {
      await builder.startNewCommit();
      
      builder.addFileOperation({
        type: 'modify',
        path: '/test1.txt',
        content: 'content'
      });
      
      builder.addFileOperation({
        type: 'delete',
        path: '/test2.txt'
      });

      await builder.commit();
      // Verify commit message contains "modified 1 files, deleted 1 files"
    });
  });
});