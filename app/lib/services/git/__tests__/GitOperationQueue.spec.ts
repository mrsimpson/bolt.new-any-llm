import { describe, expect, it, vi } from 'vitest';
import { GitOperationQueue } from '../GitOperationQueue';

describe('GitOperationQueue', () => {
  it('should process operations sequentially', async () => {
    const queue = new GitOperationQueue();
    const results: number[] = [];

    await Promise.all([
      queue.enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(1);
      }),
      queue.enqueue(async () => {
        results.push(2);
      })
    ]);

    expect(results).toEqual([1, 2]);
  });

  it('should handle operation failures', async () => {
    const queue = new GitOperationQueue();
    const results: string[] = [];
    const error = new Error('Git operation failed');

    await expect(Promise.allSettled([
      queue.enqueue(async () => {
        results.push('first');
      }),
      queue.enqueue(async () => {
        throw error;
      }),
      queue.enqueue(async () => {
        results.push('third');
      })
    ])).resolves.toBeDefined();

    expect(results).toEqual(['first', 'third']);
  });

  it('should process new operations after queue is cleared', async () => {
    const queue = new GitOperationQueue();
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