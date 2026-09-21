'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecentProjectSummary } from '@/types/project';
import { editorTokens } from '@/theme/palette';
import { formatDistanceToNow } from 'date-fns';
import { Image as ImageIcon, MoreVertical, Share2, Copy, Trash2, ExternalLink } from 'lucide-react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

interface ProjectCardProps {
  project: RecentProjectSummary;
  onDelete: (id: string) => void;
  onShare?: (id: string, name: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete, onShare }) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpen = () => {
    router.push(`/editor/${project.id}`);
  };

  return (
    <div
      onClick={handleOpen}
      style={{
        backgroundColor: editorTokens.bg.panel,
        border: `1px solid ${editorTokens.border.subtle}`,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = editorTokens.accent.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = editorTokens.border.subtle;
      }}
    >
      {/* Thumbnail Area */}
      <div
        style={{
          height: 140,
          backgroundColor: editorTokens.bg.input,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <ImageIcon size={32} color={editorTokens.text.muted} />
        )}

        {/* Action Menu Trigger */}
        <button
          type="button"
          onClick={handleMenuClick}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            backgroundColor: 'rgba(0,0,0,0.6)',
            border: 'none',
            color: '#ffffff',
            borderRadius: 2,
            padding: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Meta Area */}
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.78rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#ffffff',
            marginBottom: 4,
          }}
        >
          {project.name}
        </div>
        <div style={{ fontSize: '0.68rem', color: editorTokens.text.secondary }}>
          {project.width} × {project.height} px &nbsp;•&nbsp; {project.layerCount} layer{project.layerCount === 1 ? '' : 's'}
        </div>
        <div style={{ fontSize: '0.65rem', color: editorTokens.text.muted, marginTop: 'auto', paddingTop: 6 }}>
          Edited {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
        </div>
      </div>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            handleOpen();
          }}
        >
          <ExternalLink size={13} style={{ marginRight: 8 }} />
          <Typography variant="inherit">Open in Editor</Typography>
        </MenuItem>

        {onShare && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleMenuClose();
              onShare(project.id, project.name);
            }}
          >
            <Share2 size={13} style={{ marginRight: 8 }} />
            <Typography variant="inherit">Share Project</Typography>
          </MenuItem>
        )}

        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            onDelete(project.id);
          }}
          sx={{ color: editorTokens.accent.danger }}
        >
          <Trash2 size={13} style={{ marginRight: 8 }} />
          <Typography variant="inherit">Delete Project</Typography>
        </MenuItem>
      </Menu>
    </div>
  );
};
