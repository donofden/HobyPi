
import './dashboard.css';

export default function SystemDashboard({ metrics, onLogout, setPage }) {
  return (
    <div className="dashboard-bg">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/HobyPi.png" alt="HobyPi logo" width={32} height={32} />
          <span className="dashboard-title">HobyPi Control Center</span>
        </div>
        <button onClick={onLogout} className="dashboard-btn">Logout</button>
      </header>
      <main className="dashboard-main">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="dashboard-card">
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>Current Time</div>
            <div style={{ fontSize: 22 }}>{new Date().toLocaleTimeString()}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>System uptime: {metrics?.human?.uptime_h ?? '--'}h</div>
          </div>
          <div className="dashboard-card">
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>CPU Temperature</div>
            <div style={{ fontSize: 22 }}>{metrics?.temperature_c ? metrics.temperature_c.toFixed(1) + '°C' : '--'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>Average: {metrics?.cpu?.avg ? metrics.cpu.avg.toFixed(1) + '%' : '--'}</div>
          </div>
          <div className="dashboard-card">
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>Memory Usage</div>
            <div style={{ fontSize: 22 }}>{metrics?.memory?.percent ? metrics.memory.percent + '%' : '--'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>{metrics?.human?.mem_used} / {metrics?.human?.mem_total}</div>
          </div>
          <div className="dashboard-card">
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>Disk Usage</div>
            <div style={{ fontSize: 22 }}>{metrics?.disk_root?.percent ? metrics.disk_root.percent + '%' : '--'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>{metrics?.human?.disk_used} / {metrics?.human?.disk_total}</div>
          </div>
        </div>
        <div className="dashboard-card">
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>CPU per core</div>
          {(metrics?.cpu?.per_core ?? []).map((usage, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 60 }}>Core {i}:</span>
              <div style={{ flex: 1, background: 'var(--muted, #e5e7eb)', borderRadius: 6, height: 10 }}>
                <div style={{ width: `${Math.min(100, Math.max(0, usage))}%`, height: 10, background: 'var(--primary, #60a5fa)', borderRadius: 6 }} />
              </div>
              <span style={{ width: 40, textAlign: 'right' }}>{usage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div className="dashboard-card">
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>System Status</div>
          <div className="dashboard-status">
            <div>
              <div style={{ fontSize: 13 }}>Backend Status</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>{metrics?.apiBase ?? '--'}</div>
            </div>
            <span className="dashboard-online">Online</span>
          </div>
          <div className="dashboard-throttle">
            <div style={{ fontSize: 13 }}>Throttle Status</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>{metrics?.throttled?.hex ?? '--'}</div>
          </div>
        </div>

        {/* Main dashboard cards for modules */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginTop: 32 }}>
          <div className="dashboard-card dashboard-link" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
            <img src="/placeholder-logo.png" alt="Home Control" style={{ width: 32, height: 32, marginBottom: 8 }} />
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Home Control</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground, #64748b)' }}>Control lights, temperature, and room settings</div>
          </div>
          <div className="dashboard-card dashboard-link" onClick={() => setPage('cameras')} style={{ cursor: 'pointer' }}>
            <img src="/front-door-security-camera-view.jpg" alt="Camera System" style={{ width: 32, height: 32, marginBottom: 8 }} />
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Camera System</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground, #64748b)' }}>Monitor and manage connected cameras</div>
          </div>
          <div className="dashboard-card dashboard-link" onClick={() => setPage('bills')} style={{ cursor: 'pointer' }}>
            <img src="/placeholder-logo.png" alt="Bills Analytics" style={{ width: 32, height: 32, marginBottom: 8 }} />
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Bills Analytics</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground, #64748b)' }}>Track power and gas usage expenses</div>
          </div>
          <div className="dashboard-card dashboard-link" onClick={() => setPage('todos')} style={{ cursor: 'pointer' }}>
            <img src="/placeholder-user.jpg" alt="Todo List" style={{ width: 32, height: 32, marginBottom: 8 }} />
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Todo List</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground, #64748b)' }}>Manage tasks and reminders</div>
          </div>
          <div className="dashboard-card dashboard-link" onClick={() => setPage('calendar')} style={{ cursor: 'pointer' }}>
            <img src="/calendar-component.png" alt="Calendar" style={{ width: 32, height: 32, marginBottom: 8 }} />
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Calendar</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground, #64748b)' }}>Schedule events and appointments</div>
          </div>
        </div>
      </main>
    </div>
  );
}
