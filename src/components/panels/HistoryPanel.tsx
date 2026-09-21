'use client';

import React from 'react';
import { useHistoryStore } from '@/store/historyStore';
import { editorTokens } from '@/theme/palette';
import { History as HistoryIcon, RotateCcw } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';

export const HistoryPanel: React.FC = () => {
  const { entries, currentIndex, jumpTo, clearHistory } = useHistoryStore();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: editorTokens.bg.panel,
        fontSize: '0.72rem',
        userSelect: 'none',
      }}
    >
      {/* List of History Actions */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2px 0',
        }}
      >
        {entries.map((entry, idx) => {
          const isCurrent = idx === currentIndex;
          const isUndone = idx > currentIndex;

          return (
            <div
              key={`${entry.id}-${idx}`}
              onClick={() => jumpTo(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 10px',
                gap: 8,
                backgroundColor: isCurrent ? editorTokens.bg.activeRow : 'transparent',
                borderLeft: isCurrent
                  ? `3px solid ${editorTokens.accent.primary}`
                  : '3px solid transparent',
                color: isUndone ? editorTokens.text.muted : isCurrent ? '#ffffff' : editorTokens.text.primary,
                opacity: isUndone ? 0.45 : 1,
                cursor: 'pointer',
                borderBottom: `1px solid ${editorTokens.border.subtle}`,
              }}
            >
              <HistoryIcon size={12} color={isCurrent ? editorTokens.accent.primary : undefined} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.label}
              </span>
              <span style={{ fontSize: '0.62rem', color: editorTokens.text.muted }}>
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          height: 28,
          borderTop: `1px solid ${editorTokens.border.subtle}`,
          backgroundColor: editorTokens.bg.panelHeader,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
        }}
      >
        <span style={{ fontSize: '0.65rem', color: editorTokens.text.muted }}>
          {entries.length} State{entries.length === 1 ? '' : 's'}
        </span>
        <Tooltip title="Reset History">
          <button
            type="button"
            onClick={clearHistory}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: editorTokens.text.secondary,
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
            }}
          >
            <RotateCcw size={13} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
