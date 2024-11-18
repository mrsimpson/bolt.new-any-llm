import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useCallback, useEffect, useRef } from 'react';
import type { UploadedFile } from '~/lib/stores/files';
import { workbenchStore } from '~/lib/stores/workbench';

export function useFileUploads(
  messages: Message[],
  storeMessageHistory: (messages: Message[]) => Promise<void>,
  parseMessages: (messages: Message[], isLoading: boolean) => void
) {
  const uploadedFiles = useStore(workbenchStore.uploadedFiles);
  const processedFiles = useRef(new Set<string>());

  const processNewUploads = useCallback(async () => {
    const newFiles = uploadedFiles.filter(file => !processedFiles.current.has(file.id));

    if (newFiles.length === 0) return;

    const newMessages: Message[] = newFiles.map((file: UploadedFile) => ({
      id: file.id,
      role: 'assistant',
      content: `File Added: ${file.path} <boltArtifact id="${file.id}" title="${file.path}">\n  <boltAction type="file" filePath="${file.path}">\n    ${file.content}\n  �\n</boltArtifact>`,
      createdAt: Date.now()
    }));

    newFiles.forEach(file => processedFiles.current.add(file.id));

    messages.push(...newMessages);
    await storeMessageHistory(messages);
    parseMessages(messages, false);
  }, [uploadedFiles, messages, storeMessageHistory, parseMessages]);

  useEffect(() => {
    processNewUploads();
  }, [uploadedFiles]);

  return { processNewUploads };
}
