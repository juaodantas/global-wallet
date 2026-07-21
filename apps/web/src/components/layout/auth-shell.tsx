import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthShellProps = {
  title: string;
  description: string;
  alternateLabel: string;
  alternateHref: string;
  alternateAction: string;
  children: ReactNode;
};

export function AuthShell({ title, description, alternateLabel, alternateHref, alternateAction, children }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__grid">
        <section className="auth-shell__context" aria-labelledby="auth-product-title">
          <div>
            <Link className="auth-shell__brand" href="/">Global Wallet</Link>
            <div className="auth-shell__eyebrow">MVP da carteira</div>
            <h1 id="auth-product-title">Acesso seguro à sua carteira multimoeda.</h1>
            <p>Veja saldos por moeda com sessões gerenciadas pelo navegador e estados de conta claros.</p>
          </div>
          <ul className="auth-shell__points">
            <li>Moedas compatíveis: BRL, USD, EUR e GBP.</li>
            <li>Os dados da carteira vêm apenas de APIs implementadas.</li>
            <li>Fluxos de movimentação ficam ocultos até estarem disponíveis.</li>
          </ul>
        </section>
        <section className="auth-shell__panel" aria-labelledby="auth-form-title">
          <div className="auth-shell__eyebrow">Acesso à conta</div>
          <h2 id="auth-form-title">{title}</h2>
          <p>{description}</p>
          {children}
          <p className="auth-shell__alternate">{alternateLabel} <Link href={alternateHref}>{alternateAction}</Link></p>
        </section>
      </div>
    </main>
  );
}
