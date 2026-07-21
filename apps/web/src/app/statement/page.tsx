import { AppShell } from '../../components/layout/app-shell';
import { LogoutButton } from '../../features/auth/logout-button';
import { StatementList } from '../../features/statement/statement-list';

export default function StatementPage() {
  return <AppShell sessionActions={<LogoutButton />}><StatementList /></AppShell>;
}
