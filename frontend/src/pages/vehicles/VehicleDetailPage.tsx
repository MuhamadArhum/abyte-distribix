import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehiclesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Vehicle, Delivery } from '@/types';

const STATUS_PILL: Record<string, string> = {
  PENDING: 'pill-steel', IN_TRANSIT: 'pill-blue', DELIVERED: 'pill-green', FAILED: 'pill-red', CANCELLED: 'pill-amber',
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle & { deliveries?: Delivery[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    vehiclesApi.getOne(id).then((r) => setVehicle(r.data)).catch(() => navigate('/vehicles')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;
  if (!vehicle) return null;

  const deliveries = vehicle.deliveries || [];
  const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const inTransit = deliveries.filter((d) => d.status === 'IN_TRANSIT').length;
  const failed = deliveries.filter((d) => d.status === 'FAILED').length;

  return (
    <div className="page-content">
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ab-btn ab-btn-outline" onClick={() => navigate('/vehicles')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div>
            <div className="section-title">{vehicle.vehicleNumber}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{vehicle.vehicleCode} · {vehicle.vehicleType}</div>
          </div>
        </div>
        <span className={`pill ${vehicle.status === 'ACTIVE' ? 'pill-green' : vehicle.status === 'MAINTENANCE' ? 'pill-amber' : 'pill-steel'}`} style={{ fontSize: 12, padding: '4px 12px' }}>{vehicle.status}</span>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Deliveries</span></div>
          <div className="kpi-value">{deliveries.length}</div>
          <div className="kpi-sub">Most recent 50</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-top"><span className="kpi-label">Delivered</span></div>
          <div className="kpi-value">{delivered}</div>
          <div className="kpi-sub">Completed</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">In Transit</span></div>
          <div className="kpi-value">{inTransit}</div>
          <div className="kpi-sub">On the road</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Failed</span></div>
          <div className="kpi-value">{failed}</div>
          <div className="kpi-sub">Needs follow-up</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Info Panel */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>VEHICLE DETAILS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { label: 'Type', val: vehicle.vehicleType },
              { label: 'Capacity', val: `${vehicle.capacity} cylinders` },
              { label: 'Status', val: vehicle.status },
              { label: 'Since', val: formatDate(vehicle.createdAt) },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
                <span style={{ color: 'var(--steel)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery History */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>DELIVERY HISTORY</div>
          {deliveries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No deliveries recorded</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Delivery #</th><th>Customer</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{d.deliveryNumber}</span></td>
                      <td><span className="row-title">{d.customer?.businessName || '—'}</span></td>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(d.deliveryDate)}</span></td>
                      <td><span className={`pill ${STATUS_PILL[d.status] || 'pill-steel'}`}>{d.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
