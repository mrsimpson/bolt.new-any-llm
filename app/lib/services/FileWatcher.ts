import type { PathWatcherEvent, WebContainer } from '@webcontainer/api';
import { bufferWatchEvents } from '~/utils/buffer';
import { WORK_DIR } from '~/utils/constants';

export class FileWatcher {
  constructor(
    private webcontainer: WebContainer,
    private onChange: (path: string, type: 'create' | 'modify' | 'delete', content?: string) => void
  ) {
    this.initializeWatcher();
  }

  private async initializeWatcher() {
    this.webcontainer.internal.watchPaths(
      { 
        include: [`${WORK_DIR}/**`], 
        exclude: ['**/node_modules', '.git'], 
        includeContent: true 
      },
      bufferWatchEvents(100, this.handleEvents.bind(this))
    );
  }

  private handleEvents(events: Array<[events: PathWatcherEvent[]]>) {
    const watchEvents = events.flat(2);

    for (const { type, path, buffer } of watchEvents) {
      switch (type) {
        case 'add_file':
        case 'change': {
          const content = buffer ? new TextDecoder().decode(buffer) : undefined;
          this.onChange(path, 'modify', content);
          break;
        }
        case 'remove_file': {
          this.onChange(path, 'delete');
          break;
        }
      }
    }
  }
}