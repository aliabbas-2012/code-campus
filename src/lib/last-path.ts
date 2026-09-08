// Shared between the global path tracker (session-provider.tsx) and the home page's
// "Resume where you left off" button (resume-last-page-button.tsx).
export const LAST_PATH_STORAGE_KEY = 'code-campus-last-path';

// Never worth "resuming" onto — public/auth pages, not a place mid-work state lives.
export const LAST_PATH_EXCLUDED = ['/', '/login', '/forgot-password', '/reset-password'];

export const ROLE_DASHBOARD_PATH: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  INSTRUCTOR: '/instructor/dashboard',
  STUDENT: '/dashboard',
};
