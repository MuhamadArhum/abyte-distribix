import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('All fields required'); return; }
    setLoading(true); setError('');
    try {
      const res = await authApi.login(username, password);
      const { access_token, user } = res.data;
      login(user, access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleSeed = async () => {
    try {
      await authApi.seed();
      setError('');
      alert('Admin user created: admin / admin123');
    } catch { setError('Seed failed'); }
  };

  return (
    <div className="login-bg">
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, background: 'var(--safety-orange)',
            borderRadius: 4, marginBottom: 14,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--blueprint-deep)" strokeWidth="2.2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'Oswald, sans-serif', fontSize: 26, fontWeight: 700,
            color: 'var(--paper-light)', letterSpacing: '0.06em',
            textTransform: 'uppercase', margin: 0,
          }}>
            AbyteDistribix
          </h1>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
            color: 'rgba(201,205,209,0.55)', marginTop: 5, letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            LPG Distribution Management
          </p>
        </div>

        {/* Card */}
        <div className="login-card">
          <h2 style={{
            fontFamily: 'Oswald, sans-serif', fontSize: 17, fontWeight: 600,
            color: 'var(--blueprint)', letterSpacing: '0.05em', textTransform: 'uppercase',
            margin: '0 0 6px',
          }}>
            Sign In
          </h2>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--steel)', marginBottom: 22 }}>
            Enter your credentials to access the system
          </p>

          {error && (
            <div style={{
              padding: '9px 12px', background: 'rgba(194,59,46,0.10)', border: '1px solid rgba(194,59,46,0.25)',
              borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red-risk)', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--steel)', marginBottom: 6,
              }}>
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: '#fff', border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)', fontSize: 13,
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  color: 'var(--ink)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label style={{
                display: 'block', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--steel)', marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '9px 38px 9px 12px',
                    background: '#fff', border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius)', fontSize: 13,
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    color: 'var(--ink)', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: 'var(--steel)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPw
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? 'var(--blueprint-light)' : 'var(--blueprint)',
                color: 'var(--paper-light)',
                fontFamily: 'Oswald, sans-serif', fontSize: 15, fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--rule)', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleSeed}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                color: 'var(--safety-orange-deep)', textDecoration: 'underline',
              }}
            >
              First time? Create default admin user
            </button>
          </div>
        </div>

        <p style={{
          textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10, color: 'rgba(201,205,209,0.35)', marginTop: 20, letterSpacing: '0.04em',
        }}>
          © 2026 AbyteDistribix · LPG Management System
        </p>
      </div>
    </div>
  );
}
