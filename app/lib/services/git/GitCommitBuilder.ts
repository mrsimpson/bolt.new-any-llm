import type { CommitOptions, FileOperation } from './types';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('GitCommitBuilder');

export class GitCommitBuilder {
  private pendingOperations: FileOperation[] = [];
  private currentOptions?: CommitOptions;

  async startNewCommit(options?: CommitOptions): Promise<void> {
    if (this.hasPendingChanges()) {
      await this.commit();
    }
    
    this.currentOptions = options;
    this.pendingOperations = [];
  }

  addFileOperation(operation: FileOperation): void {
    this.pendingOperations.push(operation);
  }

  hasPendingChanges(): boolean {
    return this.pendingOperations.length > 0;
  }

  async commit(): Promise<void> {
    if (!this.hasPendingChanges()) {
      return;
    }

    try {
      const message = this.generateCommitMessage();
      // Commit logic will be implemented here
      this.pendingOperations = [];
      this.currentOptions = undefined;
    } catch (error) {
      logger.error('Failed to create commit', error);
      throw error;
    }
  }

  private generateCommitMessage(): string {
    const { message } = this.currentOptions || {};
    if (message) return message;

    const operations = this.pendingOperations.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts = [];
    if (operations.modify) parts.push(`modified ${operations.modify} files`);
    if (operations.delete) parts.push(`deleted ${operations.delete} files`);
    
    return `chore: ${parts.join(', ')}`;
  }
}