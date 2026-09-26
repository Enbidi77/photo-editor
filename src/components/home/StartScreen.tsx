'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { Plus, FolderOpen, Image as ImageIcon, Trash2, Clock, Upload } from 'lucide-react';
import { isFormInputElement } from '@/lib/keyboard/shortcutRegistry';
import { DropzoneOverlay, DropzoneState } from '@/components/common/DropzoneOverlay';
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

  const [dropState, setDropState] = useState<DropzoneState>('idle');
  const [dropError, setDropError] = useState<string>('');
  const dragCounterRef = useRef(0);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearErrorTimeout = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  const triggerError = useCallback(
    (msg: string) => {
      clearErrorTimeout();
      setDropError(msg);
      setDropState('error');
      errorTimeoutRef.current = setTimeout(() => {
        setDropState('idle');
      }, 6000);
    },
    [clearErrorTimeout]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      clearErrorTimeout();

      const pxfFile = files.find(
        (f) => f.name.endsWith('.pxf') || f.type === 'application/json'
      );
      if (pxfFile) {
        try {
          setDropState('confirming');
          await new Promise((r) => setTimeout(r, 450));
          const project = await PxfSerializer.loadFromFile(pxfFile);
          await projectRepository.save(project);
          setDropState('idle');
          onOpenEditor();
          showToast(`Opened project "${pxfFile.name}"`, 'success');
          return;
        } catch {
          triggerError('Failed to open project file. The file may be corrupted.');
          showToast('Failed to open project file', 'error');
          return;
        }
      }

      const imageFiles = files.filter(
        (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(f.name)
      );

      if (imageFiles.length === 0) {
        triggerError('Unsupported file type. Please upload an image (PNG, JPG, WebP, SVG, GIF) or .pxf project.');
        return;
      }

      try {
        setDropState('confirming');
        await new Promise((r) => setTimeout(r, 450));

        clearLayers();
        clearHistory();

        const firstImg = await ImageLoader.loadFromFile(imageFiles[0]);
        const baseWidth = firstImg.width || 800;
        const baseHeight = firstImg.height || 600;
        createNewDocument(firstImg.name, baseWidth, baseHeight, 72, '#ffffff');

        const firstLayer: ImageLayer = {
          id: nanoid(),
          type: 'IMAGE',
          name: firstImg.name,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: baseWidth,
          height: baseHeight,
          rotation: 0,
          zIndex: 0,
          parentId: null,
          imageUrl: firstImg.dataUrl,
          naturalWidth: baseWidth,
          naturalHeight: baseHeight,
          adjustments: { ...DEFAULT_ADJUSTMENTS },
        };
        useLayerStore.getState().addLayer(firstLayer, 0);

        for (let i = 1; i < imageFiles.length; i++) {
          const extraImg = await ImageLoader.loadFromFile(imageFiles[i]);
          let w = extraImg.width || 800;
          let h = extraImg.height || 600;
          if (w > baseWidth || h > baseHeight) {
            const scale = Math.min(baseWidth / w, baseHeight / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const x = Math.round((baseWidth - w) / 2) + i * 20;
          const y = Math.round((baseHeight - h) / 2) + i * 20;

          const layer: ImageLayer = {
            id: nanoid(),
            type: 'IMAGE',
            name: extraImg.name,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            x,
            y,
            width: w,
            height: h,
            rotation: 0,
            zIndex: i,
            parentId: null,
            imageUrl: extraImg.dataUrl,
            naturalWidth: extraImg.width || 800,
            naturalHeight: extraImg.height || 600,
            adjustments: { ...DEFAULT_ADJUSTMENTS },
          };
          useLayerStore.getState().addLayer(layer, 0);
        }

        setDropState('idle');
        onOpenEditor();
        if (imageFiles.length === 1) {
          showToast(`Imported "${firstImg.name}"`, 'success');
        } else {
          showToast(`Imported ${imageFiles.length} images`, 'success');
        }
      } catch {
        triggerError('Failed to load image file. Please verify the file is valid.');
        showToast('Failed to load image file', 'error');
      }
    },
    [clearLayers, clearHistory, createNewDocument, onOpenEditor, showToast, triggerError, clearErrorTimeout]
  );

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.pxf,application/json';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        processFiles(files);
      }
    };
    input.click();
  };

  // Drag and drop handlers for StartScreen
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounterRef.current += 1;
        clearErrorTimeout();
        setDropState('dragging');
      }
    },
    [clearErrorTimeout]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDropState((prev) => (prev === 'dragging' ? 'idle' : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFiles(files);
      } else {
        setDropState('idle');
      }
    },
    [processFiles]
  );

  // Clipboard paste listener (Ctrl+V) on StartScreen
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isFormInputElement(e.target)) return;
      if (!e.clipboardData) return;

      const imgInfo = await ImageLoader.loadFromClipboard(e.clipboardData.items);
      if (imgInfo) {
        clearLayers();
        clearHistory();
        const baseWidth = imgInfo.width || 800;
        const baseHeight = imgInfo.height || 600;
        createNewDocument(imgInfo.name, baseWidth, baseHeight, 72, '#ffffff');

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
          width: baseWidth,
          height: baseHeight,
          rotation: 0,
          zIndex: 0,
          parentId: null,
          imageUrl: imgInfo.dataUrl,
          naturalWidth: baseWidth,
          naturalHeight: baseHeight,
          adjustments: { ...DEFAULT_ADJUSTMENTS },
        };
        useLayerStore.getState().addLayer(newImageLayer, 0);
        onOpenEditor();
        showToast(`Imported "${imgInfo.name}"`, 'success');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [clearLayers, clearHistory, createNewDocument, onOpenEditor, showToast]);

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
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
          filter: dropState === 'dragging' ? 'blur(4px) brightness(0.6)' : 'none',
          transition: 'filter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
      <div
        style={{
          padding: '32px 40px',
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          filter: dropState === 'dragging' ? 'blur(4px) brightness(0.6)' : 'none',
          transition: 'filter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drag & Drop Upload Dropzone Card */}
        <div
          data-testid="start-screen-dropzone"
          role="button"
          tabIndex={0}
          aria-label="Upload image or project file. Press Enter or Space to choose a file, or drag and drop files here."
          onClick={handleOpenFile}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenFile();
            }
          }}
          style={{
            marginBottom: 32,
            padding: '32px 24px',
            border: `2px dashed ${editorTokens.border.medium}`,
            borderRadius: 8,
            backgroundColor: editorTokens.bg.panel,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, outline 0.15s ease',
            textAlign: 'center',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = editorTokens.accent.primary;
            e.currentTarget.style.boxShadow = `0 0 20px ${editorTokens.accent.primary}44`;
            e.currentTarget.style.outline = `2px solid ${editorTokens.border.focus}`;
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = editorTokens.border.medium;
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.outline = 'none';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = editorTokens.accent.primary;
            e.currentTarget.style.backgroundColor = editorTokens.bg.surface;
            e.currentTarget.style.boxShadow = `0 0 20px ${editorTokens.accent.primary}33`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = editorTokens.border.medium;
            e.currentTarget.style.backgroundColor = editorTokens.bg.panel;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: `${editorTokens.accent.primary}22`,
              border: `1px solid ${editorTokens.accent.primary}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: editorTokens.accent.primary,
            }}
          >
            <Upload size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
              Drag & drop an image or project here to start
            </div>
            <div style={{ fontSize: '0.82rem', color: '#d0d0d0', marginBottom: 8 }}>
              Or <span style={{ color: editorTokens.accent.primary, textDecoration: 'underline', fontWeight: 600 }}>browse files</span> from your computer
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.72rem',
                color: '#aaaaaa',
              }}
            >
              <span>PNG, JPG, WebP, SVG, GIF, PXF</span>
            </div>
          </div>
        </div>

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

      {/* Fullscreen Drag Overlay with confirmation and accessible error states */}
      <DropzoneOverlay
        state={dropState}
        title="Drop your image here"
        subtitle="Release to create a new project canvas"
        confirmTitle="Image dropped!"
        confirmSubtitle="Preparing your project canvas..."
        errorMessage={dropError}
        onRetry={handleOpenFile}
        onDismissError={() => setDropState('idle')}
        fullScreen={true}
        testId="start-screen-drag-overlay"
      />
    </div>
  );
};
