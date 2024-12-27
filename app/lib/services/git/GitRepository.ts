import { Buffer } from 'node:buffer';
import * as git from 'isomorphic-git';
import type { FileOperation } from './types';
import { createScopedLogger } from '~/utils/logger';
import { FSCache } from '../FSCache';

const logger = createScopedLogger('GitRepository');

export class GitRepository {
  private fs: FSCache;

  constructor() {
    this.fs = new FSCache('git-fs', { persist: true });
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await git.init({ fs: this.fs as any, dir: '/' });
      logger.debug('Git repository initialized');
    } catch (error) {
      logger.error('Failed to initialize git repository', error);
      throw error;
    }
  }

  async createCommit(message: string, operations: FileOperation[]): Promise<string> {
    // Stage all changes
    for (const op of operations) {
      if (op.type === 'delete') {
        await git.remove({ fs: this.fs as any, dir: '/', filepath: op.path });
      } else {
        await git.add({ fs: this.fs as any, dir: '/', filepath: op.path });
      }
    }

    // Create commit
    const sha = await git.commit({
      fs: this.fs as any,
      dir: '/',
      message,
      author: {
        name: 'Bolt',
        email: 'bolt@stackblitz.com'
      }
    });

    return sha;
  }

  async createMergeCommit(message: string, operations: FileOperation[]): Promise<string> {
    // Create temporary branch for external changes
    const branchName = `external-${Date.now()}`;
    await git.branch({ fs: this.fs as any, dir: '/', ref: branchName });

    // Stage and commit external changes
    const sha = await this.createCommit(message, operations);

    // Merge changes back to main
    await git.merge({
      fs: this.fs as any,
      dir: '/',
      theirs: branchName,
      author: {
        name: 'Bolt',
        email: 'bolt@stackblitz.com'
      }
    });

    return sha;
  }

  async getFilesAtCommit(commitHash: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    const walk = git.TREE({ ref: commitHash });
    const entries = await git.walk({
      fs: this.fs as any,
      dir: '/',
      trees: [walk],
      map: async (filepath, [entry]) => {
        if (!entry || entry.type !== 'blob') return;
        
        const { blob } = await git.readBlob({
          fs: this.fs as any,
          dir: '/',
          oid: entry.oid
        });

        files[filepath] = Buffer.from(blob).toString('utf8');
      }
    });

    return files;
  }

  async getHistory(path?: string): Promise<Array<{ hash: string; message: string; timestamp: number }>> {
    const logs = await git.log({
      fs: this.fs as any,
      dir: '/',
      filepath: path
    });

    return logs.map(log => ({
      hash: log.oid,
      message: log.commit.message,
      timestamp: log.commit.author.timestamp * 1000
    }));
  }

  async checkout(commitHash: string): Promise<void> {
    await git.checkout({
      fs: this.fs as any,
      dir: '/',
      ref: commitHash
    });
  }
}