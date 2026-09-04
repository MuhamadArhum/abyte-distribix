import React, { useEffect, useState } from 'react';
import { rolesApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Role } from '@/types';

const ALL_PERMISSIONS = [
  { key: 'customers:read', label: 'View Customers' },
  { key: 'customers:write', label: 'Manage Customers' },
  { key: 'suppliers:read', label: 'View Suppliers' },
  { key: 'suppliers:write', label: 'Manage Suppliers' },
  { key: 'gas-products:read', label: 'View Gas Products' },
  { key: 'gas-products:write', label: 'Manage Gas Products' },
  { key: 'storage-tanks:read', label: 'View Storage Tanks' },
  { key: 'storage-tanks:write', label: 'Manage Storage Tanks' },
  { key: 'purchases:read', label: 'View Purchases' },
  { key: 'purchases:write', label: 'Manage Purchases' },
  { key: 'gas-receiving:read', label: 'View Gas Receiving' },
  { key: 'gas-receiving:write', label: 'Manage Gas Receiving' },
  { key: 'inventory:read', label: 'View Inventory' },
  { key: 'inventory:write', label: 'Manage Inventory' },
  { key: 'cylinders:read', label: 'View Cylinders' },
  { key: 'cylinders:write', label: 'Manage Cylinders' },
  { key: 'filling:read', label: 'View Filling' },
  { key: 'filling:write', label: 'Manage Filling' },
  { key: 'sales:read', label: 'View Sales' },
  { key: 'sales:write', label: 'Manage Sales' },
  { key: 'payments:read', label: 'View Payments' },
  { key: 'payments:write', label: 'Manage Payments' },
  { key: 'expenses:read', label: 'View Expenses' },
  { key: 'expenses:write', label: 'Manage Expenses' },
  { key: 'accounting:read', label: 'View Accounting' },
  { key: 'reports:read', label: 'View Reports' },
  { key: 'deliveries:read', label: 'View Deliveries' },
  { key: 'deliveries:write', label: 'Manage Deliveries' },
  { key: 'users:read', label: 'View Users' },
  { key: 'users:write', label: 'Manage Users' },
  { key: 'roles:read', label: 'View Roles' },
  { key: 'roles:write', label: 'Manage Roles' },
  { key: 'settings:write', label: 'Manage Settings' },
  { key: 'backup:write', label: 'Backup & Restore' },
  { key: 'audit-logs:read', label: 'View Audit Logs' },
];

const emptyForm = { name: '', description: '', permissions: [] as string[] };

function parsePermissions(raw: string): string[] {
  try { return JSON.parse(raw) || []; } catch { return []; }
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await rolesApi.getAll();
      setRoles(res.data);
    } catch {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditRole(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: parsePermissions(role.permissions),
    });
    setShowForm(true);
  };

  const togglePerm = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const selectAll = () => setForm((f) => ({ ...f, permissions: ALL_PERMISSIONS.map((p) => p.key) }));
  const clearAll = () => setForm((f) => ({ ...f, permissions: [] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        permissions: JSON.stringify(form.permissions),
      };
      if (editRole) {
        await rolesApi.update(editRole.id, payload);
        toast.success('Role updated');
      } else {
        await rolesApi.create(payload);
        toast.success('Role created');
      }
      setShowForm(false);
      setEditRole(null);
      load();
    } catch {
      toast.error('Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete role "${name}"?`)) return;
    setDeleting(id);
    try {
      await rolesApi.delete(id);
      toast.success('Role deleted');
      load();
    } catch {
      toast.error('Failed to delete role');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="section-title">Roles & Permissions</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>
            Define access control roles for system users
          </div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openCreate}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Role
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', width: '100%', maxWidth: 680, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="section-title" style={{ fontSize: 16 }}>{editRole ? 'Edit Role' : 'New Role'}</div>
              <button className="ab-btn ab-btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label className="ab-label">Role Name *</label>
                  <input className="ab-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sales Manager" required />
                </div>
                <div>
                  <label className="ab-label">Description</label>
                  <input className="ab-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="ab-label" style={{ margin: 0 }}>Permissions ({form.permissions.length}/{ALL_PERMISSIONS.length})</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={selectAll}>All</button>
                    <button type="button" className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={clearAll}>None</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, maxHeight: 320, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: 12 }}>
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, padding: '4px 0' }}>
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm.key)}
                        onChange={() => togglePerm(perm.key)}
                        style={{ accentColor: 'var(--safety-orange)', width: 14, height: 14 }}
                      />
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="ab-btn ab-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roles List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
      ) : roles.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>
          No roles defined. Create your first role.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {roles.map((role) => {
            const perms = parsePermissions(role.permissions);
            return (
              <div key={role.id} className="panel" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div className="row-title" style={{ fontSize: 15 }}>{role.name}</div>
                    {role.description && <div className="row-sub" style={{ marginTop: 3 }}>{role.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', alignSelf: 'center' }}>
                      {perms.length} permission{perms.length !== 1 ? 's' : ''}
                    </span>
                    <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => openEdit(role)}>Edit</button>
                    <button
                      className="ab-btn ab-btn-outline"
                      style={{ fontSize: 11, padding: '4px 10px', color: 'var(--red-risk)', borderColor: 'var(--red-risk)' }}
                      onClick={() => handleDelete(role.id, role.name)}
                      disabled={deleting === role.id}
                    >
                      {deleting === role.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
                {perms.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {perms.map((p) => {
                      const found = ALL_PERMISSIONS.find((ap) => ap.key === p);
                      return (
                        <span key={p} style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 10, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 3, padding: '2px 7px', color: 'var(--ink)' }}>
                          {found?.label || p}
                        </span>
                      );
                    })}
                  </div>
                )}
                {perms.length === 0 && (
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>No permissions assigned</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
