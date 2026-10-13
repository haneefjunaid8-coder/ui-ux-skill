import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

interface FieldWrapperProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
  className?: string;
}

/**
 * Shared label / hint / error wrapper. Hint and error text are linked to the
 * control through aria-describedby so screen readers announce them.
 */
function FieldWrapper({ id, label, hint, error, children, className }: FieldWrapperProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('field', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children(describedBy, Boolean(error))}
      {hint && !error && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, className, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper id={fieldId} label={label} hint={hint} error={error}>
      {(describedBy, invalid) => (
        <input
          id={fieldId}
          className={cx('input', className)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextareaField({ label, hint, error, id, className, ...rest }: TextareaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper id={fieldId} label={label} hint={hint} error={error}>
      {(describedBy, invalid) => (
        <textarea
          id={fieldId}
          className={cx('textarea', className)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function SelectField({ label, hint, error, id, className, options, placeholder, ...rest }: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper id={fieldId} label={label} hint={hint} error={error}>
      {(describedBy, invalid) => (
        <select
          id={fieldId}
          className={cx('select input', className)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldWrapper>
  );
}
