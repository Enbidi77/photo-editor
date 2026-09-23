'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import {
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit3,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Sliders,
  Layers as LayersIcon,
  CircleDot,
  Type,
  Square,
  Image as ImageIcon,
  Move,
  Check,
  ChevronRight,
  Plus,
  Paintbrush,
  Clipboard,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  SquareDashed,
  BoxSelect,
  Sparkles,
  Unlink,
  Link as LinkIcon,
} from 'lucide-react';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSelectionStore } from '@/store/selectionStore';
import { useViewStore } from '@/store/viewStore';
import { useToolStore } from '@/store/toolStore';
import { useUIStore } from '@/store/uiStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import {
  AddLayerCommand,
  DeleteLayerCommand,
  DuplicateLayerCommand,
  ToggleVisibilityCommand,
  ToggleLockCommand,
  RenameLayerCommand,
  ReorderLayerCommand,
  ChangeOpacityCommand,
  ChangeBlendModeCommand,
  UpdateLayerPropertiesCommand,
} from '@/editor/commands/LayerCommands';
import {
  AddMaskCommand,
  RemoveMaskCommand,
  ToggleMaskEnabledCommand,
  ToggleMaskLinkedCommand,
  ApplyMaskCommand,
} from '@/editor/commands/MaskCommands';
import { ImageLoader } from '@/lib/image/imageLoader';
import { editorTokens } from '@/theme/palette';
import { Layer, BlendMode, ShapeLayer, PaintLayer, ImageLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';
import { nanoid } from 'nanoid';
import { ContextMenuState } from '@/hooks/useEditorContextMenu';

export const BLEND_MODES: { label: string; value: BlendMode }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Screen', value: 'screen' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Darken', value: 'darken' },
  { label: 'Lighten', value: 'lighten' },
  { label: 'Color Dodge', value: 'color-dodge' },
  { label: 'Color Burn', value: 'color-burn' },
  { label: 'Hard Light', value: 'hard-light' },
  { label: 'Soft Light', value: 'soft-light' },
  { label: 'Difference', value: 'difference' },
  { label: 'Exclusion', value: 'exclusion' },
  { label: 'Hue', value: 'hue' },
  { label: 'Saturation', value: 'saturation' },
  { label: 'Color', value: 'color' },
  { label: 'Luminosity', value: 'luminosity' },
];

export const OPACITY_PRESETS = [
  { label: '100%', value: 1.0 },
  { label: '75%', value: 0.75 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 },
  { label: '0%', value: 0.0 },
];

/**
 * Pure evaluation function for context-menu action availability.
 * Exported for comprehensive unit testing.
 */
export function getActionAvailability(
  action: string,
  layer: Layer | null,
  isViewer: boolean,
  extra: {
    isAtTop?: boolean;
    isAtBottom?: boolean;
    hasSelection?: boolean;
    canPaste?: boolean;
  } = {}
): { enabled: boolean; reason?: string } {
  if (isViewer) {
    // Non-mutating read-only actions are permitted in viewer mode
    const viewerAllowedActions = [
      'deselect',
      'select-all',
      'invert-selection',
      'zoom-in',
      'zoom-out',
      'fit-canvas',
      'reset-zoom',
      'edit-text-properties',
      'edit-shape-properties',
    ];
    if (!viewerAllowedActions.includes(action)) {
      return { enabled: false, reason: 'View-only mode: modifications restricted' };
    }
  }

  // Destructive / editing actions for locked layers
  const lockedRestrictedActions = [
    'rename',
    'delete',
    'reorder-forward',
    'reorder-backward',
    'reorder-front',
    'reorder-back',
    'opacity',
    'blend-mode',
    'add-mask',
    'toggle-mask-enabled',
    'toggle-mask-linked',
    'apply-mask',
    'delete-mask',
    'replace-image',
    'free-transform',
  ];

  if (layer && layer.locked && lockedRestrictedActions.includes(action)) {
    return { enabled: false, reason: 'Layer is locked. Unlock to modify.' };
  }

  // Layer ordering boundary checks
  if (action === 'reorder-forward' || action === 'reorder-front') {
    if (extra.isAtTop) {
      return { enabled: false, reason: 'Layer is already at the top of the stack' };
    }
  }

  if (action === 'reorder-backward' || action === 'reorder-back') {
    if (extra.isAtBottom) {
      return { enabled: false, reason: 'Layer is already at the bottom of the stack' };
    }
  }

  // Selection actions
  if (action === 'deselect' || action === 'invert-selection' || action === 'feather-selection') {
    if (!extra.hasSelection) {
      return { enabled: false, reason: 'No active selection' };
    }
  }

  // Paste action
  if (action === 'paste') {
    if (!extra.canPaste) {
      return { enabled: false, reason: 'Clipboard access unavailable or empty' };
    }
  }

  return { enabled: true };
}

