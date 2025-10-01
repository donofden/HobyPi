
import React, { useState } from 'react';
import './login.css';
import { API_BASE } from '../../constants';

export default function LoginForm({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('letmein');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call the authentication endpoint with JSON payload
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: username,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Fetch user details from /auth/me endpoint
        const userResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `${data.token_type} ${data.access_token}`,
          },
        });

        let userData = null;
        if (userResponse.ok) {
          userData = await userResponse.json();
          console.log('User data from /auth/me:', userData);
        }
        
        // Store token and user info in localStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('token_type', data.token_type);
        if (userData) {
          localStorage.setItem('user_info', JSON.stringify(userData));
          console.log('Stored user info:', userData);
        }
        
        // Call onLogin to update app state
        console.log('Calling onLogin with:', { ...data, user: userData });
        if (onLogin) onLogin({ ...data, user: userData });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
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
          Demo credentials: admin / letmein
        </div>
      </div>
    </div>
  );
}
