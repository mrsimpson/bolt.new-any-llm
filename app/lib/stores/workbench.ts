import { atom, map, type MapStore, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { ActionCallbackData, ArtifactCallbackData } from '~/lib/runtime/message-parser';
import { webcontainer } from '~/lib/webcontainer';
import type { ITerminal } from '~/types/terminal';
import { unreachable } from '~/utils/unreachable';
import { EditorStore } from './editor';
import { FilesStore, type FileMap } from './files';
import { PreviewsStore } from './previews';
import { TerminalStore } from './terminal';
import { FileManager } from '~/lib/services/FileManager';
import { GitFileManager } from '~/lib/services/git/GitFileManager';
import { createSampler } from '~/utils/sampler';
import type { ActionAlert } from '~/types/actions';
import { description } from '~/lib/persistence';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Octokit } from '@octokit/rest';
import Cookies from 'js-cookie';
import { extractRelativePath } from '~/utils/diff';

export interface ArtifactState {
  id: string;
  title: string;
  type?: string;
  closed: boolean;
  runner: ActionRunner;
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>;
export type WorkbenchViewType = 'code' | 'preview';

export class WorkbenchStore {
  #previewsStore = new PreviewsStore(webcontainer);
  #fileManager: FileManager;
  #gitFileManager: GitFileManager;
  #filesStore: FilesStore;
  #editorStore: EditorStore;
  #terminalStore = new TerminalStore(webcontainer);
  #reloadedMessages = new Set<string>();

  artifacts: MapStore<Record<string, ArtifactState>> = import.meta.hot?.data.artifacts ?? map({});
  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false);
  currentView: WritableAtom<WorkbenchViewType> = import.meta.hot?.data.currentView ?? atom('code');
  unsavedFiles: WritableAtom<Set<string>> = import.meta.hot?.data.unsavedFiles ?? atom(new Set<string>());
  actionAlert: WritableAtom<ActionAlert | undefined> = import.meta.hot?.data.actionAlert ?? atom<ActionAlert | undefined>(undefined);
  
  artifactIdList: string[] = [];
  #globalExecutionQueue = Promise.resolve();

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.artifacts = this.artifacts;
      import.meta.hot.data.unsavedFiles = this.unsavedFiles;
      import.meta.hot.data.showWorkbench = this.showWorkbench;
      import.meta.hot.data.currentView = this.currentView;
      import.meta.hot.data.actionAlert = this.actionAlert;
    }

    this.initialize();
  }

  private async initialize() {
    this.#fileManager = new FileManager(await webcontainer);
    this.#gitFileManager = new GitFileManager(this.#fileManager);
    this.#filesStore = new FilesStore(this.#fileManager);
    this.#editorStore = new EditorStore(this.#filesStore);
  }

  get previews() {
    return this.#previewsStore.previews;
  }

  get files() {
    return this.#filesStore.files;
  }

  get currentDocument(): ReadableAtom<EditorDocument | undefined> {
    return this.#editorStore.currentDocument;
  }

  get selectedFile(): ReadableAtom<string | undefined> {
    return this.#editorStore.selectedFile;
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0]);
  }

  get filesCount(): number {
    return this.#filesStore.filesCount;
  }

  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }

  get boltTerminal() {
    return this.#terminalStore.boltTerminal;
  }

  get alert() {
    return this.actionAlert;
  }

  clearAlert() {
    this.actionAlert.set(undefined);
  }

  // Rest of the class implementation remains similar but uses #gitFileManager for file operations
  // Only showing key modified methods:

  async saveFile(filePath: string) {
    const documents = this.#editorStore.documents.get();
    const document = documents[filePath];

    if (document === undefined) {
      return;
    }

    await this.#gitFileManager.writeFile(filePath, document.value, {
      message: `chore: update ${extractRelativePath(filePath)}`
    });

    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);
    this.unsavedFiles.set(newUnsavedFiles);
  }

  async saveAllFiles() {
    await this.#gitFileManager.startBatch({ message: 'chore: save all modified files' });
    
    for (const filePath of this.unsavedFiles.get()) {
      const document = this.#editorStore.documents.get()[filePath];
      if (document) {
        await this.#gitFileManager.writeFile(filePath, document.value, { batch: true });
      }
    }

    await this.#gitFileManager.commitBatch();
  }

  // ... rest of the class implementation
}

export const workbenchStore = new WorkbenchStore();