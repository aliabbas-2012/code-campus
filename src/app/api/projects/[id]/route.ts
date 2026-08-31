import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireStudentWorkspace, verifyProjectAccess } from '@/server/services/authorization.service';
import { projectService } from '@/server/services/project.service';
import { UpdateProjectSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireStudentWorkspace(auth);

    // Verify access
    await verifyProjectAccess(auth, id, 'read');

    const project = await projectService.getProject(id);

    return NextResponse.json(project);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireStudentWorkspace(auth);

    // Verify write access
    await verifyProjectAccess(auth, id, 'write');

    const body = await req.json();
    const input = UpdateProjectSchema.parse(body);

    const project = await projectService.updateProject(id, input);

    return NextResponse.json(project);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireStudentWorkspace(auth);

    // Verify write access
    await verifyProjectAccess(auth, id, 'write');

    await projectService.deleteProject(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
