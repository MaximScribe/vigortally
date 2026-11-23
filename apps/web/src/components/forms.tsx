import { ApiRequestError } from '@vigortally/client';
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import './forms.css';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** Text shown after the input, e.g. a unit. */
  suffix?: string;
}

export function TextField({ label, hint, suffix, className, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className={`vt-field ${className ?? ''}`}>
      <label htmlFor={id} className="vt-field__label">
        {label}
      </label>
      <div className="vt-field__control">
        <input id={id} className="vt-input" {...input} />
        {suffix && <span className="vt-field__suffix">{suffix}</span>}
      </div>
      {hint && <p className="vt-field__hint">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly { value: string; label: string }[];
}

export function SelectField({ label, options, className, ...select }: SelectFieldProps) {
  const id = useId();
  return (
    <div className={`vt-field ${className ?? ''}`}>
      <label htmlFor={id} className="vt-field__label">
        {label}
      </label>
      <select id={id} className="vt-input" {...select}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  busy,
  block,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`vt-button vt-button--${variant} ${block ? 'vt-button--block' : ''} ${className ?? ''}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Shows an error from a failed request (or any thrown value) in a friendly way. */
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof ApiRequestError
      ? error.isNetworkError
        ? "Can't reach the server. Check your connection."
        : error.message
      : error instanceof Error
        ? error.message
        : 'Something went wrong';
  return (
    <p className="vt-error" role="alert">
      {message}
    </p>
  );
}

export function Form({
  onSubmit,
  children,
  className,
}: {
  onSubmit: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={`vt-form ${className ?? ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
