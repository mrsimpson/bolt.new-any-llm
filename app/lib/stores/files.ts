import { map, type MapStore } from 'nanostores';
import type { FileManager } from '~/lib/services/FileManager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('FilesStore');

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;
export type FileMap = Record<string, Dirent | undefined>;

export class FilesStore {
  #fileManager: FileManager;
  #size = 0;
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map();
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({});

  get filesCount() {
    return this.#size;
  }

  constructor(fileManager: FileManager) {
    this.#fileManager = fileManager;

    if (import.meta.hot) {
      import.meta.hot.data.files = this.files;
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles;
    }

    this.#fileManager.fileChangeEvents.subscribe(this.handleFileChange.bind(this));
  }

  private handleFileChange(event: any) {
    if (!event) return;

    const { type, path, content } = event;

    switch (type) {
      case 'modify': {
        this.#size++;
        this.files.setKey(path, { type: 'file', content, isBinary: false });
        break;
      }
      case 'delete': {
        this.#size--;
        this.files.setKey(path, undefined);
        break;
      }
    }
  }

  async saveFile(filePath: string, content: string) {
    try {
      const oldContent = this.getFile(filePath)?.content;

      if (!oldContent) {
        throw new Error('Expected content to be defined');
      }

      await this.#fileManager.writeFile(filePath, content);

      if (!this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.set(filePath, oldContent);
      }

      logger.info('File updated');
    } catch (error) {
      logger.error('Failed to update file content\n\n', error);
      throw error;
    }
  }

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath];
    return dirent?.type === 'file' ? dirent : undefined;
  }

  getFileModifications() {
    return this.#modifiedFiles.size > 0 ? this.#modifiedFiles : undefined;
  }

  resetFileModifications() {
    this.#modifiedFiles.clear();
  }
}