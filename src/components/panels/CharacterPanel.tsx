'use client';

import React from 'react';
import { useToolStore } from '@/store/toolStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { TextLayer } from '@/types/layer';
import { UpdateLayerPropertiesCommand } from '@/editor/commands/LayerCommands';
import { editorTokens } from '@/theme/palette';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

export const CharacterPanel: React.FC = () => {
  const { options, updateToolOptions } = useToolStore();
  const { layers, activeLayerId, updateLayer } = useLayerStore();
  const { executeCommand } = useHistoryStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const isTextLayer = activeLayer && activeLayer.type === 'TEXT';
  const textData = isTextLayer ? (activeLayer as TextLayer) : null;

  const handleUpdate = (patch: Partial<TextLayer>) => {
    if (textData) {
      const prevProps = { ...textData };
      const nextProps = { ...textData, ...patch };
      const cmd = new UpdateLayerPropertiesCommand(textData.id, prevProps, nextProps, 'Format Text');
      executeCommand(cmd);
    } else {
      updateToolOptions('text', patch as any);
    }
  };

  const fontFamily = textData?.fontFamily || options.text.fontFamily;
  const fontSize = textData?.fontSize || options.text.fontSize;
  const fontWeight = textData?.fontWeight || options.text.fontWeight;
  const fontStyle = textData?.fontStyle || options.text.fontStyle;
  const align = textData?.align || options.text.align;
  const lineHeight = textData?.lineHeight || options.text.lineHeight;
  const letterSpacing = textData?.letterSpacing || options.text.letterSpacing;
  const fill = textData?.fill || options.text.color;

  const labelSx = {
    fontSize: '0.68rem',
    color: editorTokens.text.secondary,
    width: 65,
  };

  const inputNumberSx = {
    width: 55,
    height: 22,
    backgroundColor: editorTokens.bg.input,
    border: `1px solid ${editorTokens.border.subtle}`,
    color: editorTokens.text.primary,
    fontSize: '0.72rem',
    padding: '1px 6px',
    borderRadius: 2,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: editorTokens.bg.panel,
        padding: '12px 10px',
        fontSize: '0.72rem',
        userSelect: 'none',
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: '0.68rem', color: editorTokens.text.secondary, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
        Character & Typography
      </div>

      {/* Font Family */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...labelSx, width: '100%', marginBottom: 4 }}>Font Family:</div>
        <Select
          value={fontFamily}
          onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
          fullWidth
          sx={{ height: 24, fontSize: '0.72rem' }}
        >
          <MenuItem value="Inter, system-ui, sans-serif">Inter</MenuItem>
          <MenuItem value="Arial, sans-serif">Arial</MenuItem>
          <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
          <MenuItem value="'Courier New', monospace">Courier New</MenuItem>
          <MenuItem value="Georgia, serif">Georgia</MenuItem>
          <MenuItem value="'Segoe UI', sans-serif">Segoe UI</MenuItem>
          <MenuItem value="Impact, sans-serif">Impact</MenuItem>
        </Select>
      </div>

      {/* Font Size & Line Height */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ ...labelSx, marginBottom: 4 }}>Size:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => handleUpdate({ fontSize: Math.max(6, parseInt(e.target.value) || 12) })}
              style={{ ...inputNumberSx, width: '100%' }}
            />
            <span>px</span>
          </div>
        </div>
        <div>
          <div style={{ ...labelSx, marginBottom: 4 }}>Leading:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              step={0.1}
              value={lineHeight}
              onChange={(e) => handleUpdate({ lineHeight: parseFloat(e.target.value) || 1.2 })}
              style={{ ...inputNumberSx, width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Letter Spacing */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={labelSx}>Tracking:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            value={letterSpacing}
            onChange={(e) => handleUpdate({ letterSpacing: parseInt(e.target.value) || 0 })}
            style={inputNumberSx}
          />
          <span>px</span>
        </div>
      </div>

      {/* Style Toggles (Bold, Italic, Underline) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => handleUpdate({ fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' })}
          style={{
            flex: 1,
            height: 24,
            backgroundColor: fontWeight === 'bold' ? editorTokens.accent.primary : editorTokens.bg.surface,
            color: fontWeight === 'bold' ? '#fff' : editorTokens.text.primary,
            border: `1px solid ${editorTokens.border.subtle}`,
            borderRadius: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Bold"
        >
          <Bold size={13} />
        </button>

        <button
          type="button"
          onClick={() => handleUpdate({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' })}
          style={{
            flex: 1,
            height: 24,
            backgroundColor: fontStyle === 'italic' ? editorTokens.accent.primary : editorTokens.bg.surface,
            color: fontStyle === 'italic' ? '#fff' : editorTokens.text.primary,
            border: `1px solid ${editorTokens.border.subtle}`,
            borderRadius: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Italic"
        >
          <Italic size={13} />
        </button>
      </div>

      {/* Alignment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => handleUpdate({ align: a })}
            style={{
              flex: 1,
              height: 24,
              backgroundColor: align === a ? editorTokens.accent.primary : editorTokens.bg.surface,
              color: align === a ? '#fff' : editorTokens.text.primary,
              border: `1px solid ${editorTokens.border.subtle}`,
              borderRadius: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {a === 'left' && <AlignLeft size={13} />}
            {a === 'center' && <AlignCenter size={13} />}
            {a === 'right' && <AlignRight size={13} />}
          </button>
        ))}
      </div>

      {/* Color Swatch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={labelSx}>Color:</span>
        <div
          style={{
            width: 32,
            height: 22,
            backgroundColor: fill,
            border: '1px solid #ffffff',
            borderRadius: 2,
            cursor: 'pointer',
          }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = fill;
            input.onchange = (e) => handleUpdate({ fill: (e.target as HTMLInputElement).value });
            input.click();
          }}
        />
      </div>
    </div>
  );
};
