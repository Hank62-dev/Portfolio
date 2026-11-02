import { Children, Fragment, forwardRef, isValidElement, useId } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
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
export const control = (soft, compact, className) =>
  clsx(soft ? CONTROL.replace('rounded-sm', 'rounded-2xl') : CONTROL, !sized(className) && 'w-full', soft && SOFT, compact && COMPACT, className);

export const Input = forwardRef(function Input({ className, compact, ...rest }, ref) {
  return <input ref={ref} className={control(useSoft(), compact, className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, compact, ...rest }, ref) {
  return <textarea ref={ref} className={control(useSoft(), compact, clsx('resize-y', className))} {...rest} />;
});

// The <option> elements given as children, as plain { value, label, disabled } (fragments and mapped lists included).
const optionsOf = (children) =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) return optionsOf(child.props.children);
    return [{ value: String(child.props.value ?? child.props.children), label: Children.toArray(child.props.children).join(''), disabled: Boolean(child.props.disabled) }];
  });

// Radix will not take an empty string as an item's value, so "no choice" travels under a name of its own.
const NONE = '__none__';

/**
 * A dropdown that looks like the rest of the workspace instead of the browser's own list. It is used like a native
 * <select> with <option> children: value, onChange(event) with event.target.value, disabled, name, compact.
 */
export const Select = forwardRef(function Select({ className, children, compact, wrapperClassName, value, onChange, disabled, name, id, ...rest }, ref) {
  const soft = useSoft();
  const options = optionsOf(children);
  const current = String(value ?? '');
  const chosen = options.find((option) => option.value === current) ?? options[0];
  const placeholder = chosen?.value === '';
  return (
    <div className={clsx('relative', wrapperClassName)}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          ref={ref}
          id={id}
          disabled={disabled}
          className={control(soft, compact, clsx('group flex items-center justify-between gap-2 pr-3.5 text-left', className))}
          {...rest}
        >
          <span className={clsx('min-w-0 flex-1 truncate', placeholder && 'text-bone-faint')}>{chosen?.label}</span>
          <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-bone-faint transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="no-scrollbar z-[70] max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] w-max min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(24rem,92vw)] animate-fade-in overflow-y-auto rounded-2xl border border-white/10 bg-ink-1/95 p-1.5 shadow-[0_28px_70px_-24px_rgb(0_0_0/0.95)] backdrop-blur-xl"
          >
            <DropdownMenu.RadioGroup value={current || NONE} onValueChange={(next) => onChange?.({ target: { value: next === NONE ? '' : next, name } })}>
              {options.map((option) => (
                <DropdownMenu.RadioItem
                  key={option.value}
                  value={option.value || NONE}
                  disabled={option.disabled}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-fine text-bone-dim outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-white/8 data-[highlighted]:text-bone data-[state=checked]:text-bone"
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check size={14} className="text-signal" aria-hidden="true" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {name && <input type="hidden" name={name} value={current} />}
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
