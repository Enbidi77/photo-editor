'use client';

import React from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';

interface RemoteCursorsOverlayProps {
  zoom: number;
}

export const RemoteCursorsOverlay: React.FC<RemoteCursorsOverlayProps> = ({ zoom }) => {
  const { remoteCursors } = useCollaborationStore();

  const cursors = Object.values(remoteCursors);

  if (cursors.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'visible',
      }}
    >
      {cursors.map((cursor) => {
        const posX = cursor.x * zoom;
        const posY = cursor.y * zoom;

        return (
          <div
            key={cursor.userId}
            style={{
              position: 'absolute',
              left: posX,
              top: posY,
              transform: 'translate(-2px, -2px)',
              transition: 'left 70ms linear, top 70ms linear',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              pointerEvents: 'none',
              willChange: 'left, top',
            }}
          >
            {/* SVG Cursor Caret */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
            >
              <path
                d="M3 3L10.5 21L13.5 14L21 11L3 3Z"
                fill={cursor.color}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name pill */}
            <div
              style={{
                marginTop: 2,
                marginLeft: 14,
                backgroundColor: cursor.color,
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: '10px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{cursor.displayName}</span>
              {cursor.tool && (
                <span
                  style={{
                    fontSize: '9px',
                    opacity: 0.85,
                    textTransform: 'capitalize',
                  }}
                >
                  ({cursor.tool})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
