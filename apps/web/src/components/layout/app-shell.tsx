import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '../ui/badge';

type AppShellProps = { children: ReactNode; sessionActions?: ReactNode };

export function AppShell({ children, sessionActions }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link className="app-shell__brand" href="/">Global Wallet</Link>
        <nav className="app-shell__nav" aria-label="Navegação principal">
          <Link href="/">Painel</Link>
          <span>Transferências <Badge variant="planned">Planejado</Badge></span>
          <span>Câmbio <Badge variant="planned">Planejado</Badge></span>
        </nav>
        {sessionActions}
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
