import React, { useEffect, useState } from 'react';
import { auditLogsApi, usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AuditLog, User } from '@/types';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'pill-green', UPDATE: 'pill-amber', DELETE: 'pill-red',
  LOGIN: 'pill-blue', LOGOUT: 'pill-blue',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (mod?: string, uid?: string) => {
    setLoading(true);
    try {
      const [logRes, userRes] = await Promise.all([
        auditLogsApi.getAll({ module: mod || undefined, userId: uid || undefined }),
        usersApi.getAll(),
      ]);
      setLogs(logRes.data);
      setUsers(userRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApply = () => load(filterModule, filterUser);

  const modules = Array.from(new Set(logs.map((l) => l.module))).sort();

  const formatValue = (val?: string) => {
    if (!val) return null;
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16 }}>
        <div className="section-title">Audit Logs</div>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>
          System activity trail — last 200 records
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <label className="ab-label">Module</label>
          <select className="ab-input" value={filterModule} onChange={(e) => setFilterModule(e.target.value)} style={{ width: 180 }}>
            <option value="">All Modules</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="ab-label">User</label>
          <select className="ab-input" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={{ width: 200 }}>
            <option value="">All Users</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={handleApply} disabled={loading}>
          {loading ? 'Loading...' : 'Apply Filter'}
        </button>
        <button className="ab-btn ab-btn-outline" onClick={() => { setFilterModule(''); setFilterUser(''); load(); }}>
          Clear
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Entries', val: logs.length },
          { label: 'Creates', val: logs.filter((l) => l.action === 'CREATE').length },
          { label: 'Updates', val: logs.filter((l) => l.action === 'UPDATE').length },
          { label: 'Deletes', val: logs.filter((l) => l.action === 'DELETE').length },
        ].map(({ label, val }) => (
          <div key={label} className="kpi-card">
            <div className="kpi-top"><span className="kpi-label">{label}</span></div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No audit logs found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Module</th>
                <th>Action</th>
                <th>User</th>
                <th>Record ID</th>
                <th>IP</th>
                <th style={{ textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>{formatDate(log.createdAt)}</span></td>
                    <td>
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 3, padding: '2px 6px' }}>
                        {log.module}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${ACTION_COLORS[log.action] || 'pill-gray'}`} style={{ fontSize: 10 }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="row-title">{log.user?.fullName || '—'}</span>
                      {log.user?.username && <div className="row-sub">@{log.user.username}</div>}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 10, color: 'var(--steel)' }}>
                        {log.recordId ? log.recordId.slice(0, 8) + '…' : '—'}
                      </span>
                    </td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{log.ipAddress || '—'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {(log.previousValue || log.newValue) && (
                        <button
                          className="ab-btn ab-btn-outline"
                          style={{ fontSize: 10, padding: '3px 10px' }}
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        >
                          {expanded === log.id ? 'Hide' : 'View'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--paper)', padding: 0 }}>
                        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          {log.previousValue && (
                            <div>
                              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--red-risk)', marginBottom: 6 }}>BEFORE</div>
                              <pre style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 10, color: 'var(--ink)', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 4, padding: 10, margin: 0, overflowX: 'auto', maxHeight: 200 }}>
                                {formatValue(log.previousValue)}
                              </pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--green-ok)', marginBottom: 6 }}>AFTER</div>
                              <pre style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 10, color: 'var(--ink)', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 4, padding: 10, margin: 0, overflowX: 'auto', maxHeight: 200 }}>
                                {formatValue(log.newValue)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
