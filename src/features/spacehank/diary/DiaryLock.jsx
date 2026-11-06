import { tr } from '../lang';
import { useEffect, useRef, useState } from 'react';
import { Fingerprint, Lock } from 'lucide-react';
import { login } from '../api/realtime';
import { isDemo } from '../demo/mode';
import Pet from '../pet/Pet';
import { useStore } from '../store';
import { describeLockError, diaryLock, resetLock, unlockDiary } from './lock';
import { SoftButton } from './ui';

/** The screen over a locked diary: Niú keeps the book shut until the phone says it is you. Asks once as it opens. */
export default function DiaryLock() {
  const { busy } = useStore(diaryLock);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const asked = useRef(false);
  const demo = isDemo();

  const unlock = async () => {
    setError('');
    try {
      await unlockDiary();
    } catch (problem) {
      setError(describeLockError(problem));
    }
  };

  // opening the diary is already asking for it: no need to find the button
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    if (!diaryLock.get().quiet) void unlock();
  }, []);

  const reset = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (!demo) await login(password);
      resetLock();
    } catch {
      setError(tr('Mật khẩu chưa đúng.'));
    }
  };

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-5 py-10 text-center" data-diary-lock aria-label={tr('Nhật ký đang khoá')}>
      <div className="relative w-28">
        <Pet mood="sleepy" size="100%" />
        <span className="absolute -right-1 bottom-1 grid size-9 place-items-center rounded-full bg-[#e0a458] text-[#1b1407] shadow-lg">
          <Lock size={17} aria-hidden="true" />
        </span>
      </div>
      <div>
        <h1 className="font-display text-[2.2rem] leading-none text-[color:var(--dz-text)]">{tr('Nhật ký đang khoá')}</h1>
        <p className="mx-auto mt-2 max-w-[18rem] font-body text-[0.9rem] leading-relaxed text-[color:var(--dz-text-2)]">{tr('Chạm vân tay để mở. Niú đang giữ sổ cho bạn.')}</p>
      </div>
      <SoftButton onClick={unlock} disabled={busy} className="min-h-12 px-7" data-unlock>
        <Fingerprint size={20} aria-hidden="true" /> {tr('Mở bằng vân tay')}
      </SoftButton>
      <p className="min-h-5 max-w-[18rem] font-body text-[0.85rem] text-[color:var(--dz-warn)]" role="alert">
        {error}
      </p>

      {resetting ? (
        <form onSubmit={reset} className="flex w-full max-w-[18rem] flex-col gap-2" data-reset>
          <p className="font-body text-[0.82rem] leading-snug text-[color:var(--dz-text-2)]">{demo ? tr('Gỡ khoá nhật ký trên máy này? Các trang vẫn còn nguyên.') : tr('Nhập mật khẩu Hank62 để gỡ khoá. Các trang vẫn còn nguyên.')}</p>
          {!demo && <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" aria-label={tr('Mật khẩu Hank62')} className="rounded-full border border-[color:var(--dz-handle)] bg-[color:var(--dz-field)] px-4 py-2.5 text-center font-body text-[0.95rem] text-[color:var(--dz-text)] outline-none focus:border-[#e0a458]" />}
          <SoftButton type="submit" tone="soft" disabled={!demo && !password}>
            {tr('Gỡ khoá')}
          </SoftButton>
        </form>
      ) : (
        <button type="button" onClick={() => setResetting(true)} className="font-body text-[0.82rem] text-[color:var(--dz-text-3)] underline underline-offset-4">
          {tr('Không mở được?')}
        </button>
      )}
    </section>
  );
}
