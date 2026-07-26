import React, { useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, ShieldCheck, ArrowLeft } from 'lucide-react';

interface AdminDashboardProps {
  user?: User | null;
  authLoading?: boolean;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user: propUser,
  authLoading = false,
  onNavigate,
  onLogout,
}) => {
  const currentUser = propUser || auth.currentUser;

  useEffect(() => {
    if (!authLoading && !currentUser && onNavigate) {
      // Unauthenticated user -> redirect to /admin/login
      onNavigate('/admin/login');
    }
  }, [currentUser, authLoading, onNavigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-600 font-medium">Verifying admin authorization...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (onLogout) {
        onLogout();
      }
      if (onNavigate) {
        onNavigate('/admin/login');
      }
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/');
              } else {
                window.location.href = '/';
              }
            }}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="Return to Main Store"
            id="admin-dashboard-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-serif font-bold text-stone-900 text-lg">The Soil Theory Admin</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-stone-600 font-mono bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
            {currentUser.email || 'Admin User'}
          </span>
          <button
            type="button"
            id="admin-sign-out-btn"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-red-700 bg-stone-100 hover:bg-red-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8 text-center max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-900">
            Admin dashboard connected successfully.
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            Welcome to the secure administrator workspace. Authentication is verified and active.
          </p>
        </div>
      </main>
    </div>
  );
};
