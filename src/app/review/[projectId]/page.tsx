import { ReviewWorkspace } from '@/components/instructor/review/review-workspace';

export default async function InstructorReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<React.ReactNode> {
  const { projectId } = await params;
  return <ReviewWorkspace projectId={projectId} />;
}
