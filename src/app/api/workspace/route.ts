import { NextResponse } from 'next/server';
import { getAuthContext, requireStudentWorkspace } from '@/server/services/authorization.service';
import { workspaceService } from '@/server/services/workspace.service';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireStudentWorkspace(auth);
    const workspace = await workspaceService.getWorkspace(auth.user.id);

    return NextResponse.json({
      id: workspace.id,
      quota_bytes: Number(workspace.storage_quota_bytes),
      used_bytes: Number(workspace.storage_used_bytes),
    });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
