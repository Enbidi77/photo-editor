'use client';

import React, { useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useViewStore } from '@/store/viewStore';
import { useUIStore } from '@/store/uiStore';
import { useToolStore } from '@/store/toolStore';
import { useSelectionStore } from '@/store/selectionStore';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { ImageLoader } from '@/lib/image/imageLoader';
import { AddLayerCommand, DeleteLayerCommand } from '@/editor/commands/LayerCommands';
import { ImageLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';
import { editorTokens } from '@/theme/palette';
import { FilterType } from '@/types/filters';
import { nanoid } from 'nanoid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

export const TopMenuBar: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { document: doc, closeDocument } = useDocumentStore();
  const {
    layers,
    activeLayerId,
    duplicateLayer,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    toggleVisibility,
    toggleLock,
    clearLayers,
  } = useLayerStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const {
    zoomIn,
    zoomOut,
    resetZoom,
    fitToViewport,
    toggleRulers,
    toggleGuides,
    toggleGrid,
    showRulers,
    showGuides,
    showGrid,
  } = useViewStore();
  const { openDialog, setCommandPaletteOpen, showToast, setActivePanel } = useUIStore();
  const { clearSelection } = useSelectionStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const handleMenuClick = (menuName: string, event: React.MouseEvent<HTMLElement>) => {
    setActiveMenu(menuName);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setActiveMenu(null);
    setAnchorEl(null);
  };

  // Open file handler (image or .pxf)
  const handleOpenFile = () => {
    handleMenuClose();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pxf,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.name.endsWith('.pxf') || file.type === 'application/json') {
        try {
          await PxfSerializer.loadFromFile(file);
          showToast(`Opened project "${file.name}"`, 'success');
        } catch {
          showToast('Failed to open project file', 'error');
        }
      } else if (file.type.startsWith('image/')) {
        try {
          const imgInfo = await ImageLoader.loadFromFile(file);
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
            zIndex: layers.length,
            parentId: null,
            imageUrl: imgInfo.dataUrl,
            naturalWidth: imgInfo.width,
            naturalHeight: imgInfo.height,
            adjustments: { ...DEFAULT_ADJUSTMENTS },
          };
          const cmd = new AddLayerCommand(newImageLayer, 0);
          useHistoryStore.getState().executeCommand(cmd);
          showToast(`Imported image "${imgInfo.name}"`, 'success');
        } catch {
          showToast('Failed to load image', 'error');
        }
      }
    };
    input.click();
  };

  const menuButtonSx = (menuName: string) => ({
    backgroundColor: activeMenu === menuName ? editorTokens.bg.surface : 'transparent',
    color: activeMenu === menuName ? '#ffffff' : editorTokens.text.primary,
    border: 'none',
    padding: '2px 8px',
    borderRadius: 2,
    cursor: 'pointer',
    fontSize: '0.72rem',
    height: 24,
    display: 'flex',
    alignItems: 'center',
    outline: 'none',
    '&:hover': {
      backgroundColor: editorTokens.bg.hoverRow,
    },
  });

  return (
    <div
      style={{
        height: 28,
        backgroundColor: editorTokens.bg.app,
        borderBottom: `1px solid ${editorTokens.border.subtle}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        zIndex: 50,
        userSelect: 'none',
      }}
    >
      {/* Brand Icon & Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginRight: 12,
          paddingRight: 10,
          borderRight: `1px solid ${editorTokens.border.subtle}`,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            backgroundColor: editorTokens.accent.primary,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '10px',
            fontFamily: 'monospace',
          }}
        >
          Pf
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: editorTokens.text.primary,
          }}
        >
          PixelForge
        </span>
      </div>

      {/* Menu Headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* FILE */}
        <button
          type="button"
          style={menuButtonSx('file')}
          onClick={(e) => handleMenuClick('file', e)}
        >
          File
        </button>

        {/* EDIT */}
        <button
          type="button"
          style={menuButtonSx('edit')}
          onClick={(e) => handleMenuClick('edit', e)}
        >
          Edit
        </button>

        {/* IMAGE */}
        <button
          type="button"
          style={menuButtonSx('image')}
          onClick={(e) => handleMenuClick('image', e)}
        >
          Image
        </button>

        {/* LAYER */}
        <button
          type="button"
          style={menuButtonSx('layer')}
          onClick={(e) => handleMenuClick('layer', e)}
        >
          Layer
        </button>

        {/* SELECT */}
        <button
          type="button"
          style={menuButtonSx('select')}
          onClick={(e) => handleMenuClick('select', e)}
        >
          Select
        </button>

        {/* FILTER */}
        <button
          type="button"
          style={menuButtonSx('filter')}
          onClick={(e) => handleMenuClick('filter', e)}
        >
          Filter
        </button>

        {/* VIEW */}
        <button
          type="button"
          style={menuButtonSx('view')}
          onClick={(e) => handleMenuClick('view', e)}
        >
          View
        </button>

        {/* WINDOW */}
        <button
          type="button"
          style={menuButtonSx('window')}
          onClick={(e) => handleMenuClick('window', e)}
        >
          Window
        </button>

        {/* HELP */}
        <button
          type="button"
          style={menuButtonSx('help')}
          onClick={(e) => handleMenuClick('help', e)}
        >
          Help
        </button>
      </div>

      {/* Common Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        MenuListProps={{ 'aria-labelledby': 'basic-button' }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {/* FILE MENU */}
        {activeMenu === 'file' && [
          <MenuItem
            key="new"
            onClick={() => {
              handleMenuClose();
              openDialog('new');
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>New Document...</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+N</Typography>
          </MenuItem>,
          <MenuItem key="open" onClick={handleOpenFile}>
            <Typography variant="inherit" sx={{ flex: 1 }}>Open File / Project...</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+O</Typography>
          </MenuItem>,
          <Divider key="d1" sx={{ my: 0.5 }} />,
          <MenuItem
            key="save"
            onClick={() => {
              handleMenuClose();
              PxfSerializer.exportToFile();
              showToast('Project saved (.pxf)', 'success');
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Save Project (.pxf)</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+S</Typography>
          </MenuItem>,
          <MenuItem
            key="export"
            onClick={() => {
              handleMenuClose();
              openDialog('export');
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Export As...</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+Shift+E</Typography>
          </MenuItem>,
          <Divider key="d2" sx={{ my: 0.5 }} />,
          <MenuItem
            key="close"
            onClick={() => {
              handleMenuClose();
              if (window.confirm('Close current document? Any unsaved changes will be lost.')) {
                clearLayers();
                closeDocument();
              }
            }}
          >
            <Typography variant="inherit">Close Document</Typography>
          </MenuItem>,
        ]}

        {/* EDIT MENU */}
        {activeMenu === 'edit' && [
          <MenuItem
            key="undo"
            disabled={!canUndo()}
            onClick={() => {
              handleMenuClose();
              undo();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Undo</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+Z</Typography>
          </MenuItem>,
          <MenuItem
            key="redo"
            disabled={!canRedo()}
            onClick={() => {
              handleMenuClose();
              redo();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Redo</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+Shift+Z</Typography>
          </MenuItem>,
          <Divider key="d3" sx={{ my: 0.5 }} />,
          <MenuItem
            key="duplicate"
            disabled={!activeLayerId}
            onClick={() => {
              handleMenuClose();
              if (activeLayerId) duplicateLayer(activeLayerId);
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Duplicate Layer</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+J</Typography>
          </MenuItem>,
          <MenuItem
            key="delete"
            disabled={!activeLayer}
            onClick={() => {
              handleMenuClose();
              if (activeLayer) {
                const cmd = new DeleteLayerCommand(activeLayer);
                useHistoryStore.getState().executeCommand(cmd);
              }
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Delete Layer</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Del</Typography>
          </MenuItem>,
        ]}

        {/* IMAGE MENU */}
        {activeMenu === 'image' && [
          <MenuItem
            key="adj"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('adjustments');
            }}
          >
            <Typography variant="inherit">Adjustments (Brightness/Contrast)...</Typography>
          </MenuItem>,
          <MenuItem
            key="crop"
            onClick={() => {
              handleMenuClose();
              useToolStore.getState().setActiveTool('crop');
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Crop Canvas</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>C</Typography>
          </MenuItem>,
        ]}

        {/* LAYER MENU */}
        {activeMenu === 'layer' && [
          <MenuItem
            key="bring-front"
            disabled={!activeLayerId}
            onClick={() => {
              handleMenuClose();
              if (activeLayerId) bringToFront(activeLayerId);
            }}
          >
            <Typography variant="inherit">Bring to Front</Typography>
          </MenuItem>,
          <MenuItem
            key="bring-fwd"
            disabled={!activeLayerId}
            onClick={() => {
              handleMenuClose();
              if (activeLayerId) bringForward(activeLayerId);
            }}
          >
            <Typography variant="inherit">Bring Forward</Typography>
          </MenuItem>,
          <MenuItem
            key="send-back"
            disabled={!activeLayerId}
            onClick={() => {
              handleMenuClose();
              if (activeLayerId) sendToBack(activeLayerId);
            }}
          >
            <Typography variant="inherit">Send to Back</Typography>
          </MenuItem>,
          <MenuItem
            key="send-bwd"
            disabled={!activeLayerId}
            onClick={() => {
              handleMenuClose();
              if (activeLayerId) sendBackward(activeLayerId);
            }}
          >
            <Typography variant="inherit">Send Backward</Typography>
          </MenuItem>,
          <Divider key="d4" sx={{ my: 0.5 }} />,
          <MenuItem
            key="vis"
            disabled={!activeLayerId}
            onClick={() => {
              handleMenuClose();
              if (activeLayerId) toggleVisibility(activeLayerId);
            }}
          >
            <Typography variant="inherit">Toggle Visibility</Typography>
          </MenuItem>,
          <MenuItem
            key="lock"
            disabled={!activeLayerId}
            onClick={() => {
              handleMenuClose();
              if (activeLayerId) toggleLock(activeLayerId);
            }}
          >
            <Typography variant="inherit">Toggle Lock</Typography>
          </MenuItem>,
        ]}

        {/* SELECT MENU */}
        {activeMenu === 'select' && [
          <MenuItem
            key="deselect"
            onClick={() => {
              handleMenuClose();
              clearSelection();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Deselect</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+D</Typography>
          </MenuItem>,
        ]}

        {/* FILTER MENU */}
        {activeMenu === 'filter' && [
          <MenuItem
            key="blur"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('filters', 'blur');
            }}
          >
            <Typography variant="inherit">Gaussian Blur...</Typography>
          </MenuItem>,
          <MenuItem
            key="sharpen"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('filters', 'sharpen');
            }}
          >
            <Typography variant="inherit">Sharpen...</Typography>
          </MenuItem>,
          <MenuItem
            key="bw"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('filters', 'grayscale');
            }}
          >
            <Typography variant="inherit">Black & White (Grayscale)...</Typography>
          </MenuItem>,
          <MenuItem
            key="sepia"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('filters', 'sepia');
            }}
          >
            <Typography variant="inherit">Sepia...</Typography>
          </MenuItem>,
          <MenuItem
            key="invert"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('filters', 'invert');
            }}
          >
            <Typography variant="inherit">Invert Colors...</Typography>
          </MenuItem>,
          <MenuItem
            key="noise"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('filters', 'noise');
            }}
          >
            <Typography variant="inherit">Add Noise...</Typography>
          </MenuItem>,
          <MenuItem
            key="pix"
            disabled={!activeLayer || activeLayer.type !== 'IMAGE'}
            onClick={() => {
              handleMenuClose();
              openDialog('filters', 'pixelate');
            }}
          >
            <Typography variant="inherit">Pixelate / Mosaic...</Typography>
          </MenuItem>,
        ]}

        {/* VIEW MENU */}
        {activeMenu === 'view' && [
          <MenuItem
            key="zin"
            onClick={() => {
              handleMenuClose();
              zoomIn();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Zoom In</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl++</Typography>
          </MenuItem>,
          <MenuItem
            key="zout"
            onClick={() => {
              handleMenuClose();
              zoomOut();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Zoom Out</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+-</Typography>
          </MenuItem>,
          <MenuItem
            key="100"
            onClick={() => {
              handleMenuClose();
              resetZoom();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Actual Pixels (100%)</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+1</Typography>
          </MenuItem>,
          <MenuItem
            key="fit"
            onClick={() => {
              handleMenuClose();
              if (doc) fitToViewport(window.innerWidth - 300, window.innerHeight - 150, doc.width, doc.height);
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Fit on Screen</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+0</Typography>
          </MenuItem>,
          <Divider key="d5" sx={{ my: 0.5 }} />,
          <MenuItem
            key="rulers"
            onClick={() => {
              handleMenuClose();
              toggleRulers();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>
              {showRulers ? 'Hide Rulers' : 'Show Rulers'}
            </Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+R</Typography>
          </MenuItem>,
          <MenuItem
            key="guides"
            onClick={() => {
              handleMenuClose();
              toggleGuides();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>
              {showGuides ? 'Hide Guides' : 'Show Guides'}
            </Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+;</Typography>
          </MenuItem>,
          <MenuItem
            key="grid"
            onClick={() => {
              handleMenuClose();
              toggleGrid();
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+'</Typography>
          </MenuItem>,
        ]}

        {/* WINDOW MENU */}
        {activeMenu === 'window' && [
          <MenuItem
            key="layers-p"
            onClick={() => {
              handleMenuClose();
              setActivePanel('layers');
            }}
          >
            <Typography variant="inherit">Layers</Typography>
          </MenuItem>,
          <MenuItem
            key="prop-p"
            onClick={() => {
              handleMenuClose();
              setActivePanel('properties');
            }}
          >
            <Typography variant="inherit">Properties</Typography>
          </MenuItem>,
          <MenuItem
            key="hist-p"
            onClick={() => {
              handleMenuClose();
              setActivePanel('history');
            }}
          >
            <Typography variant="inherit">History</Typography>
          </MenuItem>,
          <MenuItem
            key="nav-p"
            onClick={() => {
              handleMenuClose();
              setActivePanel('navigator');
            }}
          >
            <Typography variant="inherit">Navigator</Typography>
          </MenuItem>,
          <MenuItem
            key="col-p"
            onClick={() => {
              handleMenuClose();
              setActivePanel('color');
            }}
          >
            <Typography variant="inherit">Color</Typography>
          </MenuItem>,
          <MenuItem
            key="brush-p"
            onClick={() => {
              handleMenuClose();
              setActivePanel('brushes');
            }}
          >
            <Typography variant="inherit">Brushes</Typography>
          </MenuItem>,
          <MenuItem
            key="char-p"
            onClick={() => {
              handleMenuClose();
              setActivePanel('character');
            }}
          >
            <Typography variant="inherit">Character</Typography>
          </MenuItem>,
        ]}

        {/* HELP MENU */}
        {activeMenu === 'help' && [
          <MenuItem
            key="palette"
            onClick={() => {
              handleMenuClose();
              setCommandPaletteOpen(true);
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Command Palette...</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>Ctrl+K</Typography>
          </MenuItem>,
          <MenuItem
            key="shortcuts"
            onClick={() => {
              handleMenuClose();
              openDialog('shortcuts');
            }}
          >
            <Typography variant="inherit" sx={{ flex: 1 }}>Keyboard Shortcuts</Typography>
            <Typography variant="caption" sx={{ color: editorTokens.text.muted }}>?</Typography>
          </MenuItem>,
          <Divider key="d6" sx={{ my: 0.5 }} />,
          <MenuItem
            key="about"
            onClick={() => {
              handleMenuClose();
              alert('PixelForge v1.0.0 — Professional Desktop Web Image Editor\nCrafted with Next.js, TypeScript, MUI, Zustand, and Konva.');
            }}
          >
            <Typography variant="inherit">About PixelForge</Typography>
          </MenuItem>,
        ]}
      </Menu>
    </div>
  );
};
