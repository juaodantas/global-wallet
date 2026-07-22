'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '../../lib/actions/auth-actions';
import { Button } from '../../components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    setMessage(null);
    try {
      await logoutAction();
      setMessage('Sessão encerrada.');
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível sair.');
      setLoading(false);
    }
  }

  return (
    <section>
      <Button type="button" variant="ghost" onClick={handleLogout} disabled={loading} loading={loading}>{loading ? 'Saindo…' : 'Sair da conta'}</Button>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
