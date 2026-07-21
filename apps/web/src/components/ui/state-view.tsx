import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from './card';

type StateAction = { href: string; label: string; variant?: 'primary' | 'secondary' | 'ghost' };

type StateViewProps = {
  title: string;
  description: string;
  variant: 'loading' | 'empty' | 'unauthenticated' | 'error';
  children?: ReactNode;
  actions?: StateAction[];
};

const stateLabelByVariant: Record<StateViewProps['variant'], string> = {
  loading: 'Carregando',
  empty: 'Vazio',
  unauthenticated: 'Não autenticado',
  error: 'Erro'
};

export function StateView({ title, description, variant, children, actions }: StateViewProps) {
  return (
    <Card className={`state-view state-view--${variant}`}>
      <div className="badge badge--status">{stateLabelByVariant[variant]}</div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
      {actions && actions.length > 0 ? (
        <div className="state-view__actions">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className={`button button--${action.variant ?? 'primary'}`}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
