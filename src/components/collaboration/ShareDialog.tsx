'use client';

import React, { useState, useEffect } from 'react';
import { editorTokens } from '@/theme/palette';
import { remoteProjectRepository } from '@/lib/projects/remoteProjectRepository';
import { ProjectMember, UserRole } from '@/types/auth';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { Copy, Check, UserPlus, Shield } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  projectId: string;
  projectName: string;
  userRole?: UserRole;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  projectId,
  projectName,
  userRole = 'editor',
  onClose,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isOwner = userRole === 'owner';

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/editor/${projectId}`
    : `/editor/${projectId}`;

  const loadMembers = async () => {
    if (!projectId) return;
    try {
      const data = await remoteProjectRepository.getMembers(projectId);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) {
      loadMembers();
      setStatusMsg(null);
    }
  }, [open, projectId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    setStatusMsg(null);

    try {
      const res = await remoteProjectRepository.inviteMember(projectId, inviteEmail.trim(), inviteRole);
      if (res.error) {
        setStatusMsg(`Failed to invite: ${res.error}`);
      } else {
        setStatusMsg(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail('');
        await loadMembers();
      }
    } catch {
      setStatusMsg('Failed to send invitation');
    } finally {
      setIsSending(false);
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
        }}
      >
        Share &ldquo;{projectName}&rdquo;
      </DialogTitle>

      <DialogContent sx={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Copy Shareable URL Bar */}
        <div>
          <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 6 }}>
            Shareable Project Link
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: editorTokens.bg.input,
              border: `1px solid ${editorTokens.border.subtle}`,
              borderRadius: 3,
              padding: '2px 4px 2px 10px',
              gap: 8,
            }}
          >
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: editorTokens.text.primary,
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleCopyLink}
              startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
              sx={{ height: 26, fontSize: '0.7rem', px: 1.5 }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>

        {/* Invite by Email */}
        {isOwner && (
          <form onSubmit={handleInvite}>
            <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 6 }}>
              Invite Collaborators
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                required
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{
                  flex: 1,
                  height: 28,
                  backgroundColor: editorTokens.bg.input,
                  border: `1px solid ${editorTokens.border.subtle}`,
                  borderRadius: 3,
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  outline: 'none',
                }}
              />
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                sx={{ height: 28, fontSize: '0.72rem', minWidth: 90 }}
              >
                <MenuItem value="editor" sx={{ fontSize: '0.72rem' }}>Editor</MenuItem>
                <MenuItem value="viewer" sx={{ fontSize: '0.72rem' }}>Viewer</MenuItem>
              </Select>
              <Button
                type="submit"
                size="small"
                variant="outlined"
                disabled={isSending}
                startIcon={<UserPlus size={13} />}
                sx={{ height: 28, fontSize: '0.72rem', color: editorTokens.text.primary }}
              >
                Invite
              </Button>
            </div>
            {statusMsg && (
              <div style={{ fontSize: '0.7rem', color: editorTokens.accent.primary, marginTop: 6 }}>
                {statusMsg}
              </div>
            )}
          </form>
        )}

        {/* Collaborators List */}
        <div>
          <div style={{ fontSize: '0.7rem', color: editorTokens.text.secondary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} />
            <span>People with access</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {members.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: editorTokens.text.muted, padding: '8px 0' }}>
                Only you have access to this project.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: editorTokens.bg.panel,
                    borderRadius: 3,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar
                      src={member.profile?.avatarUrl}
                      sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: editorTokens.accent.primary }}
                    >
                      {member.profile?.displayName[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff' }}>
                        {member.profile?.displayName || 'User'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: editorTokens.text.muted }}>
                        {member.profile?.email || 'Collaborator'}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      textTransform: 'capitalize',
                      color: member.role === 'owner' ? editorTokens.accent.primary : editorTokens.text.secondary,
                      fontWeight: 600,
                    }}
                  >
                    {member.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>

      <DialogActions sx={{ padding: '10px 18px', borderTop: `1px solid ${editorTokens.border.subtle}` }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ fontSize: '0.72rem' }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};
