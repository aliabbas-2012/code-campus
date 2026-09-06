import { InstructorProfileView } from '@/components/student/instructor-profile-view';

export default async function StudentInstructorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const { id } = await params;
  return <InstructorProfileView instructorId={id} />;
}
