import { db } from '@/lib/prisma';
import { NotFoundError, ValidationError } from '@/server/errors';
import { CreateProjectInput, UpdateProjectInput } from '@/server/validation/schemas';

export class ProjectService {
  async createProject(
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<{ id: string; name: string; description: string | null }> {
    // Check if project name already exists in workspace
    const existing = await db.project.findUnique({
      where: {
        workspace_id_name: {
          workspace_id: workspaceId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new ValidationError('Project with this name already exists in your workspace');
    }

    const project = await db.project.create({
      data: {
        workspace_id: workspaceId,
        name: input.name,
        description: input.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return project;
  }

  async getProject(projectId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    workspace_id: string;
    assignment_id: string | null;
  }> {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        workspace_id: true,
        assignment_id: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  async listProjects(workspaceId: string): Promise<
    Array<{ id: string; name: string; description: string | null; assignment_id: string | null }>
  > {
    return db.project.findMany({
      where: { workspace_id: workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        assignment_id: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateProject(
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<{ id: string; name: string; description: string | null }> {
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // If renaming, check for duplicates in the workspace
    if (input.name && input.name !== project.name) {
      const existing = await db.project.findUnique({
        where: {
          workspace_id_name: {
            workspace_id: project.workspace_id,
            name: input.name,
          },
        },
      });

      if (existing) {
        throw new ValidationError('Project with this name already exists in your workspace');
      }
    }

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        name: input.name,
        description: input.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return updated;
  }

  async deleteProject(projectId: string): Promise<void> {
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Cascade delete is handled by Prisma
    await db.project.delete({
      where: { id: projectId },
    });
  }
}

export const projectService = new ProjectService();
