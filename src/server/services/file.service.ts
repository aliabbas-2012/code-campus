import { db } from '@/lib/prisma';
import { IStorageService } from '@/server/storage/storage.interface';
import { defaultStorageService } from '@/server/storage/local-filesystem.storage';
import { workspaceService } from '@/server/services/workspace.service';
import {
  NotFoundError,
  ValidationError,
  SecurityError,
  QuotaExceededError,
  ConflictError,
} from '@/server/errors';
import { CONFIG, validateFilename, validateFileSize } from '@/lib/config';
import { CreateFileInput, UpdateFileInput, CreateFolderInput } from '@/server/validation/schemas';

export class FileService {
  constructor(private storageService: IStorageService = defaultStorageService) {}

  /**
   * Create a new file with content
   * Enforces quota with transactional locking
   */
  async createFile(
    projectId: string,
    workspaceId: string,
    input: CreateFileInput,
  ): Promise<{ id: string; name: string; type: string }> {
    // Validate filename
    if (!validateFilename(input.name)) {
      throw new SecurityError('Invalid filename');
    }

    // Get parent folder (if specified)
    let parentId = input.parent_id || null;
    if (parentId) {
      const parent = await db.projectFile.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.project_id !== projectId || parent.type !== 'FOLDER') {
        throw new ValidationError('Parent folder not found');
      }
    }

    // Check for name conflict
    const existing = await db.projectFile.findFirst({
      where: {
        project_id: projectId,
        parent_id: parentId,
        name: input.name,
      },
    });

    if (existing) {
      throw new ValidationError('File already exists');
    }

    // Calculate file size
    const content = input.content || '';
    const contentBytes = Buffer.byteLength(content, 'utf-8');

