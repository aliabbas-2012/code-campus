import { AssignmentDetail } from '@/components/instructor/assignment-detail';

export default async function InstructorAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const { id } = await params;
  return <AssignmentDetail assignmentId={id} />;
}
