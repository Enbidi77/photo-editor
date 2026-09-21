'use client';

import React from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { editorTokens } from '@/theme/palette';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import { Cloud, CloudOff, RefreshCw, Eye, ShieldCheck, Edit3 } from 'lucide-react';

export const ConnectionStatusBadge: React.FC = () => {
  const {
    connected,
    connectionState,
    isSaving,
    userRole,
    pendingOperationsCount,
  } = useCollaborationStore();

  let dotColor = '#10b981'; // green
  let statusText = 'Connected';
  let icon = <Cloud size={13} />;

  if (connectionState === 'connecting') {
    dotColor = '#f59e0b'; // amber
    statusText = 'Connecting...';
    icon = <RefreshCw size={13} className="spin-anim" />;
  } else if (connectionState === 'disconnected' || connectionState === 'error') {
    dotColor = '#ef4444'; // red
    statusText = pendingOperationsCount > 0 ? `${pendingOperationsCount} Queued` : 'Offline';
    icon = <CloudOff size={13} />;
  } else if (isSaving) {
    statusText = 'Saving...';
    icon = <CircularProgress size={11} thickness={5} sx={{ color: editorTokens.text.secondary }} />;
  }

  const roleLabel =
    userRole === 'owner' ? 'Owner' : userRole === 'editor' ? 'Editor' : 'Viewer';

  const roleIcon =
    userRole === 'owner' ? (
      <ShieldCheck size={12} color={editorTokens.accent.primary} />
    ) : userRole === 'editor' ? (
      <Edit3 size={12} color="#10b981" />
    ) : (
      <Eye size={12} color="#f59e0b" />
    );

  const tooltipTitle = (
    <div style={{ fontSize: '0.72rem', padding: '2px 4px' }}>
      <div><strong>Status:</strong> {connectionState === 'connected' ? 'Cloud Synced' : statusText}</div>
      <div><strong>Role:</strong> {roleLabel} ({userRole === 'viewer' ? 'Read Only' : 'Can Edit'})</div>
      {pendingOperationsCount > 0 && (
        <div style={{ color: '#fbbf24', marginTop: 2 }}>
          {pendingOperationsCount} offline change(s) waiting to sync
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title={tooltipTitle} arrow>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 8px',
          backgroundColor: editorTokens.bg.panel,
          border: `1px solid ${editorTokens.border.subtle}`,
          borderRadius: 12,
          fontSize: '0.7rem',
          color: editorTokens.text.secondary,
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        {/* Status Dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: `0 0 4px ${dotColor}`,
          }}
        />

        {/* Status Text */}
        <span style={{ fontWeight: 500, color: editorTokens.text.primary, fontSize: '0.68rem' }}>
          {statusText}
        </span>

        {/* Role badge */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 5px',
            backgroundColor: editorTokens.bg.input,
            borderRadius: 8,
            fontSize: '0.62rem',
            color: editorTokens.text.muted,
          }}
        >
          {roleIcon}
          {roleLabel}
        </span>
      </div>
    </Tooltip>
  );
};
