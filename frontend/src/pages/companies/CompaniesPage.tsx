import React, { useEffect, useState } from 'react';
import { companiesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
}

export default function CompaniesPage() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    companiesApi.getAll()
      .then((res) => setCompanies(res.data))
      .catch(() => setError('Failed to load companies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user?.isSuperAdmin) load(); }, [user]);

  if (!user?.isSuperAdmin) {
    return (
      <div className="page-content">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>
          Super-admin access required.
        </div>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) { setError('Name and code are required'); return; }
    setSaving(true); setError('');
    try {
      await companiesApi.create({ name, code });
      setName(''); setCode('');
      toast.success('Company created');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create company');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (c: Company) => {
    try {
      await companiesApi.update(c.id, { status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      toast.success('Company updated');
      load();
    } catch {
      toast.error('Failed to update company');
    }
  };

  return (
    <div className="page-content">
      <div className="section-title" style={{ marginBottom: 20 }}>Companies</div>

      <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14 }}>
          NEW COMPANY
        </div>
        {error && <div style={{ color: 'var(--red-risk)', fontSize: 12, marginBottom: 10, fontFamily: 'IBM Plex Mono,monospace' }}>{error}</div>}
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="ab-label">Company Name</label>
            <input className="ab-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme LPG" />
          </div>
          <div>
            <label className="ab-label">Code (slug)</label>
            <input className="ab-input" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="acme-lpg" />
          </div>
          <button className="ab-btn ab-btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Company'}
          </button>
        </form>
      </div>

      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="row-title">{c.name}</td>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>{c.code}</span></td>
                  <td><span className={`pill ${c.status === 'ACTIVE' ? 'pill-green' : 'pill-red'}`}>{c.status}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleToggleStatus(c)}>
                      {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
