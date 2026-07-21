import { AuthShell } from '../../components/layout/auth-shell';
import { AuthForm } from '../../features/auth/auth-form';

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar"
      description="Use seu e-mail e senha para abrir o painel da sua carteira."
      alternateLabel="Novo no Global Wallet?"
      alternateHref="/register"
      alternateAction="Criar conta"
    >
      <AuthForm mode="login" submitLabel="Entrar" />
    </AuthShell>
  );
}
