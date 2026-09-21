'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthCard } from '@/components/auth/AuthCard';
import { editorTokens } from '@/theme/palette';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await resetPassword(email);
      if (res?.error) {
        setErrorMsg(res.error.message);
      } else {
        setIsSent(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email to receive recovery instructions"
      footer={
        <div>
          Remember your password?{' '}
          <Link
            href="/login"
            style={{ color: editorTokens.accent.primary, textDecoration: 'none', fontWeight: 600 }}
          >
            Sign in
          </Link>
        </div>
      }
    >
      {isSent ? (
        <Alert severity="success" sx={{ fontSize: '0.72rem', py: 1 }}>
          Check your email! We sent a password reset link to <strong>{email}</strong>.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {errorMsg && (
            <Alert severity="error" sx={{ fontSize: '0.72rem', py: 0.5 }}>
              {errorMsg}
            </Alert>
          )}

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
              style={{
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
              }}
            />
          </div>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            sx={{ height: 32, fontSize: '0.78rem', mt: 1 }}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
