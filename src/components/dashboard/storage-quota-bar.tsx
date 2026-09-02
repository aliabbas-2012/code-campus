'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function StorageQuotaBar(): React.ReactNode {
  const { data } = useQuery({
    queryKey: queryKeys.storage,
    queryFn: api.workspace.storage,
  });

  if (!data) return null;

  const usedMB = (data.used_bytes / (1024 * 1024)).toFixed(1);
  const quotaMB = (data.quota_bytes / (1024 * 1024)).toFixed(0);
  const percent = Math.min(100, data.percent_used);
  const barColor =
    percent >= 95 ? 'bg-red-600' : percent >= 80 ? 'bg-amber-500' : 'bg-indigo-600';

  return (
    <div className="w-full max-w-xs">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {usedMB} MB of {quotaMB} MB used
      </p>
    </div>
  );
}
