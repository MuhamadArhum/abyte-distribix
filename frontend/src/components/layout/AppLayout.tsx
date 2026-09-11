import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { canAccessPath } from '@/lib/permissions';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPath(user?.role, location.pathname)) {
    toast.error("You don't have permission to access that page");
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="main-area" style={{ minWidth: 0 }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
