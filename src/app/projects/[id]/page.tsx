import { Workspace } from '@/components/editor/workspace';

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> {
  const { id } = await params;
  return <Workspace projectId={id} />;
}
