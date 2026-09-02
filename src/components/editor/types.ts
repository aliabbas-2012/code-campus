export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error';

export interface OpenTab {
  fileId: string;
  name: string;
  content: string;
  lastSavedContent: string;
  lastKnownUpdatedAt: string;
  saveStatus: SaveStatus;
  errorMessage?: string;
}
