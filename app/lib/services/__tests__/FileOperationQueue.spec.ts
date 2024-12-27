import { describe, expect, it, vi } from 'vitest';
import { FileOperationQueue } from '../FileOperationQueue';

describe('FileOperationQueue', () => {
  it('should process operations in order', async () => {
    const queue = new FileOperationQueue();
    const results: number[] = [];

    await Promise.all([
      queue.enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(1);
      }),
      queue.enqueue(async () => {
        results.push(2);
      }),
      queue.enqueue(async () => {
        results.push(3);
      })
    ]);

    expect(results).toEqual([1, 2, 3]);
  });

  it('should handle operation failures without blocking the queue', async () => {
    const queue = new FileOperationQueue();
    const results: string[] = [];
    const error = new Error('Operation failed');

    await Promise.allSettled([
      queue.enqueue(async () => {
        results.push('first');
      }),
      queue.enqueue(async () => {
        throw error;
      }),
      queue.enqueue(async () => {
        results.push('third');
      })
    ]);

    expect(results).toEqual(['first', 'third']);
  });

  it('should process new operations after failure', async () => {
    const queue = new FileOperationQueue();
    const results: string[] = [];

    await Promise.allSettled([
      queue.enqueue(async () => {
        throw new Error('Failed');
      })
    ]);

    await queue.enqueue(async () => {
      results.push('success');
    });

    expect(results).toEqual(['success']);
  });
});