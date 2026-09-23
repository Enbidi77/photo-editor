'use client';

import React, { useState, useRef } from 'react';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useDocumentStore } from '@/store/documentStore';
import { Layer, BlendMode, ImageLayer, TextLayer, ShapeLayer } from '@/types/layer';
import {
  AddMaskCommand,
  RemoveMaskCommand,
  ToggleMaskEnabledCommand,
  ApplyMaskCommand,
} from '@/editor/commands/MaskCommands';
import {
  AddLayerCommand,
  DeleteLayerCommand,
  ChangeOpacityCommand,
  ChangeBlendModeCommand,
  RenameLayerCommand,
  ToggleVisibilityCommand,
  ToggleLockCommand,
  ReorderLayerCommand,
  DuplicateLayerCommand,
} from '@/editor/commands/LayerCommands';
import { editorTokens } from '@/theme/palette';
import { EditorContextMenu } from '@/components/common/EditorContextMenu';
import { useEditorContextMenu } from '@/hooks/useEditorContextMenu';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Image as ImageIcon,
  Type,
  Square,
  Paintbrush,
  Layers as LayersIcon,
  Trash2,
  Copy,
  Plus,
  ChevronUp,
  ChevronDown,
  CircleDot,
  PenTool,
} from 'lucide-react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import { nanoid } from 'nanoid';

const BLEND_MODES: { label: string; value: BlendMode }[] = [
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

export const LayersPanel: React.FC = () => {
  const {
    layers,
    activeLayerId,
    selectedLayerIds,
    editingMaskLayerId,
    setEditingMask,
    selectLayer,
    toggleVisibility,
    toggleLock,
    renameLayer,
    duplicateLayer,
    bringForward,
    sendBackward,
    setLayerOpacity,
  } = useLayerStore();
  const { executeCommand } = useHistoryStore();
  const { document: doc } = useDocumentStore();

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { contextMenu, openLayerMenu, closeMenu } = useEditorContextMenu();

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const initialOpacityRef = useRef<number | null>(null);

  const handleOpacityPreview = (val: number) => {
    if (!activeLayer) return;
    if (initialOpacityRef.current === null) {
      initialOpacityRef.current = activeLayer.opacity;
    }
    setLayerOpacity(activeLayer.id, val / 100);
  };

  const handleOpacityCommitted = (val: number) => {
    if (!activeLayer) return;
    const prev = initialOpacityRef.current ?? activeLayer.opacity;
    const next = val / 100;
    initialOpacityRef.current = null;
    if (Math.abs(prev - next) > 0.001) {
      const cmd = new ChangeOpacityCommand(activeLayer.id, prev, next);
      executeCommand(cmd);
    }
  };

  const handleBlendChange = (val: BlendMode) => {
    if (!activeLayer) return;
    const prev = activeLayer.blendMode;
    const cmd = new ChangeBlendModeCommand(activeLayer.id, prev, val);
    executeCommand(cmd);
  };

  const handleCreateNewLayer = () => {
    const newLayer: ShapeLayer = {
      id: nanoid(),
      type: 'SHAPE',
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 100,
      y: 100,
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
    const cmd = new AddLayerCommand(newLayer, 0);
    executeCommand(cmd);
    selectLayer(newLayer.id);
  };

  const handleDeleteActive = () => {
    if (!activeLayer) return;
    const cmd = new DeleteLayerCommand(activeLayer);
    executeCommand(cmd);
  };

  const startRenaming = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const commitRenaming = () => {
    if (editingLayerId && editingName.trim()) {
      const layer = layers.find((l) => l.id === editingLayerId);
      if (layer && layer.name !== editingName.trim()) {
        executeCommand(new RenameLayerCommand(editingLayerId, layer.name, editingName.trim()));
      }
    }
    setEditingLayerId(null);
  };

  const getLayerIcon = (layer: Layer) => {
    switch (layer.type) {
      case 'IMAGE':
        return <ImageIcon size={13} color="#58a6ff" />;
      case 'TEXT':
        return <Type size={13} color="#3fb950" />;
      case 'SHAPE':
        return <Square size={13} color="#d29922" />;
      case 'PAINT':
        return <Paintbrush size={13} color="#bc8cff" />;
      case 'PATH':
        return <PenTool size={13} color="#f0883e" />;
      default:
        return <LayersIcon size={13} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: editorTokens.bg.panel,
        fontSize: '0.72rem',
        userSelect: 'none',
      }}
    >
      {/* Top Header: Blend Mode & Opacity */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: `1px solid ${editorTokens.border.subtle}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: editorTokens.text.secondary, minWidth: 40 }}>Blend:</span>
          <Select
            value={activeLayer?.blendMode || 'normal'}
            onChange={(e) => handleBlendChange(e.target.value as BlendMode)}
            disabled={!activeLayer}
            sx={{ flex: 1, height: 22, fontSize: '0.7rem' }}
          >
            {BLEND_MODES.map((mode) => (
              <MenuItem key={mode.value} value={mode.value} sx={{ fontSize: '0.7rem' }}>
                {mode.label}
              </MenuItem>
            ))}
          </Select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: editorTokens.text.secondary, minWidth: 40 }}>Opacity:</span>
          <Slider
            value={activeLayer ? Math.round(activeLayer.opacity * 100) : 100}
            min={0}
            max={100}
            disabled={!activeLayer}
            onChange={(_, val) => handleOpacityPreview(val as number)}
            onChangeCommitted={(_, val) => handleOpacityCommitted(val as number)}
            sx={{ flex: 1 }}
          />
          <span style={{ minWidth: 32, textAlign: 'right', fontSize: '0.7rem' }}>
            {activeLayer ? Math.round(activeLayer.opacity * 100) : 100}%
          </span>
        </div>
      </div>

      {/* Layers List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '2px 0',
        }}
      >
        {layers.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: editorTokens.text.muted,
              fontSize: '0.7rem',
            }}
          >
            No layers yet.
            <br />
            Draw, import an image, or click + below.
          </div>
        ) : (
          layers.map((layer) => {
            const isSelected = selectedLayerIds.includes(layer.id) || activeLayerId === layer.id;
            const isEditing = editingLayerId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={(e) => selectLayer(layer.id, e.shiftKey || e.ctrlKey || e.metaKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openLayerMenu(layer.id, e.clientX, e.clientY, 'layers-panel');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  gap: 8,
                  backgroundColor: isSelected ? editorTokens.bg.activeRow : 'transparent',
                  borderBottom: `1px solid ${editorTokens.border.subtle}`,
                  cursor: 'pointer',
                  borderLeft: isSelected
                    ? `3px solid ${editorTokens.accent.primary}`
                    : '3px solid transparent',
                  opacity: layer.visible ? 1 : 0.5,
                }}
              >
                {/* Visibility Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    executeCommand(new ToggleVisibilityCommand(layer.id, layer.visible));
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: layer.visible ? editorTokens.text.primary : editorTokens.text.muted,
                    display: 'flex',
                  }}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                {/* Lock Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    executeCommand(new ToggleLockCommand(layer.id, layer.locked));
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: layer.locked ? editorTokens.accent.warning : editorTokens.text.muted,
                    display: 'flex',
                  }}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                {/* Layer Type Icon */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {getLayerIcon(layer)}
                </div>

                {/* Layer Mask thumbnail/indicator */}
                {layer.mask && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      border: editingMaskLayerId === layer.id
                        ? '2px solid #ff00ff'
                        : '1px solid #666',
                      borderRadius: 2,
                      backgroundColor: '#333',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: layer.mask.enabled ? 1 : 0.4,
                      flexShrink: 0,
                    }}
                    title={editingMaskLayerId === layer.id ? 'Editing mask (click layer name to exit)' : 'Click to edit mask'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMask(editingMaskLayerId === layer.id ? null : layer.id);
                    }}
                  >
                    <CircleDot size={12} color={layer.mask.enabled ? '#ffffff' : '#666'} />
                  </div>
                )}

                {/* Layer Name / Inline Editor */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      autoFocus
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRenaming}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRenaming();
                        if (e.key === 'Escape') setEditingLayerId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        backgroundColor: editorTokens.bg.input,
                        border: `1px solid ${editorTokens.border.focus}`,
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        padding: '1px 4px',
                        borderRadius: 2,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: isSelected ? '#ffffff' : editorTokens.text.primary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                {/* Tiny opacity badge if reduced */}
                {layer.opacity < 1 && (
                  <span style={{ fontSize: '0.65rem', color: editorTokens.text.muted }}>
                    {Math.round(layer.opacity * 100)}%
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reorder & Bottom Actions Toolbar */}
      <div
        style={{
          height: 30,
          borderTop: `1px solid ${editorTokens.border.subtle}`,
          backgroundColor: editorTokens.bg.panelHeader,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
        }}
      >
        {/* Layer order arrows */}
        <div style={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Bring Forward">
            <span>
              <button
                type="button"
                disabled={!activeLayerId || layers[0]?.id === activeLayerId}
                onClick={() => {
                  if (!activeLayerId) return;
                  const idx = layers.findIndex((l) => l.id === activeLayerId);
                  if (idx > 0) {
                    executeCommand(new ReorderLayerCommand(idx, idx - 1));
                  }
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: editorTokens.text.secondary,
                  cursor: 'pointer',
                  padding: 3,
                  display: 'flex',
                }}
              >
                <ChevronUp size={14} />
              </button>
            </span>
          </Tooltip>
          <Tooltip title="Send Backward">
            <span>
              <button
                type="button"
                disabled={!activeLayerId || layers[layers.length - 1]?.id === activeLayerId}
                onClick={() => {
                  if (!activeLayerId) return;
                  const idx = layers.findIndex((l) => l.id === activeLayerId);
                  if (idx !== -1 && idx < layers.length - 1) {
                    executeCommand(new ReorderLayerCommand(idx, idx + 1));
                  }
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: editorTokens.text.secondary,
                  cursor: 'pointer',
                  padding: 3,
                  display: 'flex',
                }}
              >
                <ChevronDown size={14} />
              </button>
            </span>
          </Tooltip>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title="Duplicate Layer (Ctrl+J)">
            <span>
              <button
                type="button"
                disabled={!activeLayerId}
                onClick={() => {
                  if (activeLayerId) {
                    executeCommand(new DuplicateLayerCommand(activeLayerId));
                  }
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: editorTokens.text.secondary,
                  cursor: activeLayerId ? 'pointer' : 'default',
                  padding: 3,
                  display: 'flex',
                }}
              >
                <Copy size={13} />
              </button>
            </span>
          </Tooltip>

          <Tooltip title="Delete Selected Layer (Del)">
            <span>
              <button
                type="button"
                disabled={!activeLayer}
                onClick={handleDeleteActive}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: activeLayer ? editorTokens.accent.danger : editorTokens.text.muted,
                  cursor: activeLayer ? 'pointer' : 'default',
                  padding: 3,
                  display: 'flex',
                }}
              >
                <Trash2 size={13} />
              </button>
            </span>
          </Tooltip>

          <Tooltip title="Create New Layer">
            <button
              type="button"
              onClick={handleCreateNewLayer}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: editorTokens.text.primary,
                cursor: 'pointer',
                padding: 3,
                display: 'flex',
              }}
            >
              <Plus size={15} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Layer Context Menu */}
      <EditorContextMenu
        contextMenu={contextMenu}
        onClose={closeMenu}
        onStartRename={(layerId) => {
          const target = layers.find((l) => l.id === layerId);
          if (target) startRenaming(target);
        }}
      />
    </div>
  );
};
