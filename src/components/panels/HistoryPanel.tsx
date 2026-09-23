'use client';

import React from 'react';
import { useHistoryStore } from '@/store/historyStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import { editorTokens } from '@/theme/palette';
import { History as HistoryIcon, RotateCcw, CheckCircle2 } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';

export const HistoryPanel: React.FC = () => {
  const { entries, currentIndex, jumpTo, clearHistory } = useHistoryStore();
  const { userRole } = useCollaborationStore();
  const isViewer = userRole === 'viewer';

  // Display newest entries first while preserving original index for jumpTo
  const items = entries.map((entry, originalIndex) => ({ entry, originalIndex })).reverse();

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
      {/* List of History Actions (Newest First) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2px 0',
        }}
      >
        {items.map(({ entry, originalIndex }) => {
          const isCurrent = originalIndex === currentIndex;
          const isUndone = originalIndex > currentIndex;

          return (
            <div
              key={`${entry.id}-${originalIndex}`}
              onClick={() => {
                if (!isViewer && originalIndex !== currentIndex) {
                  jumpTo(originalIndex);
                }
              }}
              title={
                isViewer
                  ? 'History navigation is disabled in viewer mode'
                  : isCurrent
                  ? 'Current state'
                  : isUndone
                  ? `Redo to: ${entry.label}`
                  : `Undo to: ${entry.label}`
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 10px',
                gap: 8,
                backgroundColor: isCurrent ? editorTokens.bg.activeRow : 'transparent',
                borderLeft: isCurrent
                  ? `3px solid ${editorTokens.accent.primary}`
                  : '3px solid transparent',
                color: isUndone ? editorTokens.text.muted : isCurrent ? '#ffffff' : editorTokens.text.primary,
                opacity: isUndone ? 0.45 : 1,
                cursor: isViewer ? 'not-allowed' : isCurrent ? 'default' : 'pointer',
                borderBottom: `1px solid ${editorTokens.border.subtle}`,
                transition: 'background-color 0.15s ease',
              }}
            >
              {isCurrent ? (
                <CheckCircle2 size={12} color={editorTokens.accent.primary} />
              ) : (
                <HistoryIcon size={12} color={isUndone ? editorTokens.text.muted : undefined} />
              )}
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: isCurrent ? 600 : 400,
                  textDecoration: isUndone ? 'line-through' : 'none',
                }}
              >
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
        <Tooltip title={isViewer ? 'Reset disabled in viewer mode' : 'Reset History'}>
          <span>
            <button
              type="button"
              disabled={isViewer}
              onClick={() => clearHistory('Initial State')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: isViewer ? editorTokens.text.muted : editorTokens.text.secondary,
                cursor: isViewer ? 'not-allowed' : 'pointer',
                padding: 2,
                display: 'flex',
                opacity: isViewer ? 0.5 : 1,
              }}
            >
              <RotateCcw size={13} />
            </button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
};

