import { useEffect, useState } from 'react';
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { canUseFingerprint, describeLockError, diaryLock, disableLock, enableLock, lockDiary } from './lock';
import { useStore } from '../../core/store';
import { PaperSheet, SheetClose, SoftButton } from './ui';
import { tr } from '../../core/i18n/lang';

/** Turning the lock on and off. */
export default function LockSettings({ onClose, onNotify }) {
  const { enabled, busy } = useStore(diaryLock);
  const [supported, setSupported] = useState(null); // null while the browser is asked
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    canUseFingerprint().then((ok) => live && setSupported(ok));
    return () => {
      live = false;
    };
  }, []);

  const turnOn = async () => {
    setError('');
    try {
      await enableLock();
      onNotify?.(tr('Đã bật khoá nhật ký.'));
    } catch (problem) {
      setError(describeLockError(problem));
    }
  };

  const turnOff = async () => {
    setError('');
    try {
      await disableLock();
      onNotify?.(tr('Đã tắt khoá nhật ký.'));
    } catch (problem) {
      setError(describeLockError(problem));
    }
  };

  const lockNow = () => {
    lockDiary({ quiet: true });
    onClose();
  };

  return (
    <PaperSheet open onClose={onClose} title={tr('Khoá nhật ký')} description={tr('Bật hoặc tắt khoá nhật ký bằng vân tay.')}>
      <div className="flex flex-col gap-4 px-5 pt-2 pb-5" data-lock-settings>
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.66rem] tracking-[0.12em] text-[color:var(--dz-text-3)] uppercase">{tr('Riêng tư')}</p>
            <h2 className="font-display text-[1.9rem] leading-tight text-[color:var(--dz-text)]">{tr('Khoá nhật ký')}</h2>
          </div>
          <SheetClose />
        </header>

        <p className="font-body text-[0.9rem] leading-relaxed text-[color:var(--dz-text-2)]">{tr('Khi bật, nhật ký chỉ mở bằng vân tay (hoặc khuôn mặt, hoặc mã khoá màn hình, tuỳ điện thoại của bạn). Các trang nhật ký cũng được ẩn khỏi Second Brain và bản đồ sao. Nhật ký tự khoá lại nếu bạn rời app hơn một phút.')}</p>

        {supported === null && <p className="font-body text-[0.85rem] text-[color:var(--dz-text-3)]">{tr('Đang hỏi điện thoại…')}</p>}
        {supported === false && !enabled && (
          <p className="rounded-2xl bg-[color:var(--dz-soft)] p-3 font-body text-[0.85rem] leading-relaxed text-[color:var(--dz-on-soft)]" role="status">
            {tr('Trình duyệt này chưa dùng được vân tay. Khoá cần trang https (hoặc localhost) và điện thoại đã cài khoá màn hình hay vân tay.')}
          </p>
        )}

        {enabled ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-body text-[0.95rem] font-medium text-[color:var(--dz-text)]" data-lock-on>
              <ShieldCheck size={18} className="text-[color:var(--dz-amber)]" aria-hidden="true" /> {tr('Khoá đang bật')}
            </p>
            <SoftButton tone="soft" onClick={lockNow}>
              <Lock size={16} aria-hidden="true" /> {tr('Khoá ngay')}
            </SoftButton>
            <SoftButton tone="soft" onClick={turnOff} disabled={busy} data-lock-off>
              {tr('Tắt khoá (cần vân tay)')}
            </SoftButton>
          </div>
        ) : (
          <SoftButton onClick={turnOn} disabled={busy || supported !== true} data-lock-on-button>
            <Fingerprint size={18} aria-hidden="true" /> {tr('Bật khoá bằng vân tay')}
          </SoftButton>
        )}

        <p className="min-h-5 font-body text-[0.85rem] text-[color:var(--dz-warn)]" role="alert">
          {error}
        </p>
        <p className="font-body text-[0.76rem] leading-relaxed text-[color:var(--dz-text-4)]">{tr('Khoá này che nhật ký trên màn hình, chưa mã hoá dữ liệu. Các trang vẫn nằm trên máy này như trước.')}</p>
      </div>
    </PaperSheet>
  );
}
