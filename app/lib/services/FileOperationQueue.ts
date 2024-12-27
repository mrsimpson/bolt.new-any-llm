export class FileOperationQueue {
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

    try {
      while (this.queue.length > 0) {
        const operation = this.queue.shift();
        if (operation) {
          await operation();
        }
      }
    } finally {
      this.processing = false;
    }
  }
}