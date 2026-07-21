import Link from 'next/link';
import type { ReactNode } from 'react';

type AppShellProps = { children: ReactNode; sessionActions?: ReactNode };

export function AppShell({ children, sessionActions }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link className="app-shell__brand" href="/">Global Wallet</Link>
        <nav className="app-shell__nav" aria-label="Navegação principal">
          <Link href="/">Painel</Link>
          <Link href="/deposits">Depósitos</Link>
          <Link href="/transfers">Transferências</Link>
          <Link href="/exchange">Câmbio</Link>
          <Link href="/statement">Extrato</Link>
        </nav>
        {sessionActions}
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
