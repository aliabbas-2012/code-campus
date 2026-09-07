export function PassFailBadge({ passed }: { passed: boolean | null }): React.ReactNode {
  if (passed === null) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {passed ? 'Pass' : 'Fail'}
    </span>
  );
}
