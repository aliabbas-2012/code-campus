import type { AssignmentStats } from '@/lib/assignment-stats';

function Card({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'red' | 'indigo' }): React.ReactNode {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : tone === 'indigo' ? 'text-indigo-600' : 'text-gray-900';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

export function AssignmentStatsCards({ stats }: { stats: AssignmentStats }): React.ReactNode {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card label="Total" value={String(stats.total)} />
      <Card label="In progress" value={String(stats.inProgress)} />
      <Card label="In review" value={String(stats.inReview)} tone="indigo" />
      <Card label="Revision" value={String(stats.revisionRequested)} />
      <Card label="Reviewed" value={String(stats.reviewed)} />
      <Card label="Passed" value={String(stats.passed)} tone="emerald" />
      <Card label="Failed" value={String(stats.failed)} tone="red" />
      <Card
        label="Average score"
        value={stats.averageScorePct === null ? '—' : `${stats.averageScorePct.toFixed(0)}%`}
      />
    </div>
  );
}
