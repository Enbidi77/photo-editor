'use client';

import React, { useState, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthCard } from '@/components/auth/AuthCard';
import { editorTokens } from '@/theme/palette';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const { signUp, signInWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account');
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
      title="Create Account"
      subtitle="Join PixelForge to design and collaborate in real-time"
      footer={
        <div>
          Already have an account?{' '}
          <Link
            href={`/login${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            style={{ color: editorTokens.accent.primary, textDecoration: 'none', fontWeight: 600 }}
          >
            Sign in
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
            Full Name / Display Name
          </div>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex Johnson"
            style={inputStyle}
          />
        </div>

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
          <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
            Password
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
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
          {isSubmitting ? 'Creating account...' : 'Create Account'}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
