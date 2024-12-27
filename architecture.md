# Bolt.diy Architecture

[Previous content remains the same until FileManager section, which is updated to:]

### FileManager Service with LightningFS
- **Responsibilities**
  - Provide centralized file operations
  - Manage file synchronization
  - Handle file locking and atomic operations
  - Track file modifications
  - Manage file metadata
  - Provide consistent error handling
  - Cache file operations using LightningFS

- **Interactions**
  - Acts as single source of truth for file operations
  - Coordinates between WebContainer and UI components
  - Emits file change events
  - Manages file operation queues
  - Syncs with LightningFS cache

- **Benefits**
  - All previous benefits, plus:
  - Improved performance through local caching
  - Offline capabilities for file operations
  - Better memory management
  - Reduced WebContainer I/O operations
  - Faster file access for UI components
  - Built-in indexing and search capabilities
  - Persistent file cache across sessions
  - Reduced network traffic with WebContainer
  - Better handling of large files
  - Improved conflict resolution

- **Key Files**
  - `app/lib/services/FileManager.ts`
  - `app/lib/services/FileOperationQueue.ts`
  - `app/lib/services/FileWatcher.ts`
  - `app/lib/services/FSCache.ts`

[Rest of the document remains the same]