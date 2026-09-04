import React, { useEffect, useState } from 'react';
import { backupApi } from '@/lib/api';
import { toast } from 'sonner';

interface BackupInfo {
  dbPath: string;
  backupDir: string;
  dbSize: number;
  backupCount: number;
}

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-PK', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function BackupPage() {
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [infoRes, listRes] = await Promise.all([backupApi.info(), backupApi.list()]);
      setInfo(infoRes.data);
      setBackups(listRes.data);
    } catch {
      toast.error('Failed to load backup info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await backupApi.create();
      toast.success('Backup created successfully');
      load();
    } catch {
      toast.error('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`Restore from "${filename}"? Current data will be overwritten. An emergency backup will be created first.`)) return;
    setRestoring(filename);
    try {
      const res = await backupApi.restore(filename);
      toast.success(res.data.message || 'Database restored successfully');
    } catch {
      toast.error('Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete backup "${filename}"? This cannot be undone.`)) return;
    setDeleting(filename);
    try {
      await backupApi.delete(filename);
      toast.success('Backup deleted');
      load();
    } catch {
      toast.error('Failed to delete backup');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (filename: string) => {
    const url = backupApi.downloadUrl(filename);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="section-title">Backup & Restore</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>
            Database backup management — auto-retains last 10 backups
          </div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={handleCreate} disabled={creating || loading}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {creating ? 'Creating...' : 'Create Backup Now'}
        </button>
      </div>

      {/* Info Cards */}
      {info && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-top"><span className="kpi-label">Total Backups</span></div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{info.backupCount}</div>
            <div className="kpi-sub">Saved snapshots</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-top"><span className="kpi-label">DB Size</span></div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{formatBytes(info.dbSize)}</div>
            <div className="kpi-sub">Current database</div>
          </div>
          <div className="kpi-card" style={{ gridColumn: 'span 2' }}>
            <div className="kpi-top"><span className="kpi-label">DB Location</span></div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--ink)', marginTop: 6, wordBreak: 'break-all' }}>{info.dbPath}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 10, color: 'var(--steel)', marginTop: 4 }}>Backups: {info.backupDir}</div>
          </div>
        </div>
      )}

      {/* Warning Banner */}
      <div style={{ background: 'rgba(230,100,0,0.08)', border: '1px solid rgba(230,100,0,0.3)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--safety-orange)" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontSize: 12, color: 'var(--safety-orange)', fontFamily: 'IBM Plex Mono,monospace' }}>
          Restore will overwrite current data. An emergency backup is created automatically before every restore.
        </span>
      </div>

      {/* Backup List */}
      <div className="panel">
        <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 0 }}>
          <span className="section-title" style={{ fontSize: 13 }}>Available Backups</span>
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : backups.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>
            No backups found. Create your first backup.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Size</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((bk, i) => (
                <tr key={bk.filename}>
                  <td>
                    <span className="row-title" style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>{bk.filename}</span>
                    {i === 0 && <span className="pill pill-green" style={{ fontSize: 10, marginLeft: 8 }}>Latest</span>}
                  </td>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>{formatDt(bk.createdAt)}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11 }}>{formatBytes(bk.size)}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        className="ab-btn ab-btn-outline"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => handleDownload(bk.filename)}
                        title="Download"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                      </button>
                      <button
                        className="ab-btn ab-btn-outline"
                        style={{ fontSize: 11, padding: '4px 10px', color: 'var(--amber-warn)', borderColor: 'var(--amber-warn)' }}
                        onClick={() => handleRestore(bk.filename)}
                        disabled={restoring === bk.filename}
                        title="Restore"
                      >
                        {restoring === bk.filename ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        className="ab-btn ab-btn-outline"
                        style={{ fontSize: 11, padding: '4px 10px', color: 'var(--red-risk)', borderColor: 'var(--red-risk)' }}
                        onClick={() => handleDelete(bk.filename)}
                        disabled={deleting === bk.filename}
                        title="Delete"
                      >
                        {deleting === bk.filename ? '...' : 'Delete'}
                      </button>
                    </div>
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
