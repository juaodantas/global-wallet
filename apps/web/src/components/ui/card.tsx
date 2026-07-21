import type { HTMLAttributes, ReactNode } from 'react';

type CardVariant = 'default' | 'emphasis';

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: CardVariant;
  padded?: boolean;
};

export function Card({ children, variant = 'default', padded = true, className, ...props }: CardProps) {
  const classes = ['card', variant === 'emphasis' ? 'card--emphasis' : '', padded ? 'card--padded' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <section className={classes} {...props}>{children}</section>;
}
