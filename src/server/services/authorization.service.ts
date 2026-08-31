import { getServerSession, Session } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { AuthorizationError } from '@/server/errors';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  };
  session: Session;
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getServerSession(authConfig);
  
  if (!session || !session.user) {
    throw new AuthorizationError('Unauthorized', 'UNAUTHORIZED');
  }

  return {
    user: session.user as any,
    session,
  };
}

export async function requireRole(auth: AuthContext, ...roles: string[]): Promise<void> {
  if (!roles.includes(auth.user.role)) {
    throw new AuthorizationError('Insufficient permissions', 'FORBIDDEN');
  }
}

export async function requireStudentWorkspace(auth: AuthContext): Promise<string> {
  if (auth.user.role !== 'STUDENT') {
    throw new AuthorizationError('Students only', 'FORBIDDEN');
  }

  const workspace = await db.workspace.findUnique({
    where: { user_id: auth.user.id },
  });

  if (!workspace) {
    throw new AuthorizationError('Workspace not found', 'NOT_FOUND');
  }

  return workspace.id;
}

export async function verifyProjectAccess(
  auth: AuthContext,
  projectId: string,
  accessType: 'read' | 'write' = 'read',
): Promise<{ projectId: string; workspaceId: string }> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  });

  if (!project) {
    throw new AuthorizationError('Project not found', 'NOT_FOUND');
  }

  // Students: must own the workspace
  if (auth.user.role === 'STUDENT') {
    if (project.workspace.user_id !== auth.user.id) {
      throw new AuthorizationError('Access denied', 'FORBIDDEN');
    }
    if (accessType === 'write') {
      return { projectId: project.id, workspaceId: project.workspace_id };
    }
  }

  // Instructors: check assignment via instructor_students
  if (auth.user.role === 'INSTRUCTOR') {
    if (accessType === 'write') {
      throw new AuthorizationError('Instructors cannot write', 'FORBIDDEN');
    }
    
    const assignment = await db.instructorStudents.findUnique({
      where: {
        instructor_id_student_id: {
          instructor_id: auth.user.id,
          student_id: project.workspace.user_id,
        },
      },
    });

    if (!assignment) {
      throw new AuthorizationError('Access denied', 'FORBIDDEN');
    }
  }

  // Admins: full access
  if (auth.user.role !== 'ADMIN' && auth.user.role !== 'INSTRUCTOR' && auth.user.role !== 'STUDENT') {
    throw new AuthorizationError('Access denied', 'FORBIDDEN');
  }

  return { projectId: project.id, workspaceId: project.workspace_id };
}
