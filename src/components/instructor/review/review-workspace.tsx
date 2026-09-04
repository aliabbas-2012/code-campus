'use client';

import { useRouter } from 'next/navigation';
import { Workspace } from '@/components/editor/workspace';
import { ReviewPanel } from './review-panel';

export function ReviewWorkspace({ projectId }: { projectId: string }): React.ReactNode {
  const router = useRouter();

  return (
    <Workspace
      projectId={projectId}
      mode="review"
      onBack={() => router.push('/instructor/assignments')}
      extraBar={<ReviewPanel projectId={projectId} />}
    />
  );
}
