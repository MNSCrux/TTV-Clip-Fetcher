import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'PoE Clip Checker',
  description: 'Twitch clip review dashboard for Path of Exile streamers',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100">
        <nav className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="text-2xl font-bold text-yellow-400">
              PoE Clip Checker
            </div>
            <div className="flex space-x-6">
              <Link href="/" className="hover:text-yellow-400 transition">
                Dashboard
              </Link>
              <Link href="/streamers" className="hover:text-yellow-400 transition">
                Streamers
              </Link>
              <Link href="/clips" className="hover:text-yellow-400 transition">
                Clips
              </Link>
              <Link href="/settings" className="hover:text-yellow-400 transition">
                Settings
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
