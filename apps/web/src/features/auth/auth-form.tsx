'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '../../lib/api/auth-api';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';

type AuthFormProps = {
  mode: 'login' | 'register';
  submitLabel: string;
};

export function AuthForm({ mode, submitLabel }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }
      router.push('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {mode === 'register' ? (
        <Field id="name" label="Nome" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
      ) : null}
      <Field id="email" label="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
      <Field
        id="password"
        label="Senha"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        type="password"
        minLength={8}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        hint="Use pelo menos 8 caracteres."
        required
      />
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="form-actions">
        <Button type="submit" disabled={loading} loading={loading} fullWidth>
          {loading ? 'Aguarde…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
