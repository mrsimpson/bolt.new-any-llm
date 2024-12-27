import { describe, expect, it, beforeEach, vi } from 'vitest';
import { FileManager } from '../FileManager';
import type { WebContainer } from '@webcontainer/api';

describe('FileManager', () => {
  let fileManager: FileManager;
  let mockWebContainer: WebContainer;

  beforeEach(() => {
    mockWebContainer = {
      fs: {
        writeFile: vi.fn(),
        readFile: vi.fn(),
        unlink: vi.fn(),
      },
      internal: {
        watchPaths: vi.fn(),
      },
    } as unknown as WebContainer;

    fileManager = new FileManager(mockWebContainer);
  });

  describe('writeFile', () => {
    it('should write file and emit change event', async () => {
      const path = '/test.txt';
      const content = 'Test content';
      const changeListener = vi.fn();

      fileManager.fileChangeEvents.subscribe(changeListener);
      await fileManager.writeFile(path, content);

      expect(mockWebContainer.fs.writeFile).toHaveBeenCalledWith(path, content);
      expect(changeListener).toHaveBeenCalledWith({
        type: 'modify',
        path,
        content,
      });
    });

    it('should handle write errors', async () => {
      const error = new Error('Write failed');
      mockWebContainer.fs.writeFile.mockRejectedValue(error);

      await expect(fileManager.writeFile('/test.txt', 'content')).rejects.toThrow();
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const path = '/test.txt';
      const content = 'Test content';
      mockWebContainer.fs.readFile.mockResolvedValue(content);

      const result = await fileManager.readFile(path);

      expect(result).toBe(content);
      expect(mockWebContainer.fs.readFile).toHaveBeenCalledWith(path, 'utf-8');
    });

    it('should handle read errors', async () => {
      const error = new Error('Read failed');
      mockWebContainer.fs.readFile.mockRejectedValue(error);

      await expect(fileManager.readFile('/test.txt')).rejects.toThrow();
    });
  });

  describe('file locking', () => {
    it('should prevent writes to locked files', async () => {
      const path = '/locked.txt';
      const lockId = 'test-lock';

      await fileManager.writeFile(path, 'initial');
      await fileManager.lockFile(path, lockId);

      await expect(fileManager.writeFile(path, 'new content')).rejects.toThrow();
      await expect(fileManager.writeFile(path, 'new content', lockId)).resolves.not.toThrow();
    });

    it('should release locks correctly', async () => {
      const path = '/locked.txt';
      const lockId = 'test-lock';

      await fileManager.writeFile(path, 'initial');
      await fileManager.lockFile(path, lockId);
      await fileManager.unlockFile(path, lockId);

      await expect(fileManager.writeFile(path, 'new content')).resolves.not.toThrow();
    });
  });
});