import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';

interface NavItem {
  label: string;
  path: string;
  badge?: number;
  icon: React.ReactNode;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard', path: '/dashboard',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
      },
    ],
  },
  {
    title: 'Master Data',
    items: [
      {
        label: 'Customers', path: '/customers',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/></svg>,
      },
      {
        label: 'Suppliers', path: '/suppliers',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14"/></svg>,
      },
      {
        label: 'Gas Products', path: '/gas-products',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
      },
      {
        label: 'Storage Tanks', path: '/storage-tanks',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>,
      },
      {
        label: 'Cylinders', path: '/cylinders',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="7" rx="5" ry="2"/><path d="M7 7v10c0 1.1 2.24 2 5 2s5-.9 5-2V7"/></svg>,
      },
      {
        label: 'Cylinder Units', path: '/cylinder-units',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Gas Purchases', path: '/purchases',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
      },
      {
        label: 'Gas Receiving', path: '/gas-receiving',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
      },
      {
        label: 'Gas Filling', path: '/filling',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 2h6l1 7H8L9 2z"/><path d="M8 9a4 4 0 0 0 8 0"/><path d="M7 13h10l1 9H6l1-9z"/></svg>,
      },
      {
        label: 'Inventory', path: '/inventory',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
      },
    ],
  },
  {
    title: 'Delivery',
    items: [
      {
        label: 'Deliveries', path: '/deliveries',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
      },
      {
        label: 'Drivers', path: '/drivers',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 12.5 8 13.5.95-1 8-8.1 8-13.5a8 8 0 0 0-8-8z"/></svg>,
      },
      {
        label: 'Vehicles', path: '/vehicles',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
      },
    ],
  },
  {
    title: 'Sales',
    items: [
      {
        label: 'Sales', path: '/sales',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Customer Payments', path: '/payments/customer',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      },
      {
        label: 'Supplier Payments', path: '/payments/supplier',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
      },
      {
        label: 'Expenses', path: '/expenses',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      },
      {
        label: 'Accounting', path: '/accounting',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        label: 'Reports', path: '/reports',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
      },
      {
        label: 'Users', path: '/users',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M17 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/></svg>,
      },
      {
        label: 'Settings', path: '/settings',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
      },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { mobileSidebarOpen } = useAppStore();

  return (
    <aside className={`sidebar${mobileSidebarOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-dot" />
        AbyteDistribix
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            <div className="nav-label">{group.title}</div>
            {group.items.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/');
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                  {item.badge !== undefined && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">v1.0.0 — LPG MGMT</div>
    </aside>
  );
}
