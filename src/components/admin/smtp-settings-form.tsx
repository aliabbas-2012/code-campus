'use client';

import { useState } from 'react';
import { useSmtpSettings, useUpdateSmtpSettings } from '@/hooks/use-smtp-settings';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import type { SmtpSettings } from '@/types/api';

const DEFAULTS: SmtpSettings = {
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  from_email: '',
  from_name: 'Code Campus',
  enabled: false,
};

export function SmtpSettingsForm(): React.ReactNode {
  const { data, isLoading } = useSmtpSettings();
  const update = useUpdateSmtpSettings();
  const { showToast } = useToast();
  const [form, setForm] = useState<SmtpSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  if (!loaded && data !== undefined) {
    setLoaded(true);
    if (data) setForm(data);
  }

  const handleSave = (): void => {
    update.mutate(form, {
      onSuccess: (result) => {
        setForm(result);
        showToast('SMTP settings saved', 'info');
      },
      onError: (err) => showToast(err instanceof ApiError ? err.message : 'Failed to save SMTP settings'),
    });
  };

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">SMTP Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        When a user is offline, notifications (submissions, revisions, grades) are emailed to them using these settings.
      </p>

      <div className="mt-4 max-w-lg space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          />
          Enable email notifications
        </label>

        <div>
          <label htmlFor="smtp-host" className="block text-sm font-medium text-gray-700">Host</label>
          <input
            id="smtp-host"
            value={form.host}
            onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
            placeholder="smtp.example.com"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="smtp-port" className="block text-sm font-medium text-gray-700">Port</label>
            <input
              id="smtp-port"
              type="number"
              value={form.port}
              onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.secure}
              onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))}
            />
            Use TLS
          </label>
        </div>

        <div>
          <label htmlFor="smtp-username" className="block text-sm font-medium text-gray-700">Username</label>
          <input
            id="smtp-username"
            value={form.username ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="smtp-password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="smtp-password"
            type="password"
            value={form.password ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="smtp-from-email" className="block text-sm font-medium text-gray-700">From email</label>
          <input
            id="smtp-from-email"
            type="email"
            value={form.from_email}
            onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))}
            placeholder="noreply@example.com"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="smtp-from-name" className="block text-sm font-medium text-gray-700">From name</label>
          <input
            id="smtp-from-name"
            value={form.from_name}
            onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
