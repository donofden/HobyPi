


import React from 'react';
import LoginForm from './modules/LoginForm.jsx';
import SystemDashboard from './modules/SystemDashboard.jsx';
import { API_BASE } from './constants.js';

export default function App() {
  const [metrics, setMetrics] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [loggedIn, setLoggedIn] = React.useState(false);

  React.useEffect(() => {
    if (!loggedIn) return;
    async function fetchMetrics() {
      try {
        const res = await fetch(`${API_BASE}/system/metrics?sample_ms=200&top_n=5`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMetrics({ ...data, apiBase: API_BASE });
        setErr(null);
      } catch (e) {
        setErr(e.message);
      }
    }
    fetchMetrics();
    const id = setInterval(fetchMetrics, 2000);
    return () => clearInterval(id);
  }, [loggedIn]);

  if (!loggedIn) {
    return <LoginForm onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <>
      <SystemDashboard metrics={metrics} onLogout={() => setLoggedIn(false)} />
      {err && <p style={{ color: 'crimson', marginTop: 12, textAlign: 'center' }}>API error: {err}</p>}
    </>
  );
}
