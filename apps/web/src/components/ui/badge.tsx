import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'currency' | 'planned' | 'status';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({ children, variant = 'status', className, ...props }: BadgeProps) {
  const classes = ['badge', `badge--${variant}`, className ?? ''].filter(Boolean).join(' ');
  return <span className={classes} {...props}>{children}</span>;
}
