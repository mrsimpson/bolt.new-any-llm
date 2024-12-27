import type { WebContainer } from '@webcontainer/api';
import { atom, map } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';
import { FileOperationQueue } from './FileOperationQueue';
import { FileWatcher } from './FileWatcher';
import { FSCache } from './FSCache';

const logger = createScopedLogger('FileManager');

export interface FileContent {
  content: string;
  isBinary: boolean;
}

export interface FileMetadata {
  lastModified: number;
  locked: boolean;
  lockHolder?: string;
  hash?: string;
}

export type FileChangeEvent = {
  type: 'create' | 'modify' | 'delete';
  path: string;
  content?: string;
};

export class FileOperationError extends Error {
  constructor(
    public operation: string,
    public path: string,
    public originalError: unknown
  ) {
    super(`File operation '${operation}' failed for '${path}'`);
  }
}

export class FileManager {
  private files = map<Record<string, FileContent>>({});
  private metadata = map<Record<string, FileMetadata>>({});
  private operationQueue: FileOperationQueue;
  private fileWatcher: FileWatcher;
  private fsCache: FSCache;
  
  public readonly fileChangeEvents = atom<FileChangeEvent | null>(null);

  constructor(private webcontainer: WebContainer) {
    this.operationQueue = new FileOperationQueue();
    this.fileWatcher = new FileWatcher(webcontainer, this.handleFileChange.bind(this));
    this.fsCache = new FSCache('bolt-fs', { persist: true });
  }

  async writeFile(path: string, content: string, lockId?: string): Promise<void> {
    await this.operationQueue.enqueue(async () => {
      try {
        if (!this.canModifyFile(path, lockId)) {
          throw new FileOperationError('write', path, new Error('File is locked'));
        }

        // Write to cache first
        await this.fsCache.writeFile(path, content);

        // Then write to WebContainer
        await this.webcontainer.fs.writeFile(path, content);
        
        this.files.setKey(path, {
          content,
          isBinary: false
        });
        
        this.metadata.setKey(path, {
          lastModified: Date.now(),
          locked: false
        });

        this.fileChangeEvents.set({
          type: 'modify',
          path,
          content
        });

      } catch (error) {
        logger.error(`Failed to write file ${path}`, error);
        throw new FileOperationError('write', path, error);
      }
    });
  }

  async readFile(path: string): Promise<string> {
    try {
      // Try cache first
      const cachedContent = await this.fsCache.readFile(path);
      if (cachedContent !== null) {
        return cachedContent;
      }

      // Fall back to WebContainer
      const content = await this.webcontainer.fs.readFile(path, 'utf-8');
      
      // Cache the content
      await this.fsCache.writeFile(path, content);
      
      this.files.setKey(path, {
        content,
        isBinary: false
      });

      return content;
    } catch (error) {
      throw new FileOperationError('read', path, error);
    }
  }

  async deleteFile(path: string, lockId?: string): Promise<void> {
    await this.operationQueue.enqueue(async () => {
      try {
        if (!this.canModifyFile(path, lockId)) {
          throw new FileOperationError('delete', path, new Error('File is locked'));
        }

        await this.webcontainer.fs.rm(path);
        await this.fsCache.delete(path);
        
        this.files.setKey(path, undefined);
        this.metadata.setKey(path, undefined);

        this.fileChangeEvents.set({
          type: 'delete',
          path
        });
      } catch (error) {
        throw new FileOperationError('delete', path, error);
      }
    });
  }

  async lockFile(path: string, lockId: string): Promise<void> {
    this.metadata.setKey(path, {
      ...this.metadata.get()[path],
      locked: true,
      lockHolder: lockId
    });
  }

  async unlockFile(path: string, lockId: string): Promise<void> {
    const meta = this.metadata.get()[path];
    if (meta?.lockHolder === lockId) {
      this.metadata.setKey(path, {
        ...meta,
        locked: false,
        lockHolder: undefined
      });
    }
  }

  private canModifyFile(path: string, lockId?: string): boolean {
    const meta = this.metadata.get()[path];
    return !meta?.locked || meta.lockHolder === lockId;
  }

  private handleFileChange(path: string, type: 'create' | 'modify' | 'delete', content?: string) {
    this.fileChangeEvents.set({ type, path, content });
  }
}