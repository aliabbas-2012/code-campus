import type { Metadata } from 'next';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Code Campus - Learn Python Online',
  description: 'An online Python learning platform where you can write, organize, and run Python code directly from your browser.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <html lang="en">
      <body className="antialiased bg-white dark:bg-slate-950">
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
