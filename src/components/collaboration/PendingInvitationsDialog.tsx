'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  usePendingInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
} from '@/hooks/useProject';
import { editorTokens } from '@/theme/palette';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import { Mail, Check, X, Shield, Clock } from 'lucide-react';

interface PendingInvitationsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const PendingInvitationsDialog: React.FC<PendingInvitationsDialogProps> = ({
  open,
  onClose,
}) => {
  const router = useRouter();
  const { data: invitations = [], isLoading } = usePendingInvitations();
  const acceptMutation = useAcceptInvitation();
  const declineMutation = useDeclineInvitation();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      const res = await acceptMutation.mutateAsync(inviteId);
      if (res.success && res.projectId) {
        onClose();
        router.push(`/editor/${res.projectId}`);
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      await declineMutation.mutateAsync(inviteId);
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: editorTokens.bg.surface,
          border: `1px solid ${editorTokens.border.medium}`,
          color: editorTokens.text.primary,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '0.9rem',
          fontWeight: 700,
          borderBottom: `1px solid ${editorTokens.border.subtle}`,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Mail size={16} color={editorTokens.accent.primary} />
        <span>Project Collaboration Invitations</span>
        {invitations.length > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              backgroundColor: editorTokens.accent.primary,
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {invitations.length} new
          </span>
        )}
      </DialogTitle>

      <DialogContent sx={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 0',
              gap: 8,
              color: editorTokens.text.secondary,
              fontSize: '0.8rem',
            }}
          >
            <CircularProgress size={20} sx={{ color: editorTokens.accent.primary }} />
            <span>Loading invitations...</span>
          </div>
        ) : invitations.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              color: editorTokens.text.secondary,
              fontSize: '0.8rem',
            }}
          >
            You have no pending invitations.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invitations.map((inv) => {
              const isBusy = processingId === inv.id;
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '12px 14px',
                    backgroundColor: editorTokens.bg.panel,
                    border: `1px solid ${editorTokens.border.subtle}`,
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar
                        src={inv.invitedBy?.avatarUrl || undefined}
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: '0.75rem',
                          bgcolor: editorTokens.accent.primary,
                        }}
                      >
                        {inv.invitedBy?.displayName?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                          {inv.projectName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary }}>
                          Invited by{' '}
                          <strong style={{ color: editorTokens.text.primary }}>
                            {inv.invitedBy?.displayName || 'Project Owner'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          backgroundColor:
                            inv.role === 'editor'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(156, 163, 175, 0.15)',
                          color: inv.role === 'editor' ? '#60a5fa' : '#9ca3af',
                          padding: '3px 8px',
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Shield size={12} />
                        {inv.role}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTop: `1px solid ${editorTokens.border.subtle}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.66rem',
                        color: editorTokens.text.muted,
                      }}
                    >
                      <Clock size={11} />
                      <span>Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={isBusy}
                        onClick={() => handleDecline(inv.id)}
                        startIcon={isBusy ? <CircularProgress size={12} /> : <X size={13} />}
                        sx={{
                          height: 26,
                          fontSize: '0.7rem',
                          color: editorTokens.text.secondary,
                          borderColor: editorTokens.border.medium,
                          '&:hover': {
                            borderColor: '#ef4444',
                            color: '#ef4444',
                          },
                        }}
                      >
                        Decline
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        disabled={isBusy}
                        onClick={() => handleAccept(inv.id)}
                        startIcon={isBusy ? <CircularProgress size={12} color="inherit" /> : <Check size={13} />}
                        sx={{ height: 26, fontSize: '0.7rem', px: 1.5 }}
                      >
                        Accept & Open
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '10px 18px', borderTop: `1px solid ${editorTokens.border.subtle}` }}>
        <Button onClick={onClose} sx={{ color: editorTokens.text.secondary, fontSize: '0.72rem' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
