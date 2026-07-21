import { AppShell } from '../../../components/layout/app-shell';
import { LogoutButton } from '../../../features/auth/logout-button';
import { StatementDetail } from '../../../features/statement/statement-detail';

export default async function OperationDetailPage({ params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params;
  return <AppShell sessionActions={<LogoutButton />}><StatementDetail operationId={operationId} /></AppShell>;
}
