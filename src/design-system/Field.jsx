import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from '../lib/format';

const CONTROL =
  'w-full rounded-sm border border-line bg-ink-2 px-3 py-2.5 text-body text-bone placeholder:text-bone-faint transition-colors duration-200 hover:border-line-strong focus-visible:border-signal focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger';

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(CONTROL, className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx(CONTROL, 'resize-y', className)} {...rest} />;
});

export const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={clsx(CONTROL, 'appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-bone-faint"
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
