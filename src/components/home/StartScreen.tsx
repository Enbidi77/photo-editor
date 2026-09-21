'use client';

import React, { useEffect, useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUIStore } from '@/store/uiStore';
import { projectRepository } from '@/lib/storage/projectRepository';
import { RecentProjectSummary, PixelForgeProject } from '@/types/project';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { ImageLoader } from '@/lib/image/imageLoader';
import { ImageLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';
import { editorTokens } from '@/theme/palette';
import { formatDistanceToNow } from 'date-fns';
import { Plus, FolderOpen, Image as ImageIcon, Trash2, Clock } from 'lucide-react';
import Button from '@mui/material/Button';
import { nanoid } from 'nanoid';

interface StartScreenProps {
  onOpenEditor: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onOpenEditor }) => {
  const [recentProjects, setRecentProjects] = useState<RecentProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const { createNewDocument, setDocument } = useDocumentStore();
  const { setLayers, clearLayers } = useLayerStore();
  const { clearHistory } = useHistoryStore();
  const { openDialog, showToast } = useUIStore();

  const loadRecent = async () => {
    setLoading(true);
    try {
      const list = await projectRepository.getRecent();
      setRecentProjects(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handleCreateNew = () => {
    openDialog('new');
    onOpenEditor();
  };

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pxf,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.name.endsWith('.pxf') || file.type === 'application/json') {
        try {
          const project = await PxfSerializer.loadFromFile(file);
          await projectRepository.save(project);
          onOpenEditor();
          showToast(`Opened project "${file.name}"`, 'success');
        } catch {
          showToast('Failed to open project file', 'error');
        }
      } else if (file.type.startsWith('image/')) {
        try {
          const imgInfo = await ImageLoader.loadFromFile(file);
          clearLayers();
          clearHistory();
          createNewDocument(imgInfo.name, imgInfo.width, imgInfo.height, 72, '#ffffff');

          const newImageLayer: ImageLayer = {
            id: nanoid(),
            type: 'IMAGE',
            name: imgInfo.name,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            x: 0,
            y: 0,
            width: imgInfo.width,
            height: imgInfo.height,
            rotation: 0,
            zIndex: 0,
            parentId: null,
            imageUrl: imgInfo.dataUrl,
            naturalWidth: imgInfo.width,
            naturalHeight: imgInfo.height,
            adjustments: { ...DEFAULT_ADJUSTMENTS },
          };
          useLayerStore.getState().addLayer(newImageLayer, 0);
          onOpenEditor();
          showToast(`Imported "${imgInfo.name}"`, 'success');
        } catch {
          showToast('Failed to load image', 'error');
        }
      }
    };
    input.click();
  };

  const handleOpenRecentProject = async (id: string) => {
    try {
      const proj = await projectRepository.get(id);
      if (proj) {
        PxfSerializer.deserialize(proj);
        onOpenEditor();
        showToast(`Opened "${proj.document.name}"`, 'success');
      }
    } catch {
      showToast('Could not load recent project', 'error');
    }
  };

  const handleDeleteRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await projectRepository.delete(id);
      setRecentProjects((prev) => prev.filter((p) => p.id !== id));
      showToast('Project removed from library', 'info');
    } catch {
      showToast('Failed to delete project', 'error');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: editorTokens.bg.app,
        color: editorTokens.text.primary,
        overflowY: 'auto',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 40px',
          borderBottom: `1px solid ${editorTokens.border.subtle}`,
          backgroundColor: editorTokens.bg.toolbar,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              backgroundColor: editorTokens.accent.primary,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            Pf
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.02em' }}>
            PixelForge
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={15} />}
            onClick={handleCreateNew}
            sx={{ fontSize: '0.75rem', padding: '4px 14px' }}
          >
            New File...
          </Button>
          <Button
            variant="outlined"
            startIcon={<FolderOpen size={15} />}
            onClick={handleOpenFile}
            sx={{ fontSize: '0.75rem', padding: '4px 14px', color: editorTokens.text.primary }}
          >
            Open...
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '32px 40px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color={editorTokens.accent.primary} />
          <span>Recent Projects</span>
        </div>

        {loading ? (
          <div style={{ color: editorTokens.text.secondary, fontSize: '0.8rem' }}>Loading recent projects...</div>
        ) : recentProjects.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: editorTokens.bg.panel,
              border: `1px dashed ${editorTokens.border.medium}`,
              borderRadius: 4,
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: editorTokens.text.primary }}>
              No Recent Projects Found
            </div>
            <div style={{ fontSize: '0.75rem', color: editorTokens.text.secondary, marginBottom: 20 }}>
              Create a document, paste an image, or import a file to start editing.
            </div>
            <Button variant="contained" color="primary" onClick={handleCreateNew}>
              Create New Document
            </Button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {recentProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => handleOpenRecentProject(p.id)}
                style={{
                  backgroundColor: editorTokens.bg.panel,
                  border: `1px solid ${editorTokens.border.subtle}`,
                  borderRadius: 4,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  position: 'relative',
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
                {/* Thumbnail */}
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
                  {p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <ImageIcon size={32} color={editorTokens.text.muted} />
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteRecent(e, p.id)}
                    title="Remove project from library"
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
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Card Meta */}
                <div style={{ padding: '10px 12px' }}>
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
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: editorTokens.text.secondary }}>
                    {p.width} × {p.height} px &nbsp;•&nbsp; {p.layerCount} layer{p.layerCount === 1 ? '' : 's'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: editorTokens.text.muted, marginTop: 4 }}>
                    Edited {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
