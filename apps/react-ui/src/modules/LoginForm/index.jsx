
import React, { useState } from 'react';
import './login.css';

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
    <div className="login-bg">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/HobyPi.png" alt="HobyPi logo" width={200} height={200} />
          <div className="login-muted">RaspberryPI System</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="login-input"
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Password</label>
            <div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="login-input"
              />
              <label style={{ display: 'flex', alignItems: 'center', marginTop: 8, fontSize: '0.95rem' }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Show password
              </label>
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={isLoading} className="login-btn">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="login-demo">
          Demo credentials: admin / hobypi
        </div>
      </div>
    </div>
  );
}
