import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
};

export function Button({ children, variant = 'primary', fullWidth = false, loading = false, className, disabled, ...props }: ButtonProps) {
  const classes = ['button', `button--${variant}`, fullWidth ? 'button--full' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading} {...props}>
      {children}
    </button>
  );
}
