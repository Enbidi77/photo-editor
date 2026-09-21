'use client';

import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import { editorTokens } from '@/theme/palette';

interface ToolButtonProps {
  id: string;
  name: string;
  shortcut: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  hasSubtools?: boolean;
}

export const ToolButton: React.FC<ToolButtonProps> = ({
  name,
  shortcut,
  icon,
  isActive,
  onClick,
  hasSubtools,
}) => {
  return (
    <Tooltip
      title={
        <div style={{ textAlign: 'center' }}>
          <div>{name}</div>
          <div style={{ color: editorTokens.text.secondary, fontSize: '0.65rem' }}>({shortcut})</div>
        </div>
      }
      placement="right"
      arrow
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundColor: isActive ? editorTokens.accent.primary : 'transparent',
          color: isActive ? '#ffffff' : editorTokens.text.secondary,
          border: 'none',
          borderRadius: 3,
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          transition: 'background-color 0.12s ease, color 0.12s ease',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = editorTokens.bg.hoverRow;
            e.currentTarget.style.color = editorTokens.text.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = editorTokens.text.secondary;
          }
        }}
      >
        {icon}
        {hasSubtools && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '0 0 3.5px 3.5px',
              borderColor: `transparent transparent ${isActive ? '#ffffff' : editorTokens.text.muted} transparent`,
            }}
          />
        )}
      </button>
    </Tooltip>
  );
};
