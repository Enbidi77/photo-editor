'use client';

import React from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { editorTokens } from '@/theme/palette';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { Paintbrush, Move, Crop, Type, Hand, MousePointer } from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  move: <Move size={9} />,
  brush: <Paintbrush size={9} />,
  crop: <Crop size={9} />,
  text: <Type size={9} />,
  hand: <Hand size={9} />,
  select: <MousePointer size={9} />,
};

export const CollaboratorAvatars: React.FC = () => {
  const { collaborators } = useCollaborationStore();

  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  const MAX_VISIBLE = 4;
  const visible = collaborators.slice(0, MAX_VISIBLE);
  const extraCount = collaborators.length - MAX_VISIBLE;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((collab, index) => {
        const initials = collab.displayName
          ? collab.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : '?';

        const roleBadge =
          collab.role === 'owner' ? 'Owner' : collab.role === 'editor' ? 'Editor' : 'Viewer';

        const toolIcon = collab.activeTool ? TOOL_ICONS[collab.activeTool] : null;

        const tooltipContent = (
          <div style={{ fontSize: '0.72rem', padding: '2px 4px' }}>
            <div style={{ fontWeight: 600 }}>{collab.displayName}</div>
            <div style={{ color: editorTokens.text.secondary }}>
              Role: {roleBadge}
              {collab.activeTool ? ` • Using ${collab.activeTool}` : ''}
            </div>
          </div>
        );

        return (
          <Tooltip key={collab.userId} title={tooltipContent} arrow>
            <div
              style={{
                position: 'relative',
                marginLeft: index > 0 ? -6 : 0,
                zIndex: visible.length - index,
              }}
            >
              <Avatar
                src={collab.avatarUrl}
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  bgcolor: collab.color,
                  color: '#ffffff',
                  border: `2px solid ${editorTokens.bg.toolbar}`,
                  boxShadow: `0 0 0 1px ${collab.color}`,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                  '&:hover': {
                    transform: 'translateY(-2px) scale(1.1)',
                    zIndex: 20,
                  },
                }}
              >
                {initials}
              </Avatar>

              {/* Active tool mini badge */}
              {toolIcon && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    backgroundColor: editorTokens.bg.surface,
                    borderRadius: '50%',
                    padding: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${collab.color}`,
                    color: editorTokens.text.primary,
                  }}
                >
                  {toolIcon}
                </div>
              )}
            </div>
          </Tooltip>
        );
      })}

      {extraCount > 0 && (
        <Tooltip
          title={
            <div style={{ fontSize: '0.72rem' }}>
              {collaborators.slice(MAX_VISIBLE).map((c) => (
                <div key={c.userId}>{c.displayName} ({c.role})</div>
              ))}
            </div>
          }
          arrow
        >
          <div
            style={{
              marginLeft: -6,
              zIndex: 0,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: editorTokens.bg.panel,
              border: `2px solid ${editorTokens.bg.toolbar}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: editorTokens.text.secondary,
              fontSize: '0.62rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            +{extraCount}
          </div>
        </Tooltip>
      )}
    </div>
  );
};
