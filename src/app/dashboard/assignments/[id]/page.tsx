import { AssignmentDetail } from '@/components/student/assignment-detail';

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const { id } = await params;
  return <AssignmentDetail assignmentId={id} />;
}
