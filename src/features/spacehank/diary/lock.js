import { isDemo } from '../demo/mode';
import { createStore } from '../store';

// The diary lock. The browser's own sign-in (WebAuthn) asks the phone for a fingerprint, a face, or the screen lock when the
// phone has none of those, and tells the page it passed. The page then shows the diary.
//
// What it is and is not: it keeps whoever picks up the phone from reading the diary, on the diary tab and in Second Brain.
// It is a gate in the page, not encryption: the pages are still stored as they were, on this device.

const KEY = () => (isDemo() ? 'hank62.demo.diary.lock' : 'hank62.diary.lock');
export const AWAY_MS = 60 * 1000; // leave the app for a minute and the diary locks itself

const bytes = (n) => crypto.getRandomValues(new Uint8Array(n));
const encode = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const decode = (text) => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY()) ?? 'null');
    return typeof saved?.id === 'string' ? saved : null;
  } catch {
    return null;
  }
};
const write = (value) => {
  try {
    if (value) localStorage.setItem(KEY(), JSON.stringify(value));
    else localStorage.removeItem(KEY());
  } catch {
    /* private mode: the lock lasts as long as this visit */
  }
};

/** enabled: a lock is set up. unlocked: this visit has passed it. busy: the phone is being asked. quiet: it was locked on purpose, so do not ask again at once. */
export const diaryLock = createStore({ enabled: Boolean(read()), unlocked: !read(), busy: false, quiet: false });

/** Whether the diary is hidden right now. */
export const isLocked = () => diaryLock.get().enabled && !diaryLock.get().unlocked;

/** The notes that may be shown: while the diary is locked, its pages (the notes that have a day) are left out. Pure. */
export const hideLocked = (notes, locked) => (locked ? notes.filter((note) => !note.day) : notes);

/** Notes that may be shown right now, for code that is not a component. */
export const readable = (notes) => hideLocked(notes, isLocked());

/** What to tell the person when the phone said no. */
export const describeLockError = (error) => {
  switch (error?.name) {
    case 'NotAllowedError':
      return 'Chưa xác thực được. Có thể bạn đã huỷ hoặc quá thời gian, thử lại nhé.';
    case 'InvalidStateError':
      return 'Khoá này đã được tạo trên máy này rồi.';
    case 'NotSupportedError':
      return 'Máy này chưa hỗ trợ khoá bằng vân tay hay khuôn mặt.';
    case 'SecurityError':
      return 'Trình duyệt chỉ cho dùng vân tay trên trang https hoặc localhost.';
    default:
      return 'Không dùng được vân tay lúc này. Thử lại sau nhé.';
  }
};

/** Whether this browser can ask for a fingerprint at all (it needs https or localhost, and a screen lock on the phone). */
export const canUseFingerprint = async () => {
  try {
    if (typeof window === 'undefined' || !window.isSecureContext || !('PublicKeyCredential' in window) || !navigator.credentials) return false;
    return Boolean(await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
};

const ask = async (work) => {
  diaryLock.set({ busy: true });
  try {
    return await work();
  } finally {
    diaryLock.set({ busy: false });
  }
};

/** Sets the lock up: the phone makes a key that only opens with the person's fingerprint. Throws if they say no. */
export const enableLock = () =>
  ask(async () => {
    const credential = await navigator.credentials.create({
      publicKey: {
        rp: { name: 'Hank62', id: window.location.hostname },
        user: { id: bytes(16), name: 'nhat-ky', displayName: 'Nhật ký' },
        challenge: bytes(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        attestation: 'none',
        timeout: 60000,
      },
    });
    if (!credential) throw new DOMException('No credential', 'NotAllowedError');
    write({ id: encode(credential.rawId), at: Date.now() });
    diaryLock.set({ enabled: true, unlocked: true });
  });

/** Asks for the fingerprint. Resolves when it passes, throws when it does not. */
export const unlockDiary = () =>
  ask(async () => {
    const saved = read();
    if (!saved) {
      diaryLock.set({ enabled: false, unlocked: true });
      return;
    }
    const proof = await navigator.credentials.get({
      publicKey: {
        challenge: bytes(32),
        rpId: window.location.hostname,
        allowCredentials: [{ type: 'public-key', id: decode(saved.id), transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (!proof) throw new DOMException('No proof', 'NotAllowedError');
    diaryLock.set({ unlocked: true, quiet: false });
  });

/** Puts the lock back on. `quiet` is for when the person asked for it: the screen then waits instead of asking for the fingerprint at once. */
export const lockDiary = ({ quiet = false } = {}) => {
  if (diaryLock.get().enabled) diaryLock.set({ unlocked: false, quiet });
};

/** Takes the lock off, after the fingerprint has been asked for once more. */
export const disableLock = async () => {
  await unlockDiary();
  write(null);
  diaryLock.set({ enabled: false, unlocked: true });
};

/** Takes the lock off without the fingerprint: for when the phone's key is gone. The caller must have checked who is asking. */
export const resetLock = () => {
  write(null);
  diaryLock.set({ enabled: false, unlocked: true });
};

/** True when the diary is open, or after the person unlocks it now. For a screen that wants a page of it. */
export const ensureUnlocked = async () => {
  if (!isLocked()) return true;
  try {
    await unlockDiary();
    return true;
  } catch {
    return false;
  }
};

// leaving the app for a while locks the diary again
if (typeof document !== 'undefined') {
  let leftAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leftAt = Date.now();
    else if (leftAt && Date.now() - leftAt > AWAY_MS) {
      lockDiary();
      leftAt = 0;
    }
  });
}