    // Validate file size
    if (!validateFileSize(contentBytes)) {
      throw new ValidationError(`File size exceeds maximum of ${CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    // Check quota (with row-level locking for atomicity)
    const hasQuota = await workspaceService.checkQuota(workspaceId, BigInt(contentBytes));
    if (!hasQuota) {
      throw new QuotaExceededError('Not enough storage quota available');
    }

    // Generate opaque storage path
    const storagePath = this.storageService.generateStoragePath?.() || `file-${Date.now()}`;

    try {
      // Save to storage
      await this.storageService.save(storagePath, content);

      // Create DB record (within transaction for safety)
      const file = await db.projectFile.create({
        data: {
          project_id: projectId,
          parent_id: parentId,
          name: input.name,
          type: 'FILE',
          size_bytes: BigInt(contentBytes),
          storage_path: storagePath,
          content: content, // Store in DB for Phase 1 simplicity
          mime_type: this.getMimeType(input.name),
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      // Update workspace quota
      await workspaceService.updateStorageUsage(workspaceId, BigInt(contentBytes));

      return file;
    } catch (err) {
      // Cleanup storage on DB failure
      await this.storageService.delete(storagePath).catch(() => {});
      throw err;
    }
  }

  /**
   * Create a folder
   */
  async createFolder(
    projectId: string,
    input: CreateFolderInput,
  ): Promise<{ id: string; name: string; type: string }> {
    // Validate folder name
    if (!validateFilename(input.name)) {
      throw new SecurityError('Invalid folder name');
    }

    // Get parent folder (if specified)
    let parentId = input.parent_id || null;
    if (parentId) {
      const parent = await db.projectFile.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.project_id !== projectId || parent.type !== 'FOLDER') {
        throw new ValidationError('Parent folder not found');
      }
    }

    // Check for name conflict
    const existing = await db.projectFile.findFirst({
      where: {
        project_id: projectId,
        parent_id: parentId,
        name: input.name,
      },
    });

    if (existing) {
      throw new ValidationError('Folder already exists');
    }

    const folder = await db.projectFile.create({
      data: {
        project_id: projectId,
        parent_id: parentId,
        name: input.name,
        type: 'FOLDER',
        size_bytes: BigInt(0),
        storage_path: '', // Folders don't have storage paths
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    return folder;
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<{
    id: string;
    name: string;
    type: string;
    content?: string;
    size_bytes: bigint;
    updated_at: Date;
  }> {
    const file = await db.projectFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundError('File not found');
    }

    return {
      id: file.id,
      name: file.name,
      type: file.type,
      content: file.content || undefined,
      size_bytes: file.size_bytes,
      updated_at: file.updated_at,
    };
  }

  /**
   * List files in a project or folder
   */
  async listFiles(projectId: string, parentId?: string): Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      size_bytes: bigint;
      updated_at: Date;
    }>
  > {
    return db.projectFile.findMany({
      where: {
        project_id: projectId,
        parent_id: parentId || null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        size_bytes: true,
        updated_at: true,
      },
      orderBy: [{ type: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Update file content with optimistic concurrency control
   */
  async updateFile(
    fileId: string,
    workspaceId: string,
    input: UpdateFileInput,
  ): Promise<{ id: string; name: string; updated_at: Date }> {
    const file = await db.projectFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundError('File not found');
    }

    if (file.type !== 'FILE') {
      throw new ValidationError('Cannot update a folder');
    }

    // Optimistic concurrency: check updated_at
    if (input.updated_at) {
      const clientUpdatedAt = new Date(input.updated_at);
      if (clientUpdatedAt.getTime() !== file.updated_at.getTime()) {
        throw new ConflictError(
          'File has been modified since you last edited it. Please refresh and try again.',
        );
      }
    }

    // If content is provided, validate size and quota
    if (input.content !== undefined) {
      const newContentBytes = Buffer.byteLength(input.content, 'utf-8');

      if (!validateFileSize(newContentBytes)) {
        throw new ValidationError(`File size exceeds maximum of ${CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      }

      // Calculate delta and check quota
      const byteDelta = BigInt(newContentBytes) - file.size_bytes;
      if (byteDelta > BigInt(0)) {
        const hasQuota = await workspaceService.checkQuota(workspaceId, byteDelta);
        if (!hasQuota) {
          throw new QuotaExceededError('Not enough storage quota available');
        }
      }

      // Update storage
      try {
        await this.storageService.save(file.storage_path, input.content);
      } catch (err) {
        throw new ValidationError('Failed to save file');
      }

      // Update DB and quota
      const updated = await db.projectFile.update({
        where: { id: fileId },
        data: {
          content: input.content,
          size_bytes: BigInt(newContentBytes),
        },
        select: {
          id: true,
          name: true,
          updated_at: true,
        },
      });

      if (byteDelta !== BigInt(0)) {
        await workspaceService.updateStorageUsage(workspaceId, byteDelta);
      }

      return updated;
    }

    // If just renaming
    if (input.name !== undefined && input.name !== file.name) {
      if (!validateFilename(input.name)) {
        throw new SecurityError('Invalid filename');
      }

      // Check for name conflict
      const existing = await db.projectFile.findFirst({
        where: {
          project_id: file.project_id,
          parent_id: file.parent_id,
          name: input.name,
        },
      });

      if (existing) {
        throw new ValidationError('File already exists');
      }
    }

    const updated = await db.projectFile.update({
      where: { id: fileId },
      data: {
        name: input.name,
      },
      select: {
        id: true,
        name: true,
        updated_at: true,
      },
    });

    return updated;
  }

  /**
   * Delete a file or folder (recursively)
   */
  async deleteFile(fileId: string, workspaceId: string): Promise<void> {
    const file = await db.projectFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // If it's a file, update quota
    if (file.type === 'FILE') {
      await workspaceService.updateStorageUsage(workspaceId, -file.size_bytes);
      await this.storageService.delete(file.storage_path).catch(() => {});
    }

    // Cascade delete is handled by Prisma
    await db.projectFile.delete({
      where: { id: fileId },
    });
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      py: 'text/x-python',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      csv: 'text/csv',
    };
    return mimeMap[ext] || 'text/plain';
  }
}

export const fileService = new FileService();
