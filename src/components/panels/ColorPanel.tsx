'use client';

import React, { useState } from 'react';
import { useToolStore } from '@/store/toolStore';
import { editorTokens } from '@/theme/palette';
import { ArrowLeftRight, RotateCcw } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';

const PRESET_SWATCHES = [
  '#000000', '#ffffff', '#333333', '#7f7f7f', '#c3c3c3',
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab',
  '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047',
  '#7cb342', '#c0ca33', '#fdd835', '#ffb300', '#fb8c00',
  '#f4511e', '#6d4c41', '#546e7a', '#ff4081', '#00e676',
];

export const ColorPanel: React.FC = () => {
  const {
    foregroundColor,
    backgroundColor,
    setForegroundColor,
    setBackgroundColor,
    swapColors,
    resetColors,
  } = useToolStore();

  const [activeTarget, setActiveTarget] = useState<'fg' | 'bg'>('fg');
  const activeColor = activeTarget === 'fg' ? foregroundColor : backgroundColor;

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const rgb = hexToRgb(activeColor);

  const handleColorChange = (newHex: string) => {
    if (activeTarget === 'fg') {
      setForegroundColor(newHex);
    } else {
      setBackgroundColor(newHex);
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    const current = { ...rgb, [channel]: Math.max(0, Math.min(255, value)) };
    const hex = `#${((1 << 24) + (current.r << 16) + (current.g << 8) + current.b).toString(16).slice(1)}`;
    handleColorChange(hex);
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
      }}
    >
      {/* Target Color Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* FG Chip */}
          <div
            onClick={() => setActiveTarget('fg')}
            style={{
              width: 28,
              height: 28,
              backgroundColor: foregroundColor,
              border: activeTarget === 'fg' ? `2px solid ${editorTokens.accent.primary}` : '1px solid #777',
              borderRadius: 2,
              cursor: 'pointer',
            }}
            title="Foreground Color"
          />

          {/* BG Chip */}
          <div
            onClick={() => setActiveTarget('bg')}
            style={{
              width: 28,
              height: 28,
              backgroundColor: backgroundColor,
              border: activeTarget === 'bg' ? `2px solid ${editorTokens.accent.primary}` : '1px solid #777',
              borderRadius: 2,
              cursor: 'pointer',
            }}
            title="Background Color"
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Swap Colors (X)">
            <button
              type="button"
              onClick={swapColors}
              style={{
                backgroundColor: editorTokens.bg.surface,
                border: `1px solid ${editorTokens.border.subtle}`,
                color: editorTokens.text.secondary,
                cursor: 'pointer',
                padding: 4,
                borderRadius: 2,
                display: 'flex',
              }}
            >
              <ArrowLeftRight size={13} />
            </button>
          </Tooltip>
          <Tooltip title="Reset Black & White (D)">
            <button
              type="button"
              onClick={resetColors}
              style={{
                backgroundColor: editorTokens.bg.surface,
                border: `1px solid ${editorTokens.border.subtle}`,
                color: editorTokens.text.secondary,
                cursor: 'pointer',
                padding: 4,
                borderRadius: 2,
                display: 'flex',
              }}
            >
              <RotateCcw size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Interactive Color Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          type="color"
          value={activeColor}
          onChange={(e) => handleColorChange(e.target.value)}
          style={{
            width: 40,
            height: 30,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: editorTokens.text.secondary }}>HEX:</span>
          <input
            type="text"
            value={activeColor.toUpperCase()}
            onChange={(e) => handleColorChange(e.target.value)}
            style={{
              flex: 1,
              height: 22,
              backgroundColor: editorTokens.bg.input,
              border: `1px solid ${editorTokens.border.subtle}`,
              color: editorTokens.text.primary,
              fontSize: '0.72rem',
              padding: '1px 6px',
              borderRadius: 2,
              fontFamily: 'monospace',
            }}
          />
        </div>
      </div>

      {/* RGB Sliders / Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#ff6b6b', fontWeight: 600 }}>R:</span>
          <input
            type="number"
            value={rgb.r}
            min={0}
            max={255}
            onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              height: 22,
              backgroundColor: editorTokens.bg.input,
              border: `1px solid ${editorTokens.border.subtle}`,
              color: editorTokens.text.primary,
              fontSize: '0.72rem',
              padding: '1px 4px',
              borderRadius: 2,
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#51cf66', fontWeight: 600 }}>G:</span>
          <input
            type="number"
            value={rgb.g}
            min={0}
            max={255}
            onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              height: 22,
              backgroundColor: editorTokens.bg.input,
              border: `1px solid ${editorTokens.border.subtle}`,
              color: editorTokens.text.primary,
              fontSize: '0.72rem',
              padding: '1px 4px',
              borderRadius: 2,
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#339af0', fontWeight: 600 }}>B:</span>
          <input
            type="number"
            value={rgb.b}
            min={0}
            max={255}
            onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              height: 22,
              backgroundColor: editorTokens.bg.input,
              border: `1px solid ${editorTokens.border.subtle}`,
              color: editorTokens.text.primary,
              fontSize: '0.72rem',
              padding: '1px 4px',
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      {/* Swatches Palette */}
      <div style={{ fontSize: '0.68rem', color: editorTokens.text.secondary, marginBottom: 6, fontWeight: 600 }}>
        SWATCHES
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {PRESET_SWATCHES.map((hex) => (
          <div
            key={hex}
            onClick={() => handleColorChange(hex)}
            style={{
              height: 18,
              backgroundColor: hex,
              border: '1px solid rgba(0,0,0,0.3)',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'transform 0.1s ease',
            }}
            title={hex}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
      </div>
    </div>
  );
};
