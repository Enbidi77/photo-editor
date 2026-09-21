'use client';

import React from 'react';
import { useToolStore } from '@/store/toolStore';
import { DEFAULT_BRUSH_PRESETS, BrushPreset } from '@/types/tools';
import { editorTokens } from '@/theme/palette';
import Slider from '@mui/material/Slider';

export const BrushesPanel: React.FC = () => {
  const { options, updateToolOptions, foregroundColor, setActiveTool } = useToolStore();

  const handleApplyPreset = (preset: BrushPreset) => {
    updateToolOptions('brush', {
      size: preset.size,
      hardness: preset.hardness,
      opacity: preset.opacity,
      flow: preset.flow,
    });
    setActiveTool('brush');
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
      <div style={{ fontSize: '0.68rem', color: editorTokens.text.secondary, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
        Brush Presets
      </div>

      {/* Preset List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {DEFAULT_BRUSH_PRESETS.map((preset) => {
          const isSelected =
            options.brush.size === preset.size &&
            Math.abs(options.brush.hardness - preset.hardness) < 0.05;

          return (
            <div
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 8px',
                backgroundColor: isSelected ? editorTokens.bg.activeRow : editorTokens.bg.surface,
                border: `1px solid ${isSelected ? editorTokens.accent.primary : editorTokens.border.subtle}`,
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {/* Visual Tip Preview */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#111',
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    width: Math.min(20, Math.max(4, preset.size / 2)),
                    height: Math.min(20, Math.max(4, preset.size / 2)),
                    backgroundColor: foregroundColor,
                    borderRadius: '50%',
                    filter: preset.hardness < 0.5 ? `blur(${2 - preset.hardness * 2}px)` : 'none',
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: editorTokens.text.primary }}>{preset.name}</div>
                <div style={{ fontSize: '0.65rem', color: editorTokens.text.secondary }}>
                  Size: {preset.size}px &nbsp;|&nbsp; Hardness: {Math.round(preset.hardness * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Fine-Tuning Sliders */}
      <div style={{ fontSize: '0.68rem', color: editorTokens.text.secondary, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
        Settings
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Size */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: editorTokens.text.secondary }}>
            <span>Size</span>
            <span>{options.brush.size} px</span>
          </div>
          <Slider
            value={options.brush.size}
            min={1}
            max={150}
            onChange={(_, val) => updateToolOptions('brush', { size: val as number })}
          />
        </div>

        {/* Hardness */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: editorTokens.text.secondary }}>
            <span>Hardness</span>
            <span>{Math.round(options.brush.hardness * 100)}%</span>
          </div>
          <Slider
            value={Math.round(options.brush.hardness * 100)}
            min={0}
            max={100}
            onChange={(_, val) => updateToolOptions('brush', { hardness: (val as number) / 100 })}
          />
        </div>

        {/* Opacity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: editorTokens.text.secondary }}>
            <span>Opacity</span>
            <span>{Math.round(options.brush.opacity * 100)}%</span>
          </div>
          <Slider
            value={Math.round(options.brush.opacity * 100)}
            min={1}
            max={100}
            onChange={(_, val) => updateToolOptions('brush', { opacity: (val as number) / 100 })}
          />
        </div>
      </div>
    </div>
  );
};
