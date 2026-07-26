import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import './index.css';

function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-moss border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-mono text-brand-moss">Loading Partner Portal...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <AdminDashboard
        onLogout={() => {
          auth.signOut();
        }}
      />
    );
  }

  return (
    <AdminLogin
      onSuccess={() => {
        // Auth state listener handles state change
      }}
      onBackToSite={() => {
        window.location.href = '/';
      }}
    />
  );
}

const rootElement = document.getElementById('admin-root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AdminApp />
    </React.StrictMode>
  );
}
