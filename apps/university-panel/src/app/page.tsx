'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginStaff } from '../lib/api';
import { saveStaffSession } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await loginStaff(email, password, totpCode || undefined);
      saveStaffSession(user);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (role: 'dispatcher' | 'admin') => {
    if (role === 'dispatcher') {
      setEmail('dispatcher@university.edu');
      setPassword('CampusShield2026!');
    } else {
      setEmail('admin@university.edu');
      setPassword('CampusShield2026!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">CampusShield</h1>
          <p className="text-sm text-slate-400 mt-1">University Security & Dispatch Console</p>
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
            Privacy-by-Default Identity Escrow Active
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Staff Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@university.edu"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              2FA Code (Optional)
            </label>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="6-digit authenticator code"
              maxLength={6}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono tracking-widest text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-colors duration-150 disabled:opacity-50 text-sm flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access Security Panel</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500 mb-3">Quick Fill Demo Accounts:</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => handleDemoFill('dispatcher')}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors"
            >
              Dispatcher
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('admin')}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors"
            >
              Admin / Auditor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
