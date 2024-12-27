export interface CommitOptions {
  message?: string;
  batch?: boolean;
}

export interface FileOperation {
  type: 'modify' | 'delete';
  path: string;
  content?: string;
  source?: 'internal' | 'external';
}