import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole, verifyProjectAccess } from '@/server/services/authorization.service';
import { submissionService } from '@/server/services/submission.service';
import { CreateLineCommentSchema } from '@/server/validation/schemas';
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

    const dbFile = await db.projectFile.findUnique({ where: { id } });
    if (!dbFile) {
      return NextResponse.json({ message: 'File not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    await verifyProjectAccess(auth, dbFile.project_id, 'read');

    const comments = await submissionService.listLineComments(id);
    return NextResponse.json(comments);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');

    const dbFile = await db.projectFile.findUnique({ where: { id } });
    if (!dbFile) {
      return NextResponse.json({ message: 'File not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    await verifyProjectAccess(auth, dbFile.project_id, 'read');

    const body = await req.json();
    const input = CreateLineCommentSchema.parse(body);

    const comment = await submissionService.addLineComment(id, auth.user.id, input.line_number, input.comment);
    return NextResponse.json(comment, { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
