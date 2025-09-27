import React from 'react';

// Lightweight dashboard component for Raspberry Pi
export default function SystemDashboard({ metrics, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/HobyPi.png" alt="HobyPi logo" width={32} height={32} />
          <span style={{ fontWeight: 'bold', fontSize: 18 }}>HobyPi Control Center</span>
        </div>
        <button onClick={onLogout} style={{ border: '1px solid #e5e7eb', background: '#fff', padding: '6px 16px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
      </header>
      <main style={{ padding: 24 }}>
        {/* System Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>Current Time</div>
            <div style={{ fontSize: 22 }}>{new Date().toLocaleTimeString()}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>System uptime: {metrics?.human?.uptime_h ?? '--'}h</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>CPU Temperature</div>
            <div style={{ fontSize: 22 }}>{metrics?.temperature_c ? metrics.temperature_c.toFixed(1) + '°C' : '--'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Average: {metrics?.cpu?.avg ? metrics.cpu.avg.toFixed(1) + '%' : '--'}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>Memory Usage</div>
            <div style={{ fontSize: 22 }}>{metrics?.memory?.percent ? metrics.memory.percent + '%' : '--'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{metrics?.human?.mem_used} / {metrics?.human?.mem_total}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>Disk Usage</div>
            <div style={{ fontSize: 22 }}>{metrics?.disk_root?.percent ? metrics.disk_root.percent + '%' : '--'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{metrics?.human?.disk_used} / {metrics?.human?.disk_total}</div>
          </div>
        </div>
        {/* CPU Core Usage */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>CPU per core</div>
          {(metrics?.cpu?.per_core ?? []).map((usage, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 60 }}>Core {i}:</span>
              <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 6, height: 10 }}>
                <div style={{ width: `${Math.min(100, Math.max(0, usage))}%`, height: 10, background: '#60a5fa', borderRadius: 6 }} />
              </div>
              <span style={{ width: 40, textAlign: 'right' }}>{usage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        {/* Backend Status */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>System Status</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13 }}>Backend Status</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{metrics?.apiBase ?? '--'}</div>
            </div>
            <span style={{ background: '#22c55e', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>Online</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13 }}>Throttle Status</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{metrics?.throttled?.hex ?? '--'}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
