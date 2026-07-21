'use client';

import { AppShell } from '../components/layout/app-shell';
import { LogoutButton } from '../features/auth/logout-button';
import { WalletDashboard } from '../features/wallet/wallet-dashboard';

export default function HomePage() {
  return (
    <WalletDashboard
      renderLayout={(children, authenticated) => (
        <AppShell sessionActions={authenticated ? <LogoutButton /> : undefined}>{children}</AppShell>
      )}
    />
  );
}
