import React, { useEffect, useState, useCallback } from 'react';
import { settingsApi, backupApi } from '@/lib/api';

const DEFAULT_SETTINGS = [
  { key: 'company_name', value: 'AbyteDistribix LPG', description: 'Company Name' },
  { key: 'company_address', value: '', description: 'Company Address' },
  { key: 'company_phone', value: '', description: 'Company Phone' },
  { key: 'company_email', value: '', description: 'Company Email' },
  { key: 'invoice_prefix', value: 'INV', description: 'Invoice Number Prefix' },
  { key: 'purchase_prefix', value: 'PUR', description: 'Purchase Number Prefix' },
  { key: 'tax_rate', value: '0', description: 'Default Tax Rate (%)' },
  { key: 'currency', value: 'PKR', description: 'Default Currency' },
];

const eAPI = (window as any).electronAPI;
const isElectron = !!eAPI?.isElectron;

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatBackupDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface BackupFile { filename: string; size: number; createdAt: string; }

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Backup state
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.getAll().then((res) => {
      if (res.data.length > 0) {
        const merged = DEFAULT_SETTINGS.map((ds) => {
          const found = res.data.find((s: any) => s.key === ds.key);
          return found ? { ...ds, value: found.value } : ds;
        });
        setSettings(merged);
      }
    }).catch(() => {}).finally(() => setLoading(false));

    loadBackupInfo();
  }, []);

  const loadBackupInfo = useCallback(async () => {
    try {
      if (isElectron) {
        const [info, list] = await Promise.all([eAPI.backup.info(), eAPI.backup.list()]);
        setDbInfo(info);
        setBackups(list);
      } else {
        const [info, list] = await Promise.all([backupApi.info(), backupApi.list()]);
        setDbInfo(info.data);
        setBackups(list.data);
      }
    } catch {}
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await settingsApi.bulkUpsert(settings); alert('Settings saved successfully'); }
    catch { alert('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setBackupStatus({ type, msg });
    setTimeout(() => setBackupStatus(null), 4000);
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      if (isElectron) {
        const result = await eAPI.backup.export();
        if (result.cancelled) return;
        if (result.success) showStatus('success', `Backup exported to: ${result.path}`);
        else showStatus('error', result.error || 'Export failed');
      } else {
        await backupApi.create();
        showStatus('success', 'Backup created successfully');
        loadBackupInfo();
      }
    } catch { showStatus('error', 'Backup failed'); }
    finally { setBackupLoading(false); }
  };

  const handleImportRestore = async () => {
    if (!isElectron) return;
    if (!confirm('WARNING: This will replace the current database with the selected backup. All data after the backup date will be lost. Continue?')) return;
    setBackupLoading(true);
    try {
      const result = await eAPI.backup.import();
      if (result.cancelled) return;
      if (result.success) { showStatus('success', 'Database restored successfully. Reloading...'); setTimeout(() => window.location.reload(), 2000); }
      else showStatus('error', result.error || 'Restore failed');
    } catch { showStatus('error', 'Restore failed'); }
    finally { setBackupLoading(false); }
  };

  const handleRestoreAuto = async (filename: string) => {
    if (!confirm(`Restore from backup "${filename}"?\n\nWARNING: Current data will be replaced. This cannot be undone.`)) return;
    setRestoringFile(filename);
    try {
      let result: any;
      if (isElectron) {
        result = await eAPI.backup.restoreAuto(filename);
      } else {
        result = (await backupApi.restore(filename)).data;
      }
      if (result.success) { showStatus('success', 'Restored successfully. Reloading...'); setTimeout(() => window.location.reload(), 2000); }
      else showStatus('error', result.error || result.message || 'Restore failed');
    } catch { showStatus('error', 'Restore failed'); }
    finally { setRestoringFile(null); }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Delete backup "${filename}"?`)) return;
    try {
      if (isElectron) await eAPI.backup.delete(filename);
      else await backupApi.delete(filename);
      showStatus('success', 'Backup deleted');
      loadBackupInfo();
    } catch { showStatus('error', 'Delete failed'); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Settings</div>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Configure system preferences</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Company Settings */}
        <div className="panel" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            COMPANY INFORMATION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {settings.map((setting) => (
              <div key={setting.key}>
                <label className="ab-label">{setting.description}</label>
                <input
                  className="ab-input"
                  value={setting.value}
                  placeholder={setting.description}
                  onChange={(e) => setSettings(settings.map((s) => s.key === setting.key ? { ...s, value: e.target.value } : s))}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Backup & Restore */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* DB Info Card */}
          <div className="panel" style={{ padding: 24 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
              BACKUP & RESTORE
            </div>

            {/* Status Message */}
            {backupStatus && (
              <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 'var(--radius)', background: backupStatus.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${backupStatus.type === 'success' ? 'var(--green-ok)' : 'var(--red-risk)'}`, fontSize: 12, color: backupStatus.type === 'success' ? 'var(--green-ok)' : 'var(--red-risk)', fontFamily: 'IBM Plex Mono,monospace' }}>
                {backupStatus.msg}
              </div>
            )}

            {/* DB Stats */}
            {dbInfo && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', marginBottom: 4 }}>DATABASE SIZE</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace' }}>{formatBytes(dbInfo.dbSize)}</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', marginBottom: 4 }}>SAVED BACKUPS</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace' }}>{dbInfo.backupCount ?? backups.length}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="ab-btn ab-btn-primary" style={{ justifyContent: 'center' }} onClick={handleCreateBackup} disabled={backupLoading}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {isElectron ? 'Export Backup to File' : 'Create Backup'}
              </button>

              {isElectron && (
                <button className="ab-btn ab-btn-outline" style={{ justifyContent: 'center', color: 'var(--amber-warn)', borderColor: 'var(--amber-warn)' }} onClick={handleImportRestore} disabled={backupLoading}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Restore from File...
                </button>
              )}
            </div>

            {!isElectron && (
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', padding: '8px 10px', background: 'var(--paper)', borderRadius: 'var(--radius)', border: '1px solid var(--rule)' }}>
                Export/Import from custom location is available in the desktop app only.
              </div>
            )}
          </div>

          {/* Backup List */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
              <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)' }}>AUTO BACKUPS</span>
              <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={loadBackupInfo}>Refresh</button>
            </div>

            {backups.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>
                No backups yet — backups are created automatically on startup
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {backups.map((b) => (
                  <div key={b.filename} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.filename}</div>
                      <div style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', marginTop: 2 }}>
                        {formatBackupDate(b.createdAt)} · {formatBytes(b.size)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {!isElectron && (
                        <a
                          href={backupApi.downloadUrl(b.filename)}
                          download={b.filename}
                          className="ab-btn ab-btn-icon"
                          title="Download"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                      )}
                      <button
                        className="ab-btn ab-btn-icon"
                        title="Restore"
                        style={{ color: 'var(--amber-warn)' }}
                        onClick={() => handleRestoreAuto(b.filename)}
                        disabled={restoringFile === b.filename}
                      >
                        {restoringFile === b.filename
                          ? <span style={{ fontSize: 9, fontFamily: 'IBM Plex Mono,monospace' }}>...</span>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>}
                      </button>
                      <button
                        className="ab-btn ab-btn-icon danger"
                        title="Delete"
                        onClick={() => handleDeleteBackup(b.filename)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 10, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', lineHeight: 1.6 }}>
              Auto-backups are created on every app startup. Last 10 are kept automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
