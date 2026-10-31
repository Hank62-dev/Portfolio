import { useState } from 'react';

const messageFor = (error) =>
  error.message === 'Failed to fetch' ? 'Realtime server is unreachable. Check that it is running.' : error.message;

export function AuthLoading() {
  return (
    <div className="space-auth auth-loading">
      <div className="auth-spinner" />
      <span>Securing workspace…</span>
    </div>
  );
}

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(password);
    } catch (loginError) {
      setError(messageFor(loginError));
      setLoading(false);
    }
  };

  return (
    <div className="space-auth">
      <div className="auth-glow" />
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-mark">✦</div>
        <div className="auth-kicker">PRIVATE WORKSPACE / 01</div>
        <h1>Welcome back.</h1>
        <p>This space is reserved for the people running the company.</p>
        {/* Hidden username field so password managers treat this as a login form. */}
        <input type="text" name="username" autoComplete="username" value="owner" readOnly hidden />
        <label htmlFor="space-password">Access key</label>
        <input
          id="space-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your workspace password"
        />
        <button type="submit" disabled={loading || !password}>
          {loading ? 'Checking access…' : 'Enter SpaceHank ↗'}
        </button>
        {error && <div className="auth-error">{error}</div>}
        <small className="auth-note">Session protected · 12 hour expiry</small>
      </form>
    </div>
  );
}
