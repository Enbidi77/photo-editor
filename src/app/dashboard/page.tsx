'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useProjectsList,
  useCreateProject,
  useDeleteProject,
  usePendingInvitations,
} from '@/hooks/useProject';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { ShareDialog } from '@/components/collaboration/ShareDialog';
import { PendingInvitationsDialog } from '@/components/collaboration/PendingInvitationsDialog';
import { editorTokens } from '@/theme/palette';
import { DOCUMENT_PRESETS, DocumentPreset } from '@/types/document';
import { Search, Plus, Sparkles, FolderKanban, Trash2, Mail } from 'lucide-react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

export default function DashboardPage() {
  const router = useRouter();
  const { data: projects = [], isLoading } = useProjectsList();
  const { data: pendingInvitations = [] } = usePendingInvitations();
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [hasPromptedInvites, setHasPromptedInvites] = useState(false);
  const [shareDialog, setShareDialog] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: '',
    name: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Automatically pop up the invitation dialog when pending invitations are detected on load
  useEffect(() => {
    if (!hasPromptedInvites && pendingInvitations.length > 0) {
      setIsInvitationsOpen(true);
      setHasPromptedInvites(true);
    }
  }, [pendingInvitations.length, hasPromptedInvites]);

  // New Project Form State
  const [projName, setProjName] = useState('Untitled Project');
  const [projWidth, setProjWidth] = useState(1920);
  const [projHeight, setProjHeight] = useState(1080);
  const [projRes, setProjRes] = useState(72);
  const [projBg, setProjBg] = useState('#ffffff');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('web-1920');

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPreset = (preset: DocumentPreset) => {
    setSelectedPresetId(preset.id);
    setProjWidth(preset.width);
    setProjHeight(preset.height);
    setProjRes(preset.resolution);
  };

  const handleCreateProject = async () => {
    try {
      const created = await createProjectMutation.mutateAsync({
        name: projName.trim() || 'Untitled Project',
        width: projWidth,
        height: projHeight,
        resolution: projRes,
        backgroundColor: projBg,
      });
      setIsNewDialogOpen(false);
      router.push(`/editor/${created.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProjectMutation.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const inputStyle = {
    height: 28,
    backgroundColor: editorTokens.bg.input,
    border: `1px solid ${editorTokens.border.subtle}`,
    color: editorTokens.text.primary,
    fontSize: '0.75rem',
    padding: '4px 10px',
    borderRadius: 3,
    outline: 'none',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: editorTokens.bg.app,
        color: editorTokens.text.primary,
      }}
    >
      {/* Top Header */}
      <DashboardHeader
        onNewProject={() => setIsNewDialogOpen(true)}
        onOpenInvitations={() => setIsInvitationsOpen(true)}
        pendingCount={pendingInvitations.length}
      />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Pending Invitations Alert Banner */}
        {pendingInvitations.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${editorTokens.accent.primary}`,
              borderRadius: 6,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: editorTokens.accent.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Mail size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                  You have {pendingInvitations.length} pending project collaboration invitation{pendingInvitations.length > 1 ? 's' : ''}!
                </div>
                <div style={{ fontSize: '0.72rem', color: editorTokens.text.secondary }}>
                  Accept to immediately start working on shared canvas documents with your team.
                </div>
              </div>
            </div>

            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setIsInvitationsOpen(true)}
              sx={{ fontSize: '0.72rem', height: 28, px: 2 }}
            >
              Review Invitations
            </Button>
          </div>
        )}

        {/* Subheader / Search & Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
              Cloud Projects
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: editorTokens.text.secondary }}>
              Manage, collaborate, and edit multi-layer graphic designs in real-time.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: editorTokens.bg.input,
                border: `1px solid ${editorTokens.border.subtle}`,
                borderRadius: 4,
                padding: '4px 10px',
                width: 240,
              }}
            >
              <Search size={14} color={editorTokens.text.muted} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: editorTokens.text.primary,
                  fontSize: '0.75rem',
                  width: '100%',
                }}
              />
            </div>

            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={14} />}
              onClick={() => setIsNewDialogOpen(true)}
              sx={{ height: 32, fontSize: '0.75rem', px: 2 }}
            >
              New Project
            </Button>
          </div>
        </div>

        {/* Content Listing */}
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 0',
              gap: 12,
              color: editorTokens.text.muted,
            }}
          >
            <CircularProgress size={28} sx={{ color: editorTokens.accent.primary }} />
            <span style={{ fontSize: '0.8rem' }}>Loading your projects...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 20px',
              backgroundColor: editorTokens.bg.panel,
              border: `1px dashed ${editorTokens.border.medium}`,
              borderRadius: 6,
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: editorTokens.bg.input,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: editorTokens.accent.primary,
              }}
            >
              <FolderKanban size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>
              {searchQuery ? 'No matching projects found' : 'No cloud projects yet'}
            </h3>
            <p
              style={{
                margin: '0 0 20px',
                fontSize: '0.78rem',
                color: editorTokens.text.secondary,
                maxWidth: 400,
              }}
            >
              {searchQuery
                ? `No projects found matching "${searchQuery}". Try a different keyword.`
                : 'Create your first project to start composing layers, painting, and collaborating with team members in real-time.'}
            </p>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={14} />}
              onClick={() => setIsNewDialogOpen(true)}
              sx={{ height: 32, fontSize: '0.75rem' }}
            >
              Create New Project
            </Button>
          </div>
        ) : (
          /* Projects Grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={(id) => setDeleteConfirmId(id)}
                onShare={(id, name) => setShareDialog({ open: true, id, name })}
              />
            ))}
          </div>
        )}
      </main>

      {/* New Project Dialog */}
      <Dialog
        open={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
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
            padding: '12px 20px',
          }}
        >
          Create New Cloud Project
        </DialogTitle>

        <DialogContent sx={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Presets List */}
          <div>
            <div style={{ fontSize: '0.72rem', color: editorTokens.text.secondary, marginBottom: 8 }}>
              Standard Presets:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DOCUMENT_PRESETS.slice(0, 6).map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isSelected ? editorTokens.bg.activeRow : editorTokens.bg.panel,
                      border: `1px solid ${isSelected ? editorTokens.accent.primary : editorTokens.border.subtle}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#ffffff' : editorTokens.text.primary }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: editorTokens.text.muted }}>
                      {preset.width} × {preset.height} px
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
                Project Title:
              </div>
              <input
                type="text"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
                  Width (px):
                </div>
                <input
                  type="number"
                  value={projWidth}
                  onChange={(e) => {
                    setSelectedPresetId('');
                    setProjWidth(Math.max(10, parseInt(e.target.value) || 800));
                  }}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
                  Height (px):
                </div>
                <input
                  type="number"
                  value={projHeight}
                  onChange={(e) => {
                    setSelectedPresetId('');
                    setProjHeight(Math.max(10, parseInt(e.target.value) || 600));
                  }}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
                  Resolution:
                </div>
                <input
                  type="number"
                  value={projRes}
                  onChange={(e) => setProjRes(Math.max(10, parseInt(e.target.value) || 72))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: editorTokens.text.secondary, marginBottom: 4 }}>
                Canvas Background:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'White', val: '#ffffff' },
                  { label: 'Black', val: '#000000' },
                  { label: 'Transparent', val: 'transparent' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setProjBg(opt.val)}
                    style={{
                      backgroundColor: projBg === opt.val ? editorTokens.accent.primary : editorTokens.bg.input,
                      border: `1px solid ${editorTokens.border.subtle}`,
                      color: projBg === opt.val ? '#ffffff' : editorTokens.text.primary,
                      padding: '4px 12px',
                      borderRadius: 3,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions
          sx={{
            padding: '12px 20px',
            borderTop: `1px solid ${editorTokens.border.subtle}`,
          }}
        >
          <Button
            onClick={() => setIsNewDialogOpen(false)}
            sx={{ color: editorTokens.text.secondary, fontSize: '0.75rem' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateProject}
            disabled={createProjectMutation.isPending}
            sx={{ fontSize: '0.75rem', px: 2 }}
          >
            {createProjectMutation.isPending ? 'Creating...' : 'Create & Open'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        PaperProps={{
          sx: {
            backgroundColor: editorTokens.bg.surface,
            border: `1px solid ${editorTokens.border.medium}`,
            color: editorTokens.text.primary,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Delete Project</DialogTitle>
        <DialogContent sx={{ fontSize: '0.8rem', color: editorTokens.text.secondary }}>
          Are you sure you want to permanently delete this project? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            onClick={() => setDeleteConfirmId(null)}
            sx={{ color: editorTokens.text.secondary, fontSize: '0.75rem' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmId && handleDeleteProject(deleteConfirmId)}
            disabled={deleteProjectMutation.isPending}
            startIcon={<Trash2 size={14} />}
            sx={{ fontSize: '0.75rem' }}
          >
            {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      {shareDialog.open && (
        <ShareDialog
          open={shareDialog.open}
          projectId={shareDialog.id}
          projectName={shareDialog.name}
          userRole="owner"
          onClose={() => setShareDialog({ open: false, id: '', name: '' })}
        />
      )}

      {/* Pending Invitations Dialog */}
      <PendingInvitationsDialog
        open={isInvitationsOpen}
        onClose={() => setIsInvitationsOpen(false)}
      />
    </div>
  );
}
