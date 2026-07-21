import { AuthShell } from '../../components/layout/auth-shell';
import { AuthForm } from '../../features/auth/auth-form';

export default function RegisterPage() {
  return (
    <AuthShell
      title="Criar conta"
      description="Crie uma conta segura e receba uma carteira pronta para as moedas compatíveis."
      alternateLabel="Já tem uma conta?"
      alternateHref="/login"
      alternateAction="Entrar"
    >
      <AuthForm mode="register" submitLabel="Criar conta" />
    </AuthShell>
  );
}
