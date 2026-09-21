'use client';

import React from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { Eye, ShieldAlert } from 'lucide-react';
import { editorTokens } from '@/theme/palette';

export const ViewOnlyBanner: React.FC = () => {
  const { userRole } = useCollaborationStore();

  if (userRole !== 'viewer') return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '5px 16px',
        backgroundColor: '#78350f', // amber-900 / dark warning
        borderBottom: '1px solid #b45309',
        color: '#fef3c7',
        fontSize: '0.72rem',
        fontWeight: 500,
        zIndex: 40,
      }}
    >
      <Eye size={14} color="#fde68a" />
      <span>
        <strong>View-Only Mode:</strong> You have read-only access to this project. Canvas modifications and tool actions are restricted.
      </span>
    </div>
  );
};
