import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireStudentWorkspace } from '@/server/services/authorization.service';
import { projectService } from '@/server/services/project.service';
import { CreateProjectSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    const workspaceId = await requireStudentWorkspace(auth);
    const projects = await projectService.listProjects(workspaceId);

    return NextResponse.json(projects);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    const workspaceId = await requireStudentWorkspace(auth);

    const body = await req.json();
    const input = CreateProjectSchema.parse(body);

    const project = await projectService.createProject(workspaceId, input);

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
