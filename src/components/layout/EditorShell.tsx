'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import Konva from 'konva';
import { useToolStore } from '@/store/toolStore';
import { useHistoryStore } from '@/store/historyStore';
import { useDocumentStore } from '@/store/documentStore';
import { useViewStore } from '@/store/viewStore';
import { useUIStore } from '@/store/uiStore';
import { useLayerStore } from '@/store/layerStore';
import { useSelectionStore } from '@/store/selectionStore';
import { isFormInputElement } from '@/lib/keyboard/shortcutRegistry';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { DeleteLayerCommand } from '@/editor/commands/LayerCommands';
import { AddMaskCommand } from '@/editor/commands/MaskCommands';
import { TopMenuBar } from './TopMenuBar';
import { OptionsBar } from './OptionsBar';
import { DocumentTabs } from './DocumentTabs';
import { StatusBar } from './StatusBar';
import { ToolBar } from '../toolbar/ToolBar';
import { PanelDock } from '../panels/PanelDock';
import { CanvasViewport } from '@/editor/canvas/CanvasViewport';
import { ViewOnlyBanner } from '../collaboration/ViewOnlyBanner';
import { useCollaborativeEditor } from '@/hooks/useCollaborativeEditor';
import { useCollaborationStore } from '@/store/collaborationStore';
import { NewDocumentDialog } from '../dialogs/NewDocumentDialog';
import { ExportDialog } from '../dialogs/ExportDialog';
import { ShortcutsDialog } from '../dialogs/ShortcutsDialog';
import { FiltersDialog } from '../dialogs/FiltersDialog';
import { AdjustmentsDialog } from '../dialogs/AdjustmentsDialog';
import { CommandPalette } from '../common/CommandPalette';
import { ToastNotification } from '../common/ToastNotification';
import { editorTokens } from '@/theme/palette';

export const EditorShell: React.FC = () => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const { userRole } = useCollaborationStore();
  const { document: doc } = useDocumentStore();
  const { handlePointerMove } = useCollaborativeEditor(doc?.id || null, userRole);

  const {
    activeTool,
    setActiveTool,
    setTemporaryHand,
    swapColors,
    resetColors,
  } = useToolStore();

  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const {
    zoomIn,
    zoomOut,
    resetZoom,
    fitToViewport,
    toggleRulers,
    toggleGuides,
    toggleGrid,
    toggleSnapEnabled,
  } = useViewStore();

  const {
    openDialog,
    setCommandPaletteOpen,
    showToast,
    toggleRightSidebar,
  } = useUIStore();

  const {
    activeLayerId,
    layers,
    duplicateLayer,
    selectedLayerIds,
    editingMaskLayerId,
    setEditingMask,
  } = useLayerStore();

  const { selectAll, clearSelection, invertSelection } = useSelectionStore();

  // Keyboard shortcut handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore key events originating in input, textarea, etc.
      if (isFormInputElement(e.target)) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Spacebar temporary hand tool
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setTemporaryHand(true);
        return;
      }

      // Tab toggles right sidebar
      if (e.key === 'Tab') {
        e.preventDefault();
        toggleRightSidebar();
        return;
      }

      // Command Palette
      if (isCtrlOrCmd && key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Undo / Redo
      if (isCtrlOrCmd && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (isCtrlOrCmd && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Save Project (.pxf)
      if (isCtrlOrCmd && key === 's') {
        e.preventDefault();
        PxfSerializer.exportToFile();
        showToast('Project saved (.pxf)', 'success');
        return;
      }

      // Export Image
      if (isCtrlOrCmd && e.shiftKey && key === 'e') {
        e.preventDefault();
        openDialog('export');
        return;
      }

      // New Document
      if (isCtrlOrCmd && key === 'n') {
        e.preventDefault();
        openDialog('new');
        return;
      }

      // Duplicate Layer
      if (isCtrlOrCmd && key === 'j') {
        e.preventDefault();
        if (activeLayerId) {
          duplicateLayer(activeLayerId);
          showToast('Layer duplicated', 'info');
        }
        return;
      }

      // Select All
      if (isCtrlOrCmd && !e.shiftKey && key === 'a') {
        e.preventDefault();
        if (doc) selectAll(doc.width, doc.height);
        return;
      }

      // Deselect Selection
      if (isCtrlOrCmd && key === 'd') {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Inverse Selection
      if (isCtrlOrCmd && e.shiftKey && key === 'i') {
        e.preventDefault();
        if (doc) invertSelection(doc.width, doc.height);
        return;
      }

      // Add Layer Mask
      if (isCtrlOrCmd && e.shiftKey && key === 'm') {
        e.preventDefault();
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayerId && activeLayer && !activeLayer.mask && doc) {
          const cmd = new AddMaskCommand(activeLayerId, doc.width, doc.height);
          useHistoryStore.getState().executeCommand(cmd);
          showToast('Added layer mask', 'success');
        }
        return;
      }

      // Toggle Mask Editing
      if (key === '\\') {
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer?.mask) {
          e.preventDefault();
          setEditingMask(editingMaskLayerId === activeLayer.id ? null : activeLayer.id);
        }
        return;
      }

      // Toggle Snap
      if (isCtrlOrCmd && e.shiftKey && key === ';') {
        e.preventDefault();
        toggleSnapEnabled();
        return;
      }

      // Delete Layer
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer) {
          e.preventDefault();
          const cmd = new DeleteLayerCommand(activeLayer);
          useHistoryStore.getState().executeCommand(cmd);
          showToast(`Deleted "${activeLayer.name}"`, 'info');
        }
        return;
      }

      // View & Zoom shortcuts
      if (isCtrlOrCmd && (key === '=' || key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (isCtrlOrCmd && key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }
      if (isCtrlOrCmd && key === '0') {
        e.preventDefault();
        if (doc) fitToViewport(window.innerWidth - 300, window.innerHeight - 150, doc.width, doc.height);
        return;
      }
      if (isCtrlOrCmd && key === '1') {
        e.preventDefault();
        resetZoom();
        return;
      }
      if (isCtrlOrCmd && key === 'r') {
        e.preventDefault();
        toggleRulers();
        return;
      }
      if (isCtrlOrCmd && key === ';') {
        e.preventDefault();
        toggleGuides();
        return;
      }
      if (isCtrlOrCmd && key === "'") {
        e.preventDefault();
        toggleGrid();
        return;
      }

      // Help shortcuts
      if (key === '?') {
        e.preventDefault();
        openDialog('shortcuts');
        return;
      }

      // Color swap / reset
      if (key === 'x') {
        e.preventDefault();
        swapColors();
        return;
      }
      if (key === 'd') {
        e.preventDefault();
        resetColors();
        return;
      }

      // Tool selection shortcuts (when no modifier key)
      if (!isCtrlOrCmd && !e.altKey) {
        switch (key) {
          case 'v':
            setActiveTool('move');
            break;
          case 'm':
            setActiveTool('marquee');
            break;
          case 'l':
            setActiveTool('lasso');
            break;
          case 'w':
            setActiveTool('magic-wand');
            break;
          case 'c':
            setActiveTool('crop');
            break;
          case 'i':
            setActiveTool('eyedropper');
            break;
          case 'b':
            setActiveTool('brush');
            break;
          case 'e':
            setActiveTool('eraser');
            break;
          case 'g':
            setActiveTool('gradient');
            break;
          case 'p':
            setActiveTool('pen');
            break;
          case 't':
            setActiveTool('text');
            break;
          case 'u':
            setActiveTool('rectangle');
            break;
          case 'h':
            setActiveTool('hand');
            break;
          case 'z':
            setActiveTool('zoom');
            break;
          default:
            break;
        }
      }
    },
    [
      setTemporaryHand,
      toggleRightSidebar,
      setCommandPaletteOpen,
      redo,
      undo,
      openDialog,
      activeLayerId,
      duplicateLayer,
      showToast,
      layers,
      zoomIn,
      zoomOut,
      fitToViewport,
      resetZoom,
      toggleRulers,
      toggleGuides,
      toggleGrid,
      swapColors,
      resetColors,
      setActiveTool,
      doc,
      selectAll,
      clearSelection,
      invertSelection,
      toggleSnapEnabled,
      editingMaskLayerId,
      setEditingMask,
    ]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setTemporaryHand(false);
      }
    },
    [setTemporaryHand]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div
      onContextMenu={(e) => {
        if (!isFormInputElement(e.target)) {
          e.preventDefault();
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: editorTokens.bg.app,
        overflow: 'hidden',
      }}
    >
      {/* 1. Top Menu Bar */}
      <TopMenuBar />

      {/* 2. Contextual Options Bar */}
      <OptionsBar />

      {/* 3. Document Tabs */}
      <DocumentTabs />

      {/* View-Only Banner for restricted users */}
      <ViewOnlyBanner />

      {/* 4. Main Middle Area: Toolbar + Canvas + PanelDock */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Toolbar */}
        <ToolBar />

        {/* Center Canvas Viewport */}
        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
          <CanvasViewport
            onStageReady={(stage) => (stageRef.current = stage)}
            onDocumentPointerMove={handlePointerMove}
          />
        </div>

        {/* Right Collapsible Panel Dock */}
        <PanelDock />
      </div>

      {/* 5. Bottom Status Bar */}
      <StatusBar />

      {/* Dialogs */}
      <NewDocumentDialog />
      <ExportDialog stageRef={stageRef} />
      <ShortcutsDialog />
      <FiltersDialog />
      <AdjustmentsDialog />
      <CommandPalette />
      <ToastNotification />
    </div>
  );
};
