import React, { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('hobypi');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      if (username === 'admin' && password === 'hobypi') {
        if (onLogin) onLogin();
      } else {
        setError('Invalid username or password');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div style={{ maxWidth: 340, margin: '40px auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <img src="/HobyPi.png" alt="HobyPi logo" width={48} height={48} />
        <h2 style={{ fontWeight: 'bold', fontSize: 22, margin: '8px 0' }}>HobyPi</h2>
        <div style={{ color: '#64748b', fontSize: 14 }}>Home Control & Automation System</div>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: 4 }}>Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #e5e7eb' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: 4 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #e5e7eb', paddingRight: 32 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 4, top: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px 0', borderRadius: 4, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 16 }}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
        Demo credentials: admin / hobypi
      </div>
    </div>
  );
}
