import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireStudentWorkspace, verifyProjectAccess } from '@/server/services/authorization.service';
import { fileService } from '@/server/services/file.service';
import { CreateFileSchema, CreateFolderSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireStudentWorkspace(auth);
    // Verify access to project
    await verifyProjectAccess(auth, id, 'read');

    const parentId = req.nextUrl.searchParams.get('parent_id');
    const files = await fileService.listFiles(id, parentId || undefined);

    return NextResponse.json(files);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    const workspaceId = await requireStudentWorkspace(auth);

    // Verify write access to project
    await verifyProjectAccess(auth, id, 'write');

    const body = await req.json();
    const type = body.type || 'file';

    let file;
    if (type === 'folder') {
      const input = CreateFolderSchema.parse(body);
      file = await fileService.createFolder(id, input);
    } else {
      const input = CreateFileSchema.parse(body);
      file = await fileService.createFile(id, workspaceId, input);
    }

    return NextResponse.json(file, { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
