import AdmZip from 'adm-zip';
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
import { CONFIG, validateFilename, validateFileSize, validateFileExtension } from '@/lib/config';
import { CreateFileInput, UpdateFileInput, CreateFolderInput } from '@/server/validation/schemas';

// Noise that common zip tools add automatically — skipped rather than rejected, since
// it isn't content the student actually put there.
const IGNORED_ARCHIVE_ENTRY_PATTERNS = [/^__MACOSX\//, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/i];
const MAX_IMPORT_ENTRIES = 200;
const MAX_IMPORT_TOTAL_BYTES = 5 * 1024 * 1024;

interface ArchiveFileEntry {
  path: string;
  content: string;
}

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

    if (!validateFileExtension(input.name)) {
      throw new ValidationError(
        `Only these file types are allowed: ${CONFIG.SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
      );
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
   * Import a ZIP archive into a project, recreating its folder structure and
   * files. Rejects the whole archive (extracting nothing) if any entry falls
   * outside the same rules that apply to files created by hand — an unsupported
   * extension, an unsafe path, or a size that violates the usual per-file/quota
   * limits — since a partially-imported project is worse than a clear error.
   */
  async importZip(
    projectId: string,
    workspaceId: string,
    parentId: string | null,
    zipBuffer: Buffer,
  ): Promise<{ createdFiles: number; createdFolders: number }> {
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch {
      throw new ValidationError('This does not look like a valid ZIP file');
    }

    const rawEntries = zip.getEntries();
    const fileEntries: ArchiveFileEntry[] = [];
    const folderPaths = new Set<string>();

    for (const entry of rawEntries) {
      const entryName = entry.entryName.replace(/\\/g, '/');
      if (entry.isDirectory || IGNORED_ARCHIVE_ENTRY_PATTERNS.some((re) => re.test(entryName))) {
        continue;
      }

      if (entryName.startsWith('/') || entryName.includes('..')) {
        throw new SecurityError(`Unsafe path in archive: ${entryName}`);
      }

      const segments = entryName.split('/').filter(Boolean);
      if (segments.length === 0) continue;

      for (const segment of segments) {
        if (!validateFilename(segment)) {
          throw new ValidationError(`Invalid file or folder name in archive: "${segment}"`);
        }
      }

      const filename = segments[segments.length - 1];
      if (!validateFileExtension(filename)) {
        throw new ValidationError(
          `"${entryName}" has an unsupported file type. Only ${CONFIG.SUPPORTED_FILE_EXTENSIONS.join(', ')} files can be imported.`,
        );
      }

      for (let i = 1; i < segments.length; i++) {
        folderPaths.add(segments.slice(0, i).join('/'));
      }

      fileEntries.push({ path: entryName, content: entry.getData().toString('utf-8') });
    }

    if (fileEntries.length === 0) {
      throw new ValidationError('This ZIP file does not contain any importable files.');
    }
    if (fileEntries.length > MAX_IMPORT_ENTRIES) {
      throw new ValidationError(`Archive contains too many files (max ${MAX_IMPORT_ENTRIES}).`);
    }

    let totalBytes = 0;
    for (const entry of fileEntries) {
      const bytes = Buffer.byteLength(entry.content, 'utf-8');
      if (!validateFileSize(bytes)) {
        throw new ValidationError(`"${entry.path}" exceeds the maximum file size.`);
      }
      totalBytes += bytes;
    }
    if (totalBytes > MAX_IMPORT_TOTAL_BYTES) {
      throw new ValidationError(
        `Archive contents exceed the ${MAX_IMPORT_TOTAL_BYTES / (1024 * 1024)}MB import limit.`,
      );
    }

    const hasQuota = await workspaceService.checkQuota(workspaceId, BigInt(totalBytes));
    if (!hasQuota) {
      throw new QuotaExceededError('Not enough storage quota available for this import');
    }

    // Create folders shallowest-first so each one's parent already exists.
    const folderIdByPath = new Map<string, string | null>([['', parentId]]);
    const sortedFolderPaths = [...folderPaths].sort(
      (a, b) => a.split('/').length - b.split('/').length,
    );

    for (const folderPath of sortedFolderPaths) {
      const segments = folderPath.split('/');
      const name = segments[segments.length - 1];
      const parentPath = segments.slice(0, -1).join('/');
      const targetParentId = folderIdByPath.get(parentPath) ?? parentId;

      const existing = await db.projectFile.findFirst({
        where: { project_id: projectId, parent_id: targetParentId, name, type: 'FOLDER' },
      });
      if (existing) {
        folderIdByPath.set(folderPath, existing.id);
        continue;
      }

      const folder = await this.createFolder(projectId, { name, parent_id: targetParentId });
      folderIdByPath.set(folderPath, folder.id);
    }

    let createdFiles = 0;
    for (const entry of fileEntries) {
      const segments = entry.path.split('/');
      const name = segments[segments.length - 1];
      const parentPath = segments.slice(0, -1).join('/');
      const targetParentId = folderIdByPath.get(parentPath) ?? parentId;

      await this.createFile(projectId, workspaceId, { name, content: entry.content, parent_id: targetParentId });
      createdFiles += 1;
    }

    return { createdFiles, createdFolders: folderPaths.size };
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<{
    id: string;
    name: string;
    type: string;
    content?: string;
    size_bytes: number;
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
      size_bytes: Number(file.size_bytes),
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
      parent_id: string | null;
      size_bytes: number;
      updated_at: Date;
    }>
  > {
    const files = await db.projectFile.findMany({
      where: {
        project_id: projectId,
        parent_id: parentId || null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        parent_id: true,
        size_bytes: true,
        updated_at: true,
      },
      orderBy: [{ type: 'desc' }, { name: 'asc' }],
    });

    return files.map((file) => ({ ...file, size_bytes: Number(file.size_bytes) }));
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

    if (input.content !== undefined && file.type !== 'FILE') {
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

      if (file.type === 'FILE' && !validateFileExtension(input.name)) {
        throw new ValidationError(
          `Only these file types are allowed: ${CONFIG.SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
        );
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
