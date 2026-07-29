import React, { useState, FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase-auth';
import { Lock, Mail, Loader2, AlertCircle, Sprout, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onNavigate?: (path: string) => void;
  onSuccess?: () => void;
  onBackToSite?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate, onSuccess, onBackToSite }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onSuccess) {
        onSuccess();
      }
      if (onNavigate) {
        onNavigate('/admin');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      let message = 'Failed to sign in. Please check your credentials and try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'Invalid email or password. Please verify your admin credentials.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Access temporarily disabled due to multiple failed login attempts. Please try again later.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <button
          type="button"
          onClick={() => {
            if (onBackToSite) {
              onBackToSite();
            } else if (onNavigate) {
              onNavigate('/');
            } else {
              window.location.href = '/';
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 mb-6 font-medium transition-colors"
          id="back-to-store-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </button>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 mb-2">
              <Sprout className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900">Admin Authentication</h1>
            <p className="text-xs text-stone-500">Sign in with authorized administrator credentials to manage catalog and operations.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              id="admin-login-error"
              className="flex items-start gap-3 p-3.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="block text-xs font-semibold text-stone-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@soiltheory.in"
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors disabled:bg-stone-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="block text-xs font-semibold text-stone-700">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors disabled:bg-stone-50"
                />
              </div>
            </div>

            <button
              type="submit"
              id="admin-login-submit"
              disabled={loading}
              className="w-full bg-stone-900 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Signing in...
                </>
              ) : (
                'Sign In to Admin Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
