import { describe, expect, it, vi } from 'vitest';
import { FileWatcher } from '../FileWatcher';
import type { WebContainer } from '@webcontainer/api';

describe('FileWatcher', () => {
  it('should initialize watcher with correct options', () => {
    const mockWebContainer = {
      internal: {
        watchPaths: vi.fn()
      }
    } as unknown as WebContainer;

    const onChange = vi.fn();
    new FileWatcher(mockWebContainer, onChange);

    expect(mockWebContainer.internal.watchPaths).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining(['/home/project/**']),
        exclude: expect.arrayContaining(['**/node_modules', '.git']),
        includeContent: true
      }),
      expect.any(Function)
    );
  });

  it('should handle file modification events', () => {
    const mockWebContainer = {
      internal: {
        watchPaths: vi.fn()
      }
    } as unknown as WebContainer;

    const onChange = vi.fn();
    const watcher = new FileWatcher(mockWebContainer, onChange);

    const watchCallback = mockWebContainer.internal.watchPaths.mock.calls[0][1];
    const events = [[{
      type: 'change',
      path: '/test.txt',
      buffer: new TextEncoder().encode('content')
    }]];

    watchCallback(events);

    expect(onChange).toHaveBeenCalledWith(
      '/test.txt',
      'modify',
      'content'
    );
  });

  it('should handle file deletion events', () => {
    const mockWebContainer = {
      internal: {
        watchPaths: vi.fn()
      }
    } as unknown as WebContainer;

    const onChange = vi.fn();
    const watcher = new FileWatcher(mockWebContainer, onChange);

    const watchCallback = mockWebContainer.internal.watchPaths.mock.calls[0][1];
    const events = [[{
      type: 'remove_file',
      path: '/test.txt'
    }]];

    watchCallback(events);

    expect(onChange).toHaveBeenCalledWith(
      '/test.txt',
      'delete',
      undefined
    );
  });
});