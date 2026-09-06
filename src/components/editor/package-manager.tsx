'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProjectFiles, useCreateFile, useFile } from '@/hooks/use-files';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/components/ui/toast';
import type { PackageInstallResult } from '@/hooks/use-python-worker';

const RECOMMENDED_PACKAGES = [
  { id: 'numpy', label: 'numpy', sublabel: 'Numerical arrays and math' },
  { id: 'pandas', label: 'pandas', sublabel: 'Dataframes and data analysis' },
  { id: 'matplotlib', label: 'matplotlib', sublabel: 'Plotting and charts' },
  { id: 'requests', label: 'requests', sublabel: 'HTTP client' },
  { id: 'sympy', label: 'sympy', sublabel: 'Symbolic math' },
  { id: 'scikit-learn', label: 'scikit-learn', sublabel: 'Machine learning' },
  { id: 'beautifulsoup4', label: 'beautifulsoup4', sublabel: 'HTML/XML parsing' },
  { id: 'pillow', label: 'pillow', sublabel: 'Image processing' },
  { id: 'regex', label: 'regex', sublabel: 'Advanced regular expressions' },
];

interface PackageManagerProps {
  projectId: string;
  installPackages: (packages: string[]) => Promise<PackageInstallResult[]>;
  isInstalling: boolean;
  workerReady: boolean;
}

export function PackageManager({ projectId, installPackages, isInstalling, workerReady }: PackageManagerProps): React.ReactNode {
  const { data: files } = useProjectFiles(projectId);
  const reqFile = files?.find((f) => f.parent_id === null && f.name === 'requirements.txt');
  const { data: reqFileContent } = useFile(reqFile?.id ?? null);
  const createFile = useCreateFile(projectId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<string[]>([]);
  const [customPackages, setCustomPackages] = useState<Record<string, { id: string; label: string }>>({});
  const [results, setResults] = useState<Record<string, PackageInstallResult>>({});
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);

  const options = useMemo(
    () => [...RECOMMENDED_PACKAGES, ...Object.values(customPackages)],
    [customPackages],
  );

  const requirementsPackages = useMemo(
    () =>
      (reqFileContent?.content ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')),
    [reqFileContent],
  );

  const handleCreateCustom = (value: string): void => {
    setCustomPackages((prev) => ({ ...prev, [value]: { id: value, label: value } }));
    setSelected((prev) => [...prev, value]);
  };

  const recordResults = (installResults: PackageInstallResult[]): void => {
    setResults((prev) => {
      const next = { ...prev };
      for (const r of installResults) next[r.package] = r;
      return next;
    });
  };

  const syncRequirementsTxt = async (installedNames: string[]): Promise<void> => {
    if (installedNames.length === 0) return;
    try {
      if (reqFile) {
        const fresh = await api.files.get(reqFile.id);
        const existingLines = (fresh.content ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
        const merged = Array.from(new Set([...existingLines, ...installedNames]));
        await api.files.update(reqFile.id, { content: merged.join('\n') + '\n', updated_at: fresh.updated_at });
      } else {
        await createFile.mutateAsync({ name: 'requirements.txt', content: installedNames.join('\n') + '\n' });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.files(projectId) });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Installed, but failed to update requirements.txt');
    }
  };

  const handleInstall = async (): Promise<void> => {
    if (selected.length === 0) return;
    const toInstall = [...selected];
    const installResults = await installPackages(toInstall);
    recordResults(installResults);
    setSelected([]);
    await syncRequirementsTxt(installResults.filter((r) => r.success).map((r) => r.package));
  };

  const handleInstallOne = async (pkg: string): Promise<void> => {
    setInstallingPackage(pkg);
    try {
      const installResults = await installPackages([pkg]);
      recordResults(installResults);
    } finally {
      setInstallingPackage(null);
    }
  };

  const handleInstallAllFromRequirements = async (): Promise<void> => {
    if (requirementsPackages.length === 0) return;
    setInstallingPackage('*');
    try {
      const installResults = await installPackages(requirementsPackages);
      recordResults(installResults);
    } finally {
      setInstallingPackage(null);
    }
  };

  return (
    <div className="w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="text-xs font-semibold uppercase text-gray-500">Install packages</p>
      <p className="mt-1 text-xs text-gray-400">
        Pick a recommended library or type any package name. Successful installs are saved to requirements.txt.
      </p>
      <div className="mt-2">
        <MultiSelect
          options={options}
          selected={selected}
          onChange={setSelected}
          allowCustom
          onCreateCustom={handleCreateCustom}
          placeholder="Search or type a package…"
        />
      </div>
      <button
        type="button"
        onClick={handleInstall}
        disabled={!workerReady || isInstalling || selected.length === 0}
        className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {isInstalling ? 'Installing…' : 'Install'}
      </button>

      {Object.keys(results).length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2">
          {Object.values(results).map((r) => (
            <li key={r.package} className="text-xs">
              <span className={r.success ? 'text-emerald-600' : 'text-red-600'}>{r.success ? '✓' : '✗'}</span>{' '}
              <span className="font-mono">{r.package}</span>
              {!r.success && r.error && <span className="ml-1 text-gray-400">— {r.error.slice(0, 80)}</span>}
            </li>
          ))}
        </ul>
      )}

      {requirementsPackages.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-500">From requirements.txt</p>
            <button
              type="button"
              onClick={handleInstallAllFromRequirements}
              disabled={!workerReady || installingPackage !== null}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {installingPackage === '*' ? 'Installing…' : 'Install & verify all'}
            </button>
          </div>
          <ul className="mt-1.5 space-y-1">
            {requirementsPackages.map((pkg) => {
              const result = results[pkg];
              return (
                <li key={pkg} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1">
                    {result && <span className={result.success ? 'text-emerald-600' : 'text-red-600'}>{result.success ? '✓' : '✗'}</span>}
                    <span className="truncate font-mono text-gray-700">{pkg}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleInstallOne(pkg)}
                    disabled={!workerReady || installingPackage !== null}
                    className="shrink-0 rounded border border-gray-300 px-2 py-0.5 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {installingPackage === pkg ? 'Installing…' : result ? 'Re-verify' : 'Install & verify'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
