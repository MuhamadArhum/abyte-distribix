import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useNavigate, useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':         'Dashboard',
  '/customers':         'Customers',
  '/suppliers':         'Suppliers',
  '/gas-products':      'Gas Products',
  '/storage-tanks':     'Storage Tanks',
  '/cylinders':         'Cylinders',
  '/purchases':         'Gas Purchases',
  '/gas-receiving':     'Gas Receiving',
  '/filling':           'Gas Filling',
  '/inventory':         'Inventory',
  '/sales':             'Sales',
  '/payments/customer': 'Customer Payments',
  '/payments/supplier': 'Supplier Payments',
  '/expenses':          'Expenses',
  '/accounting':        'Accounting',
  '/reports':           'Reports',
  '/users':             'Users',
  '/settings':          'Settings',
};

const weekNum = Math.ceil(
  (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000,
);

function getInitials(name?: string) {
  if (!name) return 'AB';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { toggleMobileSidebar } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle =
    Object.entries(PAGE_TITLES).find(
      ([path]) => location.pathname === path || location.pathname.startsWith(path + '/'),
    )?.[1] ?? 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger — only visible on mobile via CSS */}
        <button
          className="hamburger-btn"
          onClick={toggleMobileSidebar}
          aria-label="Open menu"
          style={{
            display: 'none', // overridden by .hamburger-btn CSS on mobile
            alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32,
            background: 'none', border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div>
          <h1 className="topbar-title">{pageTitle}</h1>
          <div className="topbar-sub">
            LPG DISTRIBUTION &middot; WEEK {weekNum}, {new Date().getFullYear()}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        {/* Search — hidden on mobile via CSS */}
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" placeholder="Search customers, sales, transactions..." />
        </div>

        <button className="icon-btn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="dot-alert" />
        </button>

        <div style={{ position: 'relative' }}>
          <div
            className="user-avatar"
            onClick={() => setMenuOpen(!menuOpen)}
            title={user?.fullName}
          >
            {getInitials(user?.fullName)}
          </div>
          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setMenuOpen(false)}
              />
              <div style={{
                position: 'absolute', right: 0, top: 40,
                background: 'var(--paper-light)', border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)', minWidth: 168, zIndex: 100,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                    {user?.fullName}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', color: 'var(--steel)', marginTop: 2 }}>
                    {user?.role}
                  </div>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
                >Settings</button>
                <button
                  onClick={handleLogout}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-risk)', borderTop: '1px solid var(--rule)' }}
                >Logout</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
