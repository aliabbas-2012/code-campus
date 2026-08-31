import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireStudentWorkspace, verifyProjectAccess } from '@/server/services/authorization.service';
import { fileService } from '@/server/services/file.service';
import { UpdateFileSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';
import { db } from '@/lib/prisma';

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

    // Verify access to the project containing this file/folder
    const dbFile = await db.projectFile.findUnique({
      where: { id },
    });

    if (!dbFile) {
      return NextResponse.json({ message: 'File not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    await verifyProjectAccess(auth, dbFile.project_id, 'read');

    const file = await fileService.getFile(id);

    return NextResponse.json(file);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    const workspaceId = await requireStudentWorkspace(auth);

    // Get file to find its project
    const dbFile = await db.projectFile.findUnique({
      where: { id },
    });

    if (!dbFile) {
      return NextResponse.json({ message: 'File not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Verify write access to project
    await verifyProjectAccess(auth, dbFile.project_id, 'write');

    const body = await req.json();
    const input = UpdateFileSchema.parse(body);

    const file = await fileService.updateFile(id, workspaceId, input);

    return NextResponse.json(file);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    const workspaceId = await requireStudentWorkspace(auth);

    // Get file to find its project
    const dbFile = await db.projectFile.findUnique({
      where: { id },
    });

    if (!dbFile) {
      return NextResponse.json({ message: 'File not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Verify write access to project
    await verifyProjectAccess(auth, dbFile.project_id, 'write');

    await fileService.deleteFile(id, workspaceId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
