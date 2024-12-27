import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('GitOperationQueue');

export class GitOperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async enqueue(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    
    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    logger.debug(`Processing queue with ${this.queue.length} operations`);

    try {
      while (this.queue.length > 0) {
        const operation = this.queue.shift();
        if (operation) {
          await operation();
        }
      }
    } catch (error) {
      logger.error('Error processing git operation queue', error);
      throw error;
    } finally {
      this.processing = false;
    }
  }
}