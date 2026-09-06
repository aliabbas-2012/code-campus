import { AssignmentWorkspace } from '@/components/student/assignment-workspace';

export default async function AssignmentWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const { id } = await params;
  return <AssignmentWorkspace assignmentId={id} />;
}
