import { StudentAssignments } from '@/components/instructor/student-assignments';

export default async function InstructorStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const { id } = await params;
  return <StudentAssignments studentId={id} />;
}
