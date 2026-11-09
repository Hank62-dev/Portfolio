import { useEffect, useState } from 'react';
import Logo from '../../../components/ui/Logo';
import { Button, Card, ErrorState, Eyebrow, Field, Input, Loading, Skeleton } from '../../../design-system';
import { tr } from '../lang';

const messageFor = (error) => {
  if (error.message === 'Failed to fetch') return tr('Realtime server is unreachable. Check that it is running.');
  if (error.retryAfter) return tr('Sign-in is locked for {0}: each wrong try past the first few locks it for longer.', wait(error.retryAfter));
  if (error.attemptsLeft === 1) return tr('Wrong access key. One more wrong try locks sign-in for a while.');
  if (error.attemptsLeft > 1) return tr('Wrong access key. {0} tries left before sign-in locks for a while.', error.attemptsLeft);
  return error.message;
};

/** 28 -> "28 s", 150 -> "2 min 30 s", 3600 -> "60 min": how long the wait is, in words. */
const wait = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return tr('{0} s', s);
  return s % 60 ? tr('{0} min {1} s', Math.floor(s / 60), s % 60) : tr('{0} min', s / 60);
};
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.ceil(seconds) % 60).padStart(2, '0')}`;

// when sign-in is locked, kept in this browser too, so a reload still shows the countdown (the server is what enforces it)
const LOCK_KEY = 'hank62.loginLockedUntil';
const readLock = () => {
  try {
    const until = Number(localStorage.getItem(LOCK_KEY));
    return until > Date.now() ? until : 0;
  } catch {
    return 0;
  }
};
const writeLock = (until) => {
  try {
    if (until) localStorage.setItem(LOCK_KEY, String(until));
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    /* the countdown lasts until the page closes */
  }
};

/** Seconds left of a lockout, counting down every second; 0 when sign-in is open. */
function useLock() {
  const [until, setUntil] = useState(readLock);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const tick = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= until) {
        setUntil(0);
        writeLock(0);
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [until]);
  const lockFor = (seconds) => {
    const next = seconds > 0 ? Date.now() + seconds * 1000 : 0;
    setNow(Date.now());
    setUntil(next);
    writeLock(next);
  };
  return [until ? Math.max(0, (until - now) / 1000) : 0, lockFor];
}

export function AuthLoading({ label = tr('Securing workspace') }) {
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

/** The realtime server is on this computer but does not answer the page: say what to check, instead of a skeleton for ever. */
export function ServerUnreachable({ apiUrl }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-0 px-gutter">
      <div role="alert" className="flex w-[min(30rem,100%)] flex-col gap-3 rounded-card border border-line bg-ink-1 p-6" data-server-unreachable>
        <span className="font-mono text-[0.68rem] tracking-[0.12em] text-warn uppercase">{tr('Cannot reach the local server')}</span>
        <h1 className="font-display text-h3 leading-tight text-bone">{tr('This page cannot talk to')} {apiUrl}</h1>
        <ul className="list-disc space-y-1.5 pl-5 text-fine text-bone-dim">
          <li>
            {tr('Is it running? Start it from a terminal with')} <code className="font-mono text-bone">{tr('npm run spacehank:server')}</code>.
          </li>
          <li>
            {tr('Is its origin this page\'s? It must be exactly')} <code className="font-mono text-bone">{window.location.origin}</code> {tr('in')} <code className="font-mono text-bone">{tr('SPACEHANK_ORIGIN')}</code> {tr('(in')} <code className="font-mono text-bone">{tr('.env')}</code>{tr('). A value already set in that terminal, such as the Vercel address, wins over')} <code className="font-mono text-bone">{tr('.env')}</code>{tr(': close the terminal, or clear it with')} <code className="font-mono text-bone">{tr('Remove-Item Env:SPACEHANK_ORIGIN')}</code>{tr(', then start the server again.')}
          </li>
        </ul>
        <p className="font-mono text-[0.72rem] text-bone-faint">{tr('This page keeps trying by itself and will carry on as soon as the server answers.')}</p>
      </div>
    </div>
  );
}

export default function LoginScreen({ onLogin, onGuest }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locked, lockFor] = useLock();

  const submit = async (event) => {
    event.preventDefault();
    if (locked) return;
    setLoading(true);
    setError('');
    try {
      await onLogin(password);
      lockFor(0);
    } catch (loginError) {
      setError(messageFor(loginError));
      if (loginError.retryAfter) {
        lockFor(loginError.retryAfter);
        setPassword('');
      }
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-0 px-gutter py-10">
      <Card as="form" onSubmit={submit} className="flex w-full max-w-[420px] flex-col gap-5 p-7 shadow-pop">
        <Logo className="size-12 rounded-lg" />
        <div>
          <Eyebrow>{tr('PRIVATE WORKSPACE / 01')}</Eyebrow>
          <h1 className="mt-2 font-display text-h2 leading-none">{tr('Welcome back.')}</h1>
          <p className="mt-2 text-bone-dim">{tr('This space is reserved for the people running the company.')}</p>
        </div>
        {/* Hidden username field so password managers treat this as a login form. */}
        <input type="text" name="username" autoComplete="username" value="owner" readOnly hidden />
        <Field label={tr('Access key')}>
          {(props) => (
            <Input
              {...props}
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={tr('Enter your workspace password')}
            />
          )}
        </Field>
        <Button type="submit" loading={loading} disabled={!password || locked > 0}>
          {loading ? tr('Checking access…') : locked > 0 ? tr('Try again in {0}', clock(locked)) : tr('Enter SpaceHank ↗')}
        </Button>
        {error && <ErrorState title={locked > 0 ? tr('Sign-in is locked for now') : tr('Could not sign in')} message={error} />}
        {!error && locked > 0 && <ErrorState title={tr('Sign-in is locked for now')} message={tr('Too many wrong tries. Wait a moment, then try again.')} />}
        {onGuest && (
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={onGuest}>
              {tr('Look around as a guest')}
            </Button>
            <small className="text-center font-mono text-fine text-bone-faint">{tr('A demo with sample data. Nothing private is shown.')}</small>
          </div>
        )}
        <small className="text-center font-mono text-fine text-bone-faint">{tr('Session protected · 12 hour expiry')}</small>
      </Card>
    </div>
  );
}
