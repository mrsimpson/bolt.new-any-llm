import FS from '@isomorphic-git/lightning-fs';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('FSCache');

export interface FSCacheOptions {
  wipe?: boolean;
  persist?: boolean;
}

export class FSCache {
  private fs: typeof FS;
  private ready: Promise<void>;

  constructor(private name: string = 'bolt-fs', options: FSCacheOptions = {}) {
    this.fs = new FS(name, options);
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.fs.promises.mkdir('/');
    } catch (err) {
      if ((err as any).code !== 'EEXIST') {
        throw err;
      }
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.ready;
    try {
      await this.ensureDir(path);
      await this.fs.promises.writeFile(path, content, 'utf8');
      logger.debug(`Cached file written: ${path}`);
    } catch (error) {
      logger.error(`Failed to write to cache: ${path}`, error);
      throw error;
    }
  }

  async readFile(path: string): Promise<string | null> {
    await this.ready;
    try {
      const content = await this.fs.promises.readFile(path, 'utf8');
      return content;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      logger.error(`Failed to read from cache: ${path}`, error);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    await this.ready;
    try {
      await this.fs.promises.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async delete(path: string): Promise<void> {
    await this.ready;
    try {
      await this.fs.promises.unlink(path);
      logger.debug(`Cached file deleted: ${path}`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error(`Failed to delete from cache: ${path}`, error);
        throw error;
      }
    }
  }

  private async ensureDir(filePath: string): Promise<void> {
    const dir = filePath.split('/').slice(0, -1).join('/');
    if (!dir) return;

    try {
      await this.fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}