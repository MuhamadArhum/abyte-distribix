import React, { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';

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

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await settingsApi.bulkUpsert(settings); alert('Settings saved successfully'); }
    catch { alert('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Settings</div>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Configure system preferences</div>
      </div>

      <div style={{ maxWidth: 600 }}>
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
      </div>
    </div>
  );
}
