import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireStudentWorkspace, verifyProjectAccess } from '@/server/services/authorization.service';
import { fileService } from '@/server/services/file.service';
import { validateFileExtension } from '@/lib/config';
import { ValidationError } from '@/server/errors';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    const workspaceId = await requireStudentWorkspace(auth);
    await verifyProjectAccess(auth, id, 'write');

    const formData = await req.formData();
    const upload = formData.get('file');
    if (!(upload instanceof File)) {
      throw new ValidationError('No file was uploaded');
    }
    if (upload.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError(`Upload exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit`);
    }

    const parentIdRaw = formData.get('parent_id');
    const parentId = typeof parentIdRaw === 'string' && parentIdRaw.length > 0 ? parentIdRaw : null;

    const name = upload.name;
    const lowerName = name.toLowerCase();

    if (lowerName.endsWith('.zip')) {
      const buffer = Buffer.from(await upload.arrayBuffer());
      const result = await fileService.importZip(id, workspaceId, parentId, buffer);
      return NextResponse.json(result, { status: 201 });
    }

    if (validateFileExtension(name)) {
      const content = await upload.text();
      const file = await fileService.createFile(id, workspaceId, { name, content, parent_id: parentId });
      return NextResponse.json({ createdFiles: 1, createdFolders: 0, file }, { status: 201 });
    }

    throw new ValidationError('Only .zip archives or individual supported source files can be imported');
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
