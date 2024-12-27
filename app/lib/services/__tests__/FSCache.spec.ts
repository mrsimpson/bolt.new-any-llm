import { describe, expect, it, beforeEach, vi } from 'vitest';
import { FSCache } from '../FSCache';

describe('FSCache', () => {
  let fsCache: FSCache;

  beforeEach(() => {
    fsCache = new FSCache('test-fs', { persist: false });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      const path = '/test.txt';
      const content = 'Hello World';

      await fsCache.writeFile(path, content);
      const result = await fsCache.readFile(path);

      expect(result).toBe(content);
    });

    it('should create directories recursively when writing files', async () => {
      const path = '/deep/nested/test.txt';
      const content = 'Nested content';

      await fsCache.writeFile(path, content);
      const result = await fsCache.readFile(path);

      expect(result).toBe(content);
    });
  });

  describe('readFile', () => {
    it('should return null for non-existent files', async () => {
      const result = await fsCache.readFile('/nonexistent.txt');
      expect(result).toBeNull();
    });

    it('should read previously written content', async () => {
      const path = '/read-test.txt';
      const content = 'Test content';

      await fsCache.writeFile(path, content);
      const result = await fsCache.readFile(path);

      expect(result).toBe(content);
    });
  });

  describe('exists', () => {
    it('should return true for existing files', async () => {
      const path = '/exists.txt';
      await fsCache.writeFile(path, 'content');

      const result = await fsCache.exists(path);
      expect(result).toBe(true);
    });

    it('should return false for non-existent files', async () => {
      const result = await fsCache.exists('/nonexistent.txt');
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing files', async () => {
      const path = '/delete-test.txt';
      await fsCache.writeFile(path, 'content');

      await fsCache.delete(path);
      const exists = await fsCache.exists(path);

      expect(exists).toBe(false);
    });

    it('should not throw when deleting non-existent files', async () => {
      await expect(fsCache.delete('/nonexistent.txt')).resolves.not.toThrow();
    });
  });
});