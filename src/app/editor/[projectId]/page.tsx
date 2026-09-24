'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useProject, usePendingInvitations, useAcceptInvitation } from '@/hooks/useProject';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import { editorTokens } from '@/theme/palette';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { ArrowLeft, AlertCircle, Check, Mail } from 'lucide-react';

const EditorShell = dynamic(
  () => import('@/components/layout/EditorShell').then((mod) => mod.EditorShell),
  { ssr: false }
);

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.projectId as string) || '';

  const { data: projectRecord, isLoading, isError } = useProject(projectId);
  const { setDocument } = useDocumentStore();
  const { setLayers } = useLayerStore();
  const { clearHistory } = useHistoryStore();
  const { setUserRole } = useCollaborationStore();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!projectRecord?.project) return;

    const { project, role } = projectRecord;
    setUserRole(role);
    setDocument({
      ...project.document,
      isDirty: false,
    });
    setLayers(project.layers);
    clearHistory();
    setIsInitialized(true);
  }, [projectRecord?.project?.id]);

  if (isLoading || (projectRecord && !isInitialized)) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: editorTokens.bg.app,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: editorTokens.text.secondary,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            backgroundColor: editorTokens.accent.primary,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          Pf
        </div>
        <CircularProgress size={24} sx={{ color: editorTokens.accent.primary }} />
        <span style={{ fontSize: '0.82rem' }}>Opening cloud project...</span>
      </div>
    );
  }

  const { data: pendingInvitations = [] } = usePendingInvitations();
  const acceptMutation = useAcceptInvitation();
  const [isAccepting, setIsAccepting] = useState(false);

  const matchingInvite = pendingInvitations.find((inv) => inv.projectId === projectId);

  const handleAcceptInvite = async () => {
    if (!matchingInvite) return;
    setIsAccepting(true);
    try {
      await acceptMutation.mutateAsync(matchingInvite.id);
      window.location.reload();
    } catch (err) {
      console.error('Failed to accept invite:', err);
      setIsAccepting(false);
    }
  };

  if (isError || !projectRecord) {
    if (matchingInvite) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: editorTokens.bg.app,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: editorTokens.text.primary,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: editorTokens.accent.primary,
            }}
          >
            <Mail size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>You Have Been Invited!</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: editorTokens.text.secondary, maxWidth: 460 }}>
            You have a pending invitation from{' '}
            <strong style={{ color: '#ffffff' }}>{matchingInvite.invitedBy?.displayName || 'the project owner'}</strong> to collaborate
            on <strong style={{ color: '#ffffff' }}>&ldquo;{matchingInvite.projectName}&rdquo;</strong> as{' '}
            <strong style={{ color: '#60a5fa', textTransform: 'capitalize' }}>{matchingInvite.role}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowLeft size={14} />}
              onClick={() => router.push('/dashboard')}
              sx={{ fontSize: '0.75rem', color: editorTokens.text.secondary }}
            >
              Dashboard
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={isAccepting}
              startIcon={isAccepting ? <CircularProgress size={14} color="inherit" /> : <Check size={14} />}
              onClick={handleAcceptInvite}
              sx={{ fontSize: '0.75rem', px: 2.5 }}
            >
              Accept Invitation & Join
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: editorTokens.bg.app,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: editorTokens.text.primary,
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={28} />
        </div>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Project Not Found or Access Denied</h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: editorTokens.text.secondary, maxWidth: 440 }}>
          This project could not be found or you do not have permission to view it.
          Check that you are logged into the correct account or ask the project owner for an invitation.
        </p>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowLeft size={14} />}
          onClick={() => router.push('/dashboard')}
          sx={{ mt: 1, fontSize: '0.75rem' }}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return <EditorShell />;
}
