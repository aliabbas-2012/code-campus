'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage(): React.ReactNode {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {session.user?.name}!</h1>
        <p className="text-gray-600 mb-8">
          You are logged in as <span className="font-mono">{session.user?.email}</span>
        </p>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
          <p className="text-gray-600">
            Projects and editor will be available soon. This is Phase 1 scaffolding.
          </p>
        </div>
      </div>
    </div>
  );
}
