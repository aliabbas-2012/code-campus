import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { ResumeLastPageButton } from '@/components/shared/resume-last-page-button';
import { ROLE_DASHBOARD_PATH } from '@/lib/last-path';

export default async function HomePage(): Promise<React.ReactNode> {
  const session = await getServerSession(authConfig);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">Code Campus</h1>

        {session?.user ? (
          <>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-1">Welcome back, {session.user.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">You&apos;re still signed in.</p>
            <div className="flex flex-col items-center gap-4">
              <a
                href={ROLE_DASHBOARD_PATH[session.user.role] ?? '/dashboard'}
                className="inline-block bg-indigo-600 text-white font-medium px-8 py-3 rounded-lg hover:bg-indigo-700"
              >
                Go to your Dashboard
              </a>
              <ResumeLastPageButton role={session.user.role} />
            </div>
          </>
        ) : (
          <>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">Learn Python Online</p>
            <a
              href="/login"
              className="inline-block bg-indigo-600 text-white font-medium px-8 py-3 rounded-lg hover:bg-indigo-700"
            >
              Get Started
            </a>
          </>
        )}
      </div>
    </div>
  );
}
