'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useOnClickOutside } from '@/hooks/use-on-click-outside';
import { ChangePasswordDialog } from '@/components/shared/change-password-dialog';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
};

interface UserMenuProps {
  name: string;
  email: string;
  role: string;
  profileHref?: string;
}

export function UserMenu({ name, email, role, profileHref }: UserMenuProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useOnClickOutside(containerRef, () => setOpen(false));

  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {initial}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">{ROLE_LABELS[role] ?? role}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-1 shadow-lg dark:border-gray-700">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
            <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
          {profileHref && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(profileHref);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              My Profile
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setShowChangePassword(true);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Change Password
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>
      )}

      {showChangePassword && <ChangePasswordDialog onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
