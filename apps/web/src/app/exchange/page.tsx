import { AppShell } from '../../components/layout/app-shell';
import { LogoutButton } from '../../features/auth/logout-button';
import { ExchangeFlow } from '../../features/exchange/exchange-flow';

export default function ExchangePage() { return <AppShell sessionActions={<LogoutButton />}><ExchangeFlow /></AppShell>; }
