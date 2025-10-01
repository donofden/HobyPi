


import React from 'react';
import LoginForm from './modules/LoginForm/index.jsx';
import SystemDashboard from './modules/SystemDashboard/index.jsx';
import BillsAnalytics from './modules/BillsAnalytics/index.jsx';
import CalendarComponent from './modules/CalendarComponent/index.jsx';
import CameraSystem from './modules/CameraSystem/index.jsx';
import HomeControlPanel from './modules/HomeControlPanel/index.jsx';
import TodoListModule from './modules/TodoListModule/index.jsx';
import { API_BASE } from './constants.js';
import { tokenManager, authenticatedFetch, apiEndpoints } from './utils/auth.js';

export default function App() {
  const [metrics, setMetrics] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [page, setPage] = React.useState('dashboard');
  const [user, setUser] = React.useState(null);

  // Check if user is already authenticated on app load
  React.useEffect(() => {
    const isAuth = tokenManager.isAuthenticated();
    console.log('App startup - isAuthenticated:', isAuth);
    if (isAuth) {
      const userInfo = tokenManager.getUserInfo();
      console.log('App startup - stored user info:', userInfo);
      setUser(userInfo);
      setLoggedIn(true);
    } else {
      console.log('App startup - no valid authentication found');
    }
  }, []);

  React.useEffect(() => {
    if (!loggedIn || page !== 'dashboard') return;
    async function fetchMetrics() {
      try {
        const res = await authenticatedFetch(`${apiEndpoints.systemMetrics}?sample_ms=200&top_n=5`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMetrics({ ...data, apiBase: API_BASE });
        setErr(null);
      } catch (e) {
        console.error('Error fetching metrics:', e);
        setErr(e.message);
      }
    }
    fetchMetrics();
    const id = setInterval(fetchMetrics, 2000);
    return () => clearInterval(id);
  }, [loggedIn, page]);

  const handleLogin = (authData) => {
    console.log('handleLogin received:', authData);
    console.log('User data:', authData.user);
    setUser(authData.user);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    console.log('Logout initiated - clearing auth data...');
    tokenManager.clearAuthData();
    console.log('Auth data cleared, updating React state...');
    setLoggedIn(false);
    setUser(null);
    setMetrics(null);
    setPage('dashboard');
    setErr(null);
    console.log('Logout completed - should show login form');
  };

  if (!loggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Dashboard is the main hub, shows cards/buttons to access modules
  if (page === 'dashboard') {
    return (
      <>
        <SystemDashboard 
          metrics={metrics} 
          apiBase={API_BASE} 
          onLogout={handleLogout} 
          setPage={setPage} 
          user={user}
        />
        {err && <p style={{ color: 'crimson', marginTop: 12, textAlign: 'center' }}>API error: {err}</p>}
      </>
    );
  }
  if (page === 'bills') return <BillsAnalytics onBack={() => setPage('dashboard')} user={user} />;
  if (page === 'calendar') return <CalendarComponent onBack={() => setPage('dashboard')} user={user} />;
  if (page === 'cameras') return <CameraSystem onBack={() => setPage('dashboard')} user={user} />;
  if (page === 'home') return <HomeControlPanel onBack={() => setPage('dashboard')} user={user} />;
  if (page === 'todos') return <TodoListModule onBack={() => setPage('dashboard')} user={user} />;
  return null;
}
