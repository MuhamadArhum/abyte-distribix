import React, { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

const ROLES = ['ADMIN', 'MANAGER', 'OPERATOR', 'ACCOUNTANT', 'VIEWER'];
const EMPTY_FORM = { username: '', email: '', fullName: '', password: '', role: 'OPERATOR' };

const rolePill = (r: string) => {
  if (r === 'ADMIN') return <span className="pill pill-red">{r}</span>;
  if (r === 'MANAGER') return <span className="pill pill-amber">{r}</span>;
  return <span className="pill pill-steel">{r}</span>;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const res = await usersApi.getAll(); setUsers(res.data); }
    catch { alert('Failed to load users'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.username || !form.email || !form.password) { alert('Fill all required fields'); return; }
    setSaving(true);
    try { await usersApi.create(form); setShowForm(false); setForm(EMPTY_FORM); load(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed to create user'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try { await usersApi.delete(id); load(); } catch { alert('Failed to delete'); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try { await usersApi.update(id, { isActive: !isActive }); load(); }
    catch { alert('Failed to update'); }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'fullName', header: 'User',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--blueprint)', color: 'var(--safety-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {(row.original.fullName || row.original.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{row.original.fullName}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{row.original.username}</div>
          </div>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--steel)' }}>{row.original.email}</span> },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => rolePill(row.original.role) },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <span className={`pill ${row.original.isActive ? 'pill-green' : 'pill-steel'}`}>{row.original.isActive ? 'Active' : 'Inactive'}</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(row.original.createdAt)}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => handleToggle(row.original.id, row.original.isActive)}>
            {row.original.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button className="ab-btn ab-btn-icon danger" onClick={() => handleDelete(row.original.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-content">
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
        <div>
          <div className="section-title">User Management</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{users.length} system users</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      <div className="panel">
        {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
          : <DataTable columns={columns} data={users} searchKey="fullName" searchPlaceholder="Search users..." />}
      </div>

      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Add New User</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Username *</label><input className="ab-input" placeholder="john.doe" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div><label className="ab-label">Full Name</label><input className="ab-input" placeholder="John Doe" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
                <div className="span-2"><label className="ab-label">Email *</label><input className="ab-input" type="email" placeholder="john@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="span-2"><label className="ab-label">Password *</label><input className="ab-input" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Role</label>
                  <select className="ab-input ab-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
