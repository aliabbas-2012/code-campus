import { db } from '@/lib/prisma';
import { CONFIG } from '@/lib/config';
import { NotFoundError, AuthorizationError, QuotaExceededError } from '@/server/errors';

export class WorkspaceService {
  async getOrCreateWorkspace(userId: string): Promise<{ id: string; storage_quota_bytes: bigint; storage_used_bytes: bigint }> {
    let workspace = await db.workspace.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        storage_quota_bytes: true,
        storage_used_bytes: true,
      },
    });

    if (!workspace) {
      // Create workspace for new user
      workspace = await db.workspace.create({
        data: {
          user_id: userId,
          storage_quota_bytes: BigInt(CONFIG.DEFAULT_STORAGE_QUOTA_BYTES),
        },
        select: {
          id: true,
          storage_quota_bytes: true,
          storage_used_bytes: true,
        },
      });
    }

    return workspace;
  }

  async getWorkspace(userId: string): Promise<{ id: string; storage_quota_bytes: bigint; storage_used_bytes: bigint }> {
    const workspace = await db.workspace.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        storage_quota_bytes: true,
        storage_used_bytes: true,
        status: true,
      },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    if (workspace.status !== 'ACTIVE') {
      throw new AuthorizationError('Workspace is not active');
    }

    return {
      id: workspace.id,
      storage_quota_bytes: workspace.storage_quota_bytes,
      storage_used_bytes: workspace.storage_used_bytes,
    };
  }

  async checkQuota(workspaceId: string, requiredBytes: bigint): Promise<boolean> {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        storage_quota_bytes: true,
        storage_used_bytes: true,
      },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const available = workspace.storage_quota_bytes - workspace.storage_used_bytes;
    return available >= requiredBytes;
  }

  async updateStorageUsage(workspaceId: string, byteDelta: bigint): Promise<void> {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const newUsage = workspace.storage_used_bytes + byteDelta;
    if (newUsage < BigInt(0) || newUsage > workspace.storage_quota_bytes) {
      throw new QuotaExceededError('Storage quota would be exceeded');
    }

    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        storage_used_bytes: newUsage,
      },
    });
  }

  async getStorageInfo(workspaceId: string): Promise<{
    quota_bytes: bigint;
    used_bytes: bigint;
    available_bytes: bigint;
  }> {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        storage_quota_bytes: true,
        storage_used_bytes: true,
      },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    return {
      quota_bytes: workspace.storage_quota_bytes,
      used_bytes: workspace.storage_used_bytes,
      available_bytes: workspace.storage_quota_bytes - workspace.storage_used_bytes,
    };
  }
}

export const workspaceService = new WorkspaceService();
