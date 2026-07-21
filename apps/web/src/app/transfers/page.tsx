import { AppShell } from '../../components/layout/app-shell';
import { LogoutButton } from '../../features/auth/logout-button';
import { TransferFlow } from '../../features/transfers/transfer-flow';

export default function TransfersPage() { return <AppShell sessionActions={<LogoutButton />}><TransferFlow /></AppShell>; }
