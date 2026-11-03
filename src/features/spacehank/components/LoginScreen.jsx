import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Card, ErrorState, Eyebrow, Field, Input, Loading, Skeleton } from '../../../design-system';

const messageFor = (error) =>
  error.message === 'Failed to fetch' ? 'Realtime server is unreachable. Check that it is running.' : error.message;

export function AuthLoading({ label = 'Securing workspace' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-0 px-gutter">
      <Loading label={label} className="flex w-[min(22rem,100%)] flex-col gap-4 rounded-card border border-line bg-ink-1 p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </Loading>
    </div>
  );
}

export default function LoginScreen({ onLogin, onGuest }) {
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
    <div className="grid min-h-screen place-items-center bg-ink-0 px-gutter py-10">
      <Card as="form" onSubmit={submit} className="flex w-full max-w-[420px] flex-col gap-5 p-7 shadow-pop">
        <span className="grid size-10 place-items-center rounded-sm bg-signal text-ink-0">
          <Sparkles size={18} aria-hidden="true" />
        </span>
        <div>
          <Eyebrow>PRIVATE WORKSPACE / 01</Eyebrow>
          <h1 className="mt-2 font-display text-h2 leading-none">Welcome back.</h1>
          <p className="mt-2 text-bone-dim">This space is reserved for the people running the company.</p>
        </div>
        {/* Hidden username field so password managers treat this as a login form. */}
        <input type="text" name="username" autoComplete="username" value="owner" readOnly hidden />
        <Field label="Access key">
          {(props) => (
            <Input
              {...props}
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your workspace password"
            />
          )}
        </Field>
        <Button type="submit" loading={loading} disabled={!password}>
          {loading ? 'Checking access…' : 'Enter SpaceHank ↗'}
        </Button>
        {error && <ErrorState title="Could not sign in" message={error} />}
        {onGuest && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={onGuest}>
              Look around as a guest
            </Button>
            <small className="text-center font-mono text-fine text-bone-faint">A demo with sample data. Nothing private is shown.</small>
          </div>
        )}
        <small className="text-center font-mono text-fine text-bone-faint">Session protected · 12 hour expiry</small>
      </Card>
    </div>
  );
}
