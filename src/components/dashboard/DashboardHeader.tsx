'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { editorTokens } from '@/theme/palette';
import { Plus, LogOut, User, Mail } from 'lucide-react';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';

interface DashboardHeaderProps {
  onNewProject: () => void;
  onOpenInvitations?: () => void;
  pendingCount?: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onNewProject,
  onOpenInvitations,
  pendingCount = 0,
}) => {
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Creator';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 32px',
        backgroundColor: editorTokens.bg.toolbar,
        borderBottom: `1px solid ${editorTokens.border.subtle}`,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            backgroundColor: editorTokens.accent.primary,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          Pf
        </div>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.02em', color: '#ffffff' }}>
          PixelForge Cloud
        </span>
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {onOpenInvitations && (
          <Tooltip title={pendingCount > 0 ? `${pendingCount} project invitation(s) pending` : 'Project Invitations'}>
            <button
              type="button"
              onClick={onOpenInvitations}
              style={{
                position: 'relative',
                backgroundColor: pendingCount > 0 ? editorTokens.bg.activeRow : 'transparent',
                border: `1px solid ${pendingCount > 0 ? editorTokens.accent.primary : editorTokens.border.subtle}`,
                borderRadius: 4,
                color: pendingCount > 0 ? editorTokens.accent.primary : editorTokens.text.secondary,
                cursor: 'pointer',
                height: 30,
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              <Badge badgeContent={pendingCount} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.62rem', height: 16, minWidth: 16 } }}>
                <Mail size={15} />
              </Badge>
              <span style={{ display: 'inline-block' }}>Invitations</span>
            </button>
          </Tooltip>
        )}

        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={15} />}
          onClick={onNewProject}
          sx={{ height: 30, fontSize: '0.75rem', px: 2 }}
        >
          New Project
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            src={profile?.avatarUrl}
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.75rem',
              bgcolor: editorTokens.accent.primary,
            }}
          >
            {displayName[0]?.toUpperCase()}
          </Avatar>
          <span style={{ fontSize: '0.78rem', color: editorTokens.text.primary, fontWeight: 500 }}>
            {displayName}
          </span>
        </div>

        <Tooltip title="Sign Out">
          <button
            type="button"
            onClick={signOut}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: editorTokens.text.muted,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
