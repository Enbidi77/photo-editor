'use client';

import React, { useState, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthCard } from '@/components/auth/AuthCard';
import { editorTokens } from '@/theme/palette';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const { signInWithPassword, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 32,
    backgroundColor: editorTokens.bg.input,
    border: `1px solid ${editorTokens.border.subtle}`,
    color: '#ffffff',
    fontSize: '0.8rem',
    padding: '4px 10px',
    borderRadius: 3,
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <AuthCard
      title="Sign In"
      subtitle="Create, edit, and collaborate in real-time"
      footer={
        <div>
          Don&apos;t have an account?{' '}
          <Link
            href={`/register${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            style={{ color: editorTokens.accent.primary, textDecoration: 'none', fontWeight: 600 }}
          >
            Sign up
          </Link>
        </div>
      }
    >
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, fontSize: '0.72rem', py: 0.5 }}>
          {errorMsg}
        </Alert>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
            Email Address
          </div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', color: editorTokens.text.secondary }}>Password</span>
            <Link
              href="/forgot-password"
              style={{ fontSize: '0.68rem', color: editorTokens.text.muted, textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          sx={{ height: 32, fontSize: '0.78rem', mt: 1 }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
          <div style={{ flex: 1, height: 1, backgroundColor: editorTokens.border.subtle }} />
          <span style={{ fontSize: '0.65rem', color: editorTokens.text.muted }}>OR</span>
          <div style={{ flex: 1, height: 1, backgroundColor: editorTokens.border.subtle }} />
        </div>

        <Button
          type="button"
          variant="outlined"
          onClick={() => signInWithGoogle(redirectTo)}
          sx={{ height: 32, fontSize: '0.75rem', color: editorTokens.text.primary, borderColor: editorTokens.border.medium }}
        >
          Continue with Google
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
