import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GitFileManager } from '../GitFileManager';
import type { FileManager } from '../../FileManager';

describe('GitFileManager', () => {
  let gitFileManager: GitFileManager;
  let mockFileManager: FileManager;

  beforeEach(() => {
    mockFileManager = {
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      fileChangeEvents: {
        subscribe: vi.fn(),
      },
    } as unknown as FileManager;

    gitFileManager = new GitFileManager(mockFileManager);
  });

  describe('writeFile', () => {
    it('should create a commit for single file changes', async () => {
      const path = '/test.txt';
      const content = 'Test content';

      await gitFileManager.writeFile(path, content);

      expect(mockFileManager.writeFile).toHaveBeenCalledWith(path, content);
      // Verify commit was created
      const history = await gitFileManager.getHistory(path);
      expect(history).toHaveLength(1);
      expect(history[0].message).toContain('modified 1 files');
    });

    it('should batch multiple changes in a single commit', async () => {
      await gitFileManager.startBatch({ message: 'Batch changes' });
      
      await gitFileManager.writeFile('/file1.txt', 'content 1');
      await gitFileManager.writeFile('/file2.txt', 'content 2');
      
      await gitFileManager.commitBatch();

      const history = await gitFileManager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Batch changes');
    });
  });

  describe('rollback', () => {
    it('should restore files to a previous commit state', async () => {
      const path = '/test.txt';
      const originalContent = 'Original content';
      const newContent = 'New content';

      await gitFileManager.writeFile(path, originalContent);
      const firstCommit = (await gitFileManager.getHistory())[0].hash;
      
      await gitFileManager.writeFile(path, newContent);
      
      await gitFileManager.rollback(firstCommit);

      expect(mockFileManager.writeFile).toHaveBeenLastCalledWith(path, originalContent);
    });
  });

  describe('external changes', () => {
    it('should handle external file modifications', async () => {
      const mockSubscribe = mockFileManager.fileChangeEvents.subscribe;
      let subscribedCallback: (event: any) => void;

      mockSubscribe.mockImplementation((callback) => {
        subscribedCallback = callback;
      });

      // Simulate external file change
      subscribedCallback({
        type: 'modify',
        path: '/external.txt',
        content: 'External content',
        source: 'external'
      });

      const history = await gitFileManager.getHistory();
      expect(history[0].message).toBe('External changes detected');
    });
  });
});