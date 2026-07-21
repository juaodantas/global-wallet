import type { InputHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ id, label, hint, error, className, ...inputProps }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className={className} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...inputProps} />
      {hint ? <span id={hintId} className="field__hint">{hint}</span> : null}
      {error ? <span id={errorId} className="field__error">{error}</span> : null}
    </div>
  );
}