interface EditorContextMenuProps {
  contextMenu: ContextMenuState | null;
  onClose: () => void;
  onStartRename?: (layerId: string) => void;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  contextMenu,
  onClose,
  onStartRename,
}) => {
  const { layers, activeLayerId, editingMaskLayerId, setEditingMask, selectLayer } = useLayerStore();
  const { executeCommand } = useHistoryStore();
  const { document: doc } = useDocumentStore();
  const { selection, clearSelection, selectAll, invertSelection, feather, setFeather } = useSelectionStore();
  const { zoomIn, zoomOut, resetZoom, fitToViewport } = useViewStore();
  const { setActiveTool } = useToolStore();
  const { setActivePanel, showToast } = useUIStore();
  const { userRole } = useCollaborationStore();

  const isViewer = userRole === 'viewer';

  // Submenu state
  const [submenu, setSubmenu] = useState<{
    type: 'opacity' | 'blendMode';
    anchorEl: HTMLElement;
  } | null>(null);

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [featherDialogOpen, setFeatherDialogOpen] = useState(false);
  const [featherInput, setFeatherInput] = useState(feather.toString());

  // Hidden image file input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clipboard paste capability check
  const [canPaste, setCanPaste] = useState(false);
  useEffect(() => {
    if (typeof navigator !== 'undefined' && Boolean(navigator?.clipboard?.read)) {
      setCanPaste(true);
    }
  }, []);

  const handleSubmenuClose = useCallback(() => {
    setSubmenu(null);
  }, []);

  const handleCloseAll = useCallback(() => {
    handleSubmenuClose();
    onClose();
  }, [handleSubmenuClose, onClose]);

  // Target layer resolution
  const target = contextMenu?.target;
  const isLayerTarget = target?.type === 'layer';
  const targetLayerId = isLayerTarget ? target.layerId : null;
  const targetLayer = layers.find((l) => l.id === targetLayerId) || null;

  const targetIndex = targetLayer ? layers.findIndex((l) => l.id === targetLayer.id) : -1;
  const isAtTop = targetIndex === 0;
  const isAtBottom = targetIndex !== -1 && targetIndex === layers.length - 1;
  const hasSelection = selection !== null;

  // Layer Action Handlers
  const handleRename = () => {
    handleCloseAll();
    if (!targetLayer) return;
    if (target?.type === 'layer' && target.source === 'layers-panel' && onStartRename) {
      onStartRename(targetLayer.id);
    } else {
      setRenameInput(targetLayer.name);
      setRenameDialogOpen(true);
    }
  };

  const handleCommitRenameDialog = () => {
    if (targetLayer && renameInput.trim() && renameInput.trim() !== targetLayer.name) {
      const cmd = new RenameLayerCommand(targetLayer.id, targetLayer.name, renameInput.trim());
      executeCommand(cmd);
    }
    setRenameDialogOpen(false);
  };

  const handleDuplicate = () => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new DuplicateLayerCommand(targetLayer.id);
    executeCommand(cmd);
  };

  const handleDelete = () => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new DeleteLayerCommand(targetLayer);
    executeCommand(cmd);
  };

  const handleToggleVisibility = () => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new ToggleVisibilityCommand(targetLayer.id, targetLayer.visible);
    executeCommand(cmd);
  };

  const handleToggleLock = () => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new ToggleLockCommand(targetLayer.id, targetLayer.locked);
    executeCommand(cmd);
  };

  const handleReorder = (direction: 'forward' | 'backward' | 'front' | 'back') => {
    handleCloseAll();
    if (!targetLayer || targetIndex === -1) return;

    let endIndex = targetIndex;
    if (direction === 'forward' && targetIndex > 0) endIndex = targetIndex - 1;
    if (direction === 'backward' && targetIndex < layers.length - 1) endIndex = targetIndex + 1;
    if (direction === 'front') endIndex = 0;
    if (direction === 'back') endIndex = layers.length - 1;

    if (endIndex !== targetIndex) {
      const cmd = new ReorderLayerCommand(targetIndex, endIndex);
      executeCommand(cmd);
    }
  };

  const handleSetOpacity = (val: number) => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new ChangeOpacityCommand(targetLayer.id, targetLayer.opacity, val);
    executeCommand(cmd);
  };

  const handleSetBlendMode = (mode: BlendMode) => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new ChangeBlendModeCommand(targetLayer.id, targetLayer.blendMode, mode);
    executeCommand(cmd);
  };

  // Mask Action Handlers
  const handleAddMask = () => {
    handleCloseAll();
    if (!targetLayer || !doc) return;
    const cmd = new AddMaskCommand(targetLayer.id, doc.width, doc.height);
    executeCommand(cmd);
  };

  const handleEditMask = () => {
    handleCloseAll();
    if (!targetLayer) return;
    setEditingMask(editingMaskLayerId === targetLayer.id ? null : targetLayer.id);
  };

  const handleToggleMaskEnabled = () => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new ToggleMaskEnabledCommand(targetLayer.id);
    executeCommand(cmd);
  };

  const handleToggleMaskLinked = () => {
    handleCloseAll();
    if (!targetLayer) return;
    const cmd = new ToggleMaskLinkedCommand(targetLayer.id);
    executeCommand(cmd);
  };

  const handleApplyMask = () => {
    handleCloseAll();
    if (!targetLayer || !targetLayer.mask) return;
    const cmd = new ApplyMaskCommand(targetLayer.id, targetLayer.mask);
    executeCommand(cmd);
  };

  const handleDeleteMask = () => {
    handleCloseAll();
    if (!targetLayer || !targetLayer.mask) return;
    const cmd = new RemoveMaskCommand(targetLayer.id, targetLayer.mask);
    executeCommand(cmd);
  };

  // Type-Aware Action Handlers
  const handleEditTextProperties = () => {
    handleCloseAll();
    setActivePanel('character');
    setActiveTool('text');
  };

  const handleEditShapeProperties = () => {
    handleCloseAll();
    setActivePanel('properties');
  };

  const handleReplaceImageClick = () => {
    handleCloseAll();
    fileInputRef.current?.click();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetLayer || targetLayer.type !== 'IMAGE') return;

    try {
      const imgInfo = await ImageLoader.loadFromFile(file);
      const prevImageLayer = targetLayer as ImageLayer;
      const cmd = new UpdateLayerPropertiesCommand(
        targetLayer.id,
        {
          imageUrl: prevImageLayer.imageUrl,
          width: prevImageLayer.width,
          height: prevImageLayer.height,
          naturalWidth: prevImageLayer.naturalWidth,
          naturalHeight: prevImageLayer.naturalHeight,
        },
        {
          imageUrl: imgInfo.dataUrl,
          width: imgInfo.width,
          height: imgInfo.height,
          naturalWidth: imgInfo.width,
          naturalHeight: imgInfo.height,
        },
        'Replace Image'
      );
      executeCommand(cmd);
      showToast('Image replaced successfully', 'success');
    } catch {
      showToast('Failed to load image', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFreeTransform = () => {
    handleCloseAll();
    setActiveTool('move');
  };

  // Canvas Action Handlers
  const handleDeselect = () => {
    handleCloseAll();
    clearSelection();
  };

  const handleSelectAll = () => {
    handleCloseAll();
    if (doc) selectAll(doc.width, doc.height);
  };

  const handleInvertSelection = () => {
    handleCloseAll();
    if (doc) invertSelection(doc.width, doc.height);
  };

  const handleOpenFeatherDialog = () => {
    handleCloseAll();
    setFeatherInput(feather.toString());
    setFeatherDialogOpen(true);
  };

  const handleCommitFeather = () => {
    const parsed = parseInt(featherInput, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setFeather(Math.min(250, parsed));
    }
    setFeatherDialogOpen(false);
  };

  const handleNewShapeLayer = () => {
    handleCloseAll();
    const clickCoords = target?.type === 'canvas' ? target.coords : undefined;
    const posX = clickCoords?.x ?? Math.round(((doc?.width || 800) - 200) / 2);
    const posY = clickCoords?.y ?? Math.round(((doc?.height || 600) - 150) / 2);

    const newShape: ShapeLayer = {
      id: nanoid(),
      type: 'SHAPE',
      name: `Shape ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: posX,
      y: posY,
      width: 200,
      height: 150,
      rotation: 0,
      zIndex: layers.length,
      parentId: null,
      shapeKind: 'rect',
      fill: '#0078d4',
      stroke: '#ffffff',
      strokeWidth: 0,
      cornerRadius: 4,
    };
    const cmd = new AddLayerCommand(newShape, 0);
    executeCommand(cmd);
    selectLayer(newShape.id);
  };

  const handleNewPaintLayer = () => {
    handleCloseAll();
    const newPaint: PaintLayer = {
      id: nanoid(),
      type: 'PAINT',
      name: `Paint ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 0,
      y: 0,
      width: doc?.width || 800,
      height: doc?.height || 600,
      rotation: 0,
      zIndex: layers.length,
      parentId: null,
      paths: [],
      dataUrl: '',
    };
    const cmd = new AddLayerCommand(newPaint, 0);
    executeCommand(cmd);
    selectLayer(newPaint.id);
  };

  const handlePaste = async () => {
    handleCloseAll();
    if (!doc) return;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'pasted-image.png', { type: imageType });
          const imgInfo = await ImageLoader.loadFromFile(file);

          let targetW = imgInfo.width;
          let targetH = imgInfo.height;
          const maxW = doc.width * 0.85;
          const maxH = doc.height * 0.85;

          if (targetW > maxW || targetH > maxH) {
            const scale = Math.min(maxW / targetW, maxH / targetH);
            targetW = Math.round(targetW * scale);
            targetH = Math.round(targetH * scale);
          }

          const posX = Math.round((doc.width - targetW) / 2);
          const posY = Math.round((doc.height - targetH) / 2);

          const newImageLayer: ImageLayer = {
            id: nanoid(),
            type: 'IMAGE',
            name: `Pasted Image ${layers.length + 1}`,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            x: posX,
            y: posY,
            width: targetW,
            height: targetH,
            rotation: 0,
            zIndex: layers.length,
            parentId: null,
            imageUrl: imgInfo.dataUrl,
            naturalWidth: imgInfo.width,
            naturalHeight: imgInfo.height,
            adjustments: { ...DEFAULT_ADJUSTMENTS },
          };

          const cmd = new AddLayerCommand(newImageLayer, 0);
          executeCommand(cmd);
          selectLayer(newImageLayer.id);
          showToast('Pasted image layer', 'success');
          return;
        }
      }
      showToast('No image data found on clipboard', 'warning');
    } catch {
      showToast('Unable to read clipboard image', 'warning');
    }
  };

  const handleZoomIn = () => {
    handleCloseAll();
    zoomIn();
  };

  const handleZoomOut = () => {
    handleCloseAll();
    zoomOut();
  };

  const handleFitCanvas = () => {
    handleCloseAll();
    if (doc) {
      fitToViewport(window.innerWidth - 320, window.innerHeight - 150, doc.width, doc.height);
    }
  };

  const handleResetZoom = () => {
    handleCloseAll();
    resetZoom();
  };

  // Helper for menu item with tooltip
  const renderItem = (
    key: string,
    actionKey: string,
    label: string,
    icon: React.ReactNode,
    onClick: (e: React.MouseEvent<HTMLLIElement>) => void,
    hasSubmenu = false,
    danger = false
  ) => {
    const { enabled, reason } = getActionAvailability(actionKey, targetLayer, isViewer, {
      isAtTop,
      isAtBottom,
      hasSelection,
      canPaste,
    });

    const item = (
      <MenuItem
        key={key}
        disabled={!enabled}
        onClick={enabled ? onClick : undefined}
        onMouseEnter={(e) => {
          if (hasSubmenu && enabled) {
            setSubmenu({
              type: actionKey as 'opacity' | 'blendMode',
              anchorEl: e.currentTarget,
            });
          } else if (!hasSubmenu) {
            handleSubmenuClose();
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: danger ? editorTokens.accent.danger : editorTokens.text.primary,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', width: 14 }}>{icon}</span>
          <span>{label}</span>
        </div>
        {hasSubmenu && <ChevronRight size={13} style={{ color: editorTokens.text.muted }} />}
      </MenuItem>
    );

    if (!enabled && reason) {
      return (
        <Tooltip key={key} title={reason} placement="right" arrow>
          <span>{item}</span>
        </Tooltip>
      );
    }

    return item;
  };

  const menuOpen = contextMenu !== null;

  return (
    <>
      {/* Hidden file input for Replace Image action */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />

      {/* Main Context Menu */}
      <Menu
        open={menuOpen}
        onClose={handleCloseAll}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
        marginThreshold={12}
        slotProps={{
          paper: {
            'aria-label': 'Editor context menu',
            role: 'menu',
            sx: {
              backgroundColor: editorTokens.bg.surface,
              color: editorTokens.text.primary,
              border: `1px solid ${editorTokens.border.medium}`,
              boxShadow: editorTokens.shadow.menu,
              borderRadius: '6px',
              minWidth: 190,
              py: 0.5,
              '& .MuiMenuItem-root': {
                fontSize: '0.73rem',
                py: 0.6,
                px: 1.5,
                color: editorTokens.text.primary,
                transition: 'background-color 0.12s ease',
                '&:hover': {
                  backgroundColor: editorTokens.bg.hoverRow,
                },
                '&.Mui-disabled': {
                  color: editorTokens.text.muted,
                  opacity: 0.55,
                },
              },
              '& .MuiDivider-root': {
                borderColor: editorTokens.border.subtle,
                my: 0.5,
              },
            },
          },
        }}
      >
        {isLayerTarget && targetLayer && [
          // 1. Layer Identity Actions
          renderItem('layer-rename', 'rename', 'Rename Layer', <Edit3 size={13} />, handleRename),
          renderItem('layer-duplicate', 'duplicate', 'Duplicate Layer', <Copy size={13} />, handleDuplicate),
          renderItem(
            'layer-delete',
            'delete',
            'Delete Layer',
            <Trash2 size={13} />,
            handleDelete,
            false,
            true
          ),

          <Divider key="div-visibility" />,

          // 2. Visibility & Lock
          renderItem(
            'layer-visibility',
            'visibility',
            targetLayer.visible ? 'Hide Layer' : 'Show Layer',
            targetLayer.visible ? <EyeOff size={13} /> : <Eye size={13} />,
            handleToggleVisibility
          ),
          renderItem(
            'layer-lock',
            'lock',
            targetLayer.locked ? 'Unlock Layer' : 'Lock Layer',
            targetLayer.locked ? <Unlock size={13} /> : <Lock size={13} />,
            handleToggleLock
          ),

          <Divider key="div-ordering" />,

          // 3. Layer Ordering
          renderItem(
            'layer-forward',
            'reorder-forward',
            'Bring Forward',
            <ArrowUp size={13} />,
            () => handleReorder('forward')
          ),
          renderItem(
            'layer-backward',
            'reorder-backward',
            'Send Backward',
            <ArrowDown size={13} />,
            () => handleReorder('backward')
          ),
          renderItem(
            'layer-front',
            'reorder-front',
            'Bring to Front',
            <ChevronsUp size={13} />,
            () => handleReorder('front')
          ),
          renderItem(
            'layer-back',
            'reorder-back',
            'Send to Back',
            <ChevronsDown size={13} />,
            () => handleReorder('back')
          ),

          <Divider key="div-appearance" />,

          // 4. Opacity & Blend Mode Submenus
          renderItem(
            'layer-opacity',
            'opacity',
            `Opacity (${Math.round(targetLayer.opacity * 100)}%)`,
            <Sliders size={13} />,
            (e) => setSubmenu({ type: 'opacity', anchorEl: e.currentTarget }),
            true
          ),
          renderItem(
            'layer-blend',
            'blend-mode',
            `Blend: ${BLEND_MODES.find((m) => m.value === targetLayer.blendMode)?.label || 'Normal'}`,
            <LayersIcon size={13} />,
            (e) => setSubmenu({ type: 'blendMode', anchorEl: e.currentTarget }),
            true
          ),

          <Divider key="div-mask" />,

          // 5. Layer Mask System
          !targetLayer.mask &&
            renderItem('mask-add', 'add-mask', 'Add Layer Mask', <CircleDot size={13} />, handleAddMask),

          targetLayer.mask && [
            renderItem(
              'mask-edit',
              'edit-mask',
              editingMaskLayerId === targetLayer.id ? 'Exit Mask Editing' : 'Edit Mask',
              <CircleDot size={13} color={editingMaskLayerId === targetLayer.id ? '#ff00ff' : undefined} />,
              handleEditMask
            ),
            renderItem(
              'mask-toggle',
              'toggle-mask-enabled',
              targetLayer.mask.enabled ? 'Disable Layer Mask' : 'Enable Layer Mask',
              <Eye size={13} />,
              handleToggleMaskEnabled
            ),
            renderItem(
              'mask-link',
              'toggle-mask-linked',
              targetLayer.mask.linked ? 'Unlink Layer Mask' : 'Link Layer Mask',
              targetLayer.mask.linked ? <Unlink size={13} /> : <LinkIcon size={13} />,
              handleToggleMaskLinked
            ),
            renderItem(
              'mask-apply',
              'apply-mask',
              'Apply Layer Mask',
              <Check size={13} />,
              handleApplyMask
            ),
            renderItem(
              'mask-del',
              'delete-mask',
              'Delete Layer Mask',
              <Trash2 size={13} />,
              handleDeleteMask,
              false,
              true
            ),
          ],

          // 6. Type-Aware Actions
          (targetLayer.type === 'TEXT' || targetLayer.type === 'SHAPE' || targetLayer.type === 'IMAGE') && (
            <Divider key="div-type" />
          ),

          targetLayer.type === 'TEXT' &&
            renderItem(
              'text-props',
              'edit-text-properties',
              'Edit Text / Typography',
              <Type size={13} />,
              handleEditTextProperties
            ),

          targetLayer.type === 'SHAPE' &&
            renderItem(
              'shape-props',
              'edit-shape-properties',
              'Edit Shape Properties',
              <Square size={13} />,
              handleEditShapeProperties
            ),

          targetLayer.type === 'IMAGE' &&
            renderItem(
              'image-replace',
              'replace-image',
              'Replace Image...',
              <ImageIcon size={13} />,
              handleReplaceImageClick
            ),

          // 7. Canvas object specific: Free Transform
          target?.type === 'layer' && target.source === 'canvas' && [
            <Divider key="div-canvas-layer" />,
            renderItem(
              'layer-transform',
              'free-transform',
              'Free Transform',
              <Move size={13} />,
              handleFreeTransform
            ),
          ],
        ]}

        {/* Empty Canvas Context Menu */}
        {!isLayerTarget && [
          // 1. Selection Actions
          hasSelection && [
            renderItem('canvas-deselect', 'deselect', 'Deselect', <SquareDashed size={13} />, handleDeselect),
            renderItem('canvas-select-all', 'select-all', 'Select All', <BoxSelect size={13} />, handleSelectAll),
            renderItem(
              'canvas-invert-sel',
              'invert-selection',
              'Invert Selection',
              <Sparkles size={13} />,
              handleInvertSelection
            ),
            renderItem(
              'canvas-feather',
              'feather-selection',
              `Feather Selection (${feather}px)...`,
              <Sliders size={13} />,
              handleOpenFeatherDialog
            ),
            <Divider key="div-canvas-ops" />,
          ],

          !hasSelection && [
            renderItem('canvas-select-all-solo', 'select-all', 'Select All', <BoxSelect size={13} />, handleSelectAll),
            <Divider key="div-canvas-solo" />,
          ],

          // 2. Canvas Creation Actions
          renderItem(
            'canvas-new-shape',
            'new-shape-layer',
            'New Shape Layer',
            <Plus size={13} />,
            handleNewShapeLayer
          ),
          renderItem(
            'canvas-new-paint',
            'new-paint-layer',
            'New Paint Layer',
            <Paintbrush size={13} />,
            handleNewPaintLayer
          ),
          renderItem(
            'canvas-paste',
            'paste',
            'Paste from Clipboard',
            <Clipboard size={13} />,
            handlePaste
          ),

          <Divider key="div-canvas-zoom" />,

          // 3. View & Zoom Controls
          renderItem('canvas-zoom-in', 'zoom-in', 'Zoom In', <ZoomIn size={13} />, handleZoomIn),
          renderItem('canvas-zoom-out', 'zoom-out', 'Zoom Out', <ZoomOut size={13} />, handleZoomOut),
          renderItem('canvas-fit', 'fit-canvas', 'Fit Canvas to View', <Maximize size={13} />, handleFitCanvas),
          renderItem('canvas-reset-zoom', 'reset-zoom', 'Reset Zoom (100%)', <RotateCcw size={13} />, handleResetZoom),
        ]}
      </Menu>

      {/* Submenu: Opacity Presets */}
      <Menu
        open={submenu?.type === 'opacity'}
        anchorEl={submenu?.anchorEl}
        onClose={handleSubmenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            'aria-label': 'Opacity presets menu',
            role: 'menu',
            sx: {
              backgroundColor: editorTokens.bg.surface,
              color: editorTokens.text.primary,
              border: `1px solid ${editorTokens.border.medium}`,
              boxShadow: editorTokens.shadow.menu,
              borderRadius: '6px',
              minWidth: 120,
              py: 0.5,
              '& .MuiMenuItem-root': {
                fontSize: '0.73rem',
                py: 0.5,
                px: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: editorTokens.text.primary,
                '&:hover': {
                  backgroundColor: editorTokens.bg.hoverRow,
                },
              },
            },
          },
        }}
      >
        {OPACITY_PRESETS.map((preset) => {
          const isCurrent = targetLayer ? Math.abs(targetLayer.opacity - preset.value) < 0.05 : false;
          return (
            <MenuItem
              key={`preset-${preset.value}`}
              onClick={() => handleSetOpacity(preset.value)}
            >
              <span>{preset.label}</span>
              {isCurrent && <Check size={12} style={{ color: editorTokens.accent.primary }} />}
            </MenuItem>
          );
        })}
      </Menu>

      {/* Submenu: Blend Modes */}
      <Menu
        open={submenu?.type === 'blendMode'}
        anchorEl={submenu?.anchorEl}
        onClose={handleSubmenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            'aria-label': 'Blend modes menu',
            role: 'menu',
            sx: {
              backgroundColor: editorTokens.bg.surface,
              color: editorTokens.text.primary,
              border: `1px solid ${editorTokens.border.medium}`,
              boxShadow: editorTokens.shadow.menu,
              borderRadius: '6px',
              minWidth: 140,
              maxHeight: 320,
              py: 0.5,
              '& .MuiMenuItem-root': {
                fontSize: '0.73rem',
                py: 0.45,
                px: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: editorTokens.text.primary,
                '&:hover': {
                  backgroundColor: editorTokens.bg.hoverRow,
                },
              },
            },
          },
        }}
      >
        {BLEND_MODES.map((mode) => {
          const isCurrent = targetLayer?.blendMode === mode.value;
          return (
            <MenuItem
              key={`blend-${mode.value}`}
              onClick={() => handleSetBlendMode(mode.value)}
            >
              <span>{mode.label}</span>
              {isCurrent && <Check size={12} style={{ color: editorTokens.accent.primary }} />}
            </MenuItem>
          );
        })}
      </Menu>

      {/* Rename Dialog (canvas trigger fallback) */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: editorTokens.bg.panel,
              color: editorTokens.text.primary,
              border: `1px solid ${editorTokens.border.medium}`,
              borderRadius: '6px',
              minWidth: 300,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '0.85rem', fontWeight: 600, pb: 1 }}>
          Rename Layer
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitRenameDialog();
              if (e.key === 'Escape') setRenameDialogOpen(false);
            }}
            sx={{
              mt: 1,
              '& .MuiInputBase-input': {
                fontSize: '0.78rem',
                color: editorTokens.text.primary,
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: editorTokens.bg.input,
                '& fieldset': { borderColor: editorTokens.border.subtle },
                '&:hover fieldset': { borderColor: editorTokens.border.medium },
                '&.Mui-focused fieldset': { borderColor: editorTokens.border.focus },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            size="small"
            onClick={() => setRenameDialogOpen(false)}
            sx={{ fontSize: '0.72rem', color: editorTokens.text.secondary }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleCommitRenameDialog}
            sx={{
              fontSize: '0.72rem',
              backgroundColor: editorTokens.accent.primary,
              '&:hover': { backgroundColor: editorTokens.accent.primaryHover },
            }}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feather Selection Dialog */}
      <Dialog
        open={featherDialogOpen}
        onClose={() => setFeatherDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: editorTokens.bg.panel,
              color: editorTokens.text.primary,
              border: `1px solid ${editorTokens.border.medium}`,
              borderRadius: '6px',
              minWidth: 280,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '0.85rem', fontWeight: 600, pb: 1 }}>
          Feather Selection
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            type="number"
            label="Feather Radius (px)"
            value={featherInput}
            onChange={(e) => setFeatherInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitFeather();
              if (e.key === 'Escape') setFeatherDialogOpen(false);
            }}
            slotProps={{
              htmlInput: { min: 0, max: 250 },
              inputLabel: { sx: { fontSize: '0.75rem', color: editorTokens.text.secondary } },
            }}
            sx={{
              mt: 1.5,
              '& .MuiInputBase-input': {
                fontSize: '0.78rem',
                color: editorTokens.text.primary,
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: editorTokens.bg.input,
                '& fieldset': { borderColor: editorTokens.border.subtle },
                '&:hover fieldset': { borderColor: editorTokens.border.medium },
                '&.Mui-focused fieldset': { borderColor: editorTokens.border.focus },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            size="small"
            onClick={() => setFeatherDialogOpen(false)}
            sx={{ fontSize: '0.72rem', color: editorTokens.text.secondary }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleCommitFeather}
            sx={{
              fontSize: '0.72rem',
              backgroundColor: editorTokens.accent.primary,
              '&:hover': { backgroundColor: editorTokens.accent.primaryHover },
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
