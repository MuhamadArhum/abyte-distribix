import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companiesApi } from '@/lib/api';
import { useCompanyStore } from '@/stores/companyStore';

interface PublicCompany {
  id: string;
  name: string;
  code: string;
}

export default function CompanySelectorPage() {
  const navigate = useNavigate();
  const selectCompany = useCompanyStore((s) => s.selectCompany);
  const selectSuperAdminLogin = useCompanyStore((s) => s.selectSuperAdminLogin);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    companiesApi.getPublic()
      .then((res) => setCompanies(res.data))
      .catch(() => setError('Could not load companies. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handlePick = (c: PublicCompany) => {
    selectCompany(c);
    navigate('/login');
  };

  const handleSuperAdmin = () => {
    selectSuperAdminLogin();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper, #f7f5f0)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '0.03em' }}>AbyteDistribix</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--steel)', marginTop: 4 }}>Select your company to continue</div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <input
            className="ab-input"
            placeholder="Search company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 14 }}
          />

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
          ) : error ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--red-risk)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No companies found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handlePick(c)}
                  className="ab-btn ab-btn-outline"
                  style={{ width: '100%', justifyContent: 'space-between', padding: '12px 14px' }}
                >
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            onClick={handleSuperAdmin}
            style={{ background: 'none', border: 'none', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Super Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
