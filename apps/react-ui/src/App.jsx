


import React from 'react';
import LoginForm from './modules/LoginForm/index.jsx';
import SystemDashboard from './modules/SystemDashboard/index.jsx';
import BillsAnalytics from './modules/BillsAnalytics/index.jsx';
import CalendarComponent from './modules/CalendarComponent/index.jsx';
import CameraSystem from './modules/CameraSystem/index.jsx';
import HomeControlPanel from './modules/HomeControlPanel/index.jsx';
import TodoListModule from './modules/TodoListModule/index.jsx';
import { API_BASE } from './constants.js';

export default function App() {
  const [metrics, setMetrics] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [page, setPage] = React.useState('dashboard');

  React.useEffect(() => {
    if (!loggedIn || page !== 'dashboard') return;
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
  }, [loggedIn, page]);

  if (!loggedIn) {
    return <LoginForm onLogin={() => setLoggedIn(true)} />;
  }

  // Dashboard is the main hub, shows cards/buttons to access modules
  if (page === 'dashboard') {
    return (
      <>
        <SystemDashboard metrics={metrics} onLogout={() => setLoggedIn(false)} setPage={setPage} />
        {err && <p style={{ color: 'crimson', marginTop: 12, textAlign: 'center' }}>API error: {err}</p>}
      </>
    );
  }
  if (page === 'bills') return <BillsAnalytics onBack={() => setPage('dashboard')} />;
  if (page === 'calendar') return <CalendarComponent onBack={() => setPage('dashboard')} />;
  if (page === 'cameras') return <CameraSystem onBack={() => setPage('dashboard')} />;
  if (page === 'home') return <HomeControlPanel onBack={() => setPage('dashboard')} />;
  if (page === 'todos') return <TodoListModule onBack={() => setPage('dashboard')} />;
  return null;
}
