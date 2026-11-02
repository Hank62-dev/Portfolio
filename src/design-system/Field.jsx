import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from '../lib/format';
import { useSoft } from './soft';

const CONTROL =
  'rounded-sm border border-line bg-ink-2 px-3 py-2.5 text-body text-bone placeholder:text-bone-faint transition-colors duration-200 hover:border-line-strong focus-visible:border-signal focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger';

// In the workspace: rounder, roomier, and a soft ring instead of a hard edge when focused.
const SOFT = 'px-4 focus-visible:ring-4 focus-visible:ring-signal/15';
// For a control that sits in a row of buttons: a fixed height with the text centred, never clipped.
const COMPACT = 'h-10 py-0 text-fine';

// A control fills its row unless the caller gives it a width of its own (w-*, flex-1).
const sized = (className) => /(^|\s)(w-|flex-1|flex-none|grow)/.test(className ?? '');
const control = (soft, compact, className) =>
  clsx(soft ? CONTROL.replace('rounded-sm', 'rounded-2xl') : CONTROL, !sized(className) && 'w-full', soft && SOFT, compact && COMPACT, className);

export const Input = forwardRef(function Input({ className, compact, ...rest }, ref) {
  return <input ref={ref} className={control(useSoft(), compact, className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, compact, ...rest }, ref) {
  return <textarea ref={ref} className={control(useSoft(), compact, clsx('resize-y', className))} {...rest} />;
});

export const Select = forwardRef(function Select({ className, children, compact, wrapperClassName, ...rest }, ref) {
  return (
    <div className={clsx('relative', wrapperClassName)}>
      <select ref={ref} className={control(useSoft(), compact, clsx('appearance-none pr-10', className))} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-bone-faint"
      />
    </div>
  );
});

/**
 * Label + control + hint/error. The control is passed as a render function so it can be wired to the
 * generated id and described-by ids:  <Field label="Name">{(props) => <Input {...props} />}</Field>
 */
export const Field = ({ label, hint, error, className, children }) => {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-mono text-fine text-bone-dim">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} className="font-mono text-fine text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="font-mono text-fine text-bone-faint">
            {hint}
          </p>
        )
      )}
    </div>
  );
};
