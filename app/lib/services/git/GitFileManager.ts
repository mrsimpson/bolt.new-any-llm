import { createScopedLogger } from '~/utils/logger';
import type { FileManager } from '../FileManager';
import { GitOperationQueue } from './GitOperationQueue';
import { GitRepository } from './GitRepository';
import { GitCommitBuilder } from './GitCommitBuilder';
import type { CommitOptions, FileOperation } from './types';

const logger = createScopedLogger('GitFileManager');

export class GitFileManager {
  private gitRepo: GitRepository;
  private operationQueue: GitOperationQueue;
  private commitBuilder: GitCommitBuilder;

  constructor(private fileManager: FileManager) {
    this.gitRepo = new GitRepository();
    this.operationQueue = new GitOperationQueue();
    this.commitBuilder = new GitCommitBuilder();

    // Subscribe to file changes
    this.fileManager.fileChangeEvents.subscribe(this.handleFileChange.bind(this));
  }

  async writeFile(path: string, content: string, options?: CommitOptions): Promise<void> {
    await this.operationQueue.enqueue(async () => {
      // Write file through FileManager
      await this.fileManager.writeFile(path, content);

      // Create commit for the change
      if (!this.commitBuilder.hasPendingChanges()) {
        await this.commitBuilder.startNewCommit(options);
      }

      this.commitBuilder.addFileOperation({
        type: 'modify',
        path,
        content
      });

      if (!options?.batch) {
        await this.commitBuilder.commit();
      }
    });
  }

  async deleteFile(path: string, options?: CommitOptions): Promise<void> {
    await this.operationQueue.enqueue(async () => {
      await this.fileManager.deleteFile(path);

      if (!this.commitBuilder.hasPendingChanges()) {
        await this.commitBuilder.startNewCommit(options);
      }

      this.commitBuilder.addFileOperation({
        type: 'delete',
        path
      });

      if (!options?.batch) {
        await this.commitBuilder.commit();
      }
    });
  }

  async startBatch(options?: CommitOptions): Promise<void> {
    await this.commitBuilder.startNewCommit(options);
  }

  async commitBatch(): Promise<void> {
    await this.commitBuilder.commit();
  }

  async rollback(commitHash: string): Promise<void> {
    await this.operationQueue.enqueue(async () => {
      const files = await this.gitRepo.getFilesAtCommit(commitHash);
      
      for (const [path, content] of Object.entries(files)) {
        await this.fileManager.writeFile(path, content);
      }

      await this.gitRepo.checkout(commitHash);
    });
  }

  async getHistory(path?: string): Promise<Array<{ hash: string; message: string; timestamp: number }>> {
    return this.gitRepo.getHistory(path);
  }

  private async handleFileChange(event: FileOperation | null): Promise<void> {
    if (!event) return;

    // Handle external changes by creating a merge commit
    if (event.source === 'external') {
      await this.operationQueue.enqueue(async () => {
        await this.gitRepo.createMergeCommit(
          'External changes detected',
          [event]
        );
      });
    }
  }
}