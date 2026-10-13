import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'on-dark';
export type ButtonSize = 'default' | 'small';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

/** Shared class builder so <button> and <a> variants look identical. */
export function buttonClass({ variant = 'primary', size = 'default', block }: ButtonStyleOptions = {}) {
  return cx(
    'btn',
    `btn--${variant}`,
    size === 'small' && 'btn--small',
    block && 'btn--block',
  );
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleOptions {
  /** Shows a spinner and disables the button while an action is in progress. */
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  block,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClass({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps, ButtonStyleOptions {}

/** Internal navigation styled as a button (React Router link). */
export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLinkProps) {
  return <Link className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}

export interface ButtonAnchorProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>,
    ButtonStyleOptions {}

/** Plain <a> styled as a button, for external or in-page (#hash) targets. */
export function ButtonAnchor({ variant, size, block, className, ...rest }: ButtonAnchorProps) {
  return <a className={cx(buttonClass({ variant, size, block }), className)} {...rest} />;
}
