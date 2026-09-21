'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthCard } from '@/components/auth/AuthCard';
import { editorTokens } from '@/theme/palette';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updatePassword(password);
      if (res?.error) {
        setErrorMsg(res.error.message);
      } else {
        setIsSuccess(true);
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Set New Password"
      subtitle="Enter your new password below"
    >
      {isSuccess ? (
        <Alert severity="success" sx={{ fontSize: '0.72rem', py: 1 }}>
          Password updated successfully! Redirecting to dashboard...
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
              New Password
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

          <div>
            <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
              Confirm New Password
            </div>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
