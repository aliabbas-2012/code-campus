export interface Project {
  id: string;
  name: string;
  description: string | null;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'FILE' | 'FOLDER';
  parent_id: string | null;
  size_bytes: number;
  updated_at: string;
}

export interface FileWithContent {
  id: string;
  name: string;
  type: 'FILE' | 'FOLDER';
  content?: string;
  size_bytes: number;
  updated_at: string;
}

export interface StorageInfo {
  quota_bytes: number;
  used_bytes: number;
  available_bytes: number;
  percent_used: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateFileInput {
  name: string;
  parent_id?: string | null;
  content?: string;
}

export interface CreateFolderInput {
  name: string;
  parent_id?: string | null;
}

export interface UpdateFileInput {
  name?: string;
  content?: string;
  updated_at?: string;
}

export interface UpdateFileResult {
  id: string;
  name: string;
  updated_at: string;
}

export interface CreatedFile {
  id: string;
  name: string;
  type: 'FILE' | 'FOLDER';
}
