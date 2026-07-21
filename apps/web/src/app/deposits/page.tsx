import { AppShell } from '../../components/layout/app-shell';
import { LogoutButton } from '../../features/auth/logout-button';
import { DepositFlow } from '../../features/deposits/deposit-flow';

export default function DepositsPage() { return <AppShell sessionActions={<LogoutButton />}><DepositFlow /></AppShell>; }
