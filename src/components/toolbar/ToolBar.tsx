'use client';

import React from 'react';
import { useToolStore } from '@/store/toolStore';
import { ToolType } from '@/types/tools';
import { ToolButton } from './ToolButton';
import { editorTokens } from '@/theme/palette';
import {
  Move,
  SquareDashed,
  Lasso,
  Wand2,
  Crop,
  Pipette,
  Paintbrush,
  Eraser,
  Stamp,
  Blend,
  PaintBucket,
  PenTool,
  Type,
  Square,
  Circle,
  Hexagon,
  Hand,
  ZoomIn,
  ArrowLeftRight,
} from 'lucide-react';

interface ToolItem {
  id: ToolType;
  name: string;
  shortcut: string;
  icon: React.ReactNode;
  hasSubtools?: boolean;
}

const TOOLS_CONFIG: ToolItem[] = [
  { id: 'move', name: 'Move Tool', shortcut: 'V', icon: <Move size={16} /> },
  { id: 'marquee', name: 'Marquee Tool', shortcut: 'M', icon: <SquareDashed size={16} />, hasSubtools: true },
  { id: 'lasso', name: 'Lasso Tool', shortcut: 'L', icon: <Lasso size={16} /> },
  { id: 'magic-wand', name: 'Magic Wand', shortcut: 'W', icon: <Wand2 size={16} /> },
  { id: 'crop', name: 'Crop Tool', shortcut: 'C', icon: <Crop size={16} /> },
  { id: 'eyedropper', name: 'Eyedropper Tool', shortcut: 'I', icon: <Pipette size={16} /> },
  { id: 'brush', name: 'Brush Tool', shortcut: 'B', icon: <Paintbrush size={16} /> },
  { id: 'eraser', name: 'Eraser Tool', shortcut: 'E', icon: <Eraser size={16} /> },
  { id: 'clone', name: 'Clone Stamp Tool', shortcut: 'S', icon: <Stamp size={16} /> },
  { id: 'gradient', name: 'Gradient Tool', shortcut: 'G', icon: <Blend size={16} /> },
  { id: 'paint-bucket', name: 'Paint Bucket Tool', shortcut: 'K', icon: <PaintBucket size={16} /> },
  { id: 'pen', name: 'Pen Tool', shortcut: 'P', icon: <PenTool size={16} /> },
  { id: 'text', name: 'Text Tool', shortcut: 'T', icon: <Type size={16} /> },
  { id: 'rectangle', name: 'Rectangle Tool', shortcut: 'U', icon: <Square size={16} />, hasSubtools: true },
  { id: 'ellipse', name: 'Ellipse Tool', shortcut: 'Shift+U', icon: <Circle size={16} /> },
  { id: 'polygon', name: 'Polygon Tool', shortcut: 'Alt+U', icon: <Hexagon size={16} /> },
  { id: 'hand', name: 'Hand Tool', shortcut: 'H', icon: <Hand size={16} /> },
  { id: 'zoom', name: 'Zoom Tool', shortcut: 'Z', icon: <ZoomIn size={16} /> },
];

export const ToolBar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    foregroundColor,
    backgroundColor,
    swapColors,
    resetColors,
    setForegroundColor,
    setBackgroundColor,
  } = useToolStore();

  return (
    <div
      style={{
        width: 44,
        backgroundColor: editorTokens.bg.toolbar,
        borderRight: `1px solid ${editorTokens.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px 0',
        zIndex: 40,
        height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Tool Buttons Grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          alignItems: 'center',
          flex: 1,
        }}
      >
        {TOOLS_CONFIG.map((tool) => (
          <ToolButton
            key={tool.id}
            id={tool.id}
            name={tool.name}
            shortcut={tool.shortcut}
            icon={tool.icon}
            isActive={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
            hasSubtools={tool.hasSubtools}
          />
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          width: 28,
          height: 1,
          backgroundColor: editorTokens.border.subtle,
          margin: '8px 0',
        }}
      />

      {/* Color Swatch & Swap Controls */}
      <div
        style={{
          position: 'relative',
          width: 32,
          height: 38,
          marginTop: 2,
          marginBottom: 6,
        }}
      >
        {/* Reset D/W Button */}
        <button
          type="button"
          onClick={resetColors}
          title="Default Foreground / Background Colors (D)"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 10,
            height: 10,
            backgroundColor: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              backgroundColor: '#000000',
              border: '1px solid #777777',
              position: 'relative',
              zIndex: 2,
            }}
          />
          <div
            style={{
              width: 6,
              height: 6,
              backgroundColor: '#ffffff',
              border: '1px solid #777777',
              position: 'absolute',
              top: 3,
              left: 3,
              zIndex: 1,
            }}
          />
        </button>

        {/* Swap Colors Button */}
        <button
          type="button"
          onClick={swapColors}
          title="Switch Colors (X)"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 12,
            height: 12,
            backgroundColor: 'transparent',
            border: 'none',
            color: editorTokens.text.secondary,
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeftRight size={10} />
        </button>

        {/* Background Color Chip */}
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 18,
            height: 18,
            backgroundColor: backgroundColor,
            border: '1px solid #888888',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            borderRadius: 2,
          }}
          title={`Background Color: ${backgroundColor} (Click to edit)`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = backgroundColor;
            input.onchange = (e) => setBackgroundColor((e.target as HTMLInputElement).value);
            input.click();
          }}
        />

        {/* Foreground Color Chip (overlapping) */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 2,
            width: 18,
            height: 18,
            backgroundColor: foregroundColor,
            border: '1px solid #ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            borderRadius: 2,
            zIndex: 2,
          }}
          title={`Foreground Color: ${foregroundColor} (Click to edit)`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = foregroundColor;
            input.onchange = (e) => setForegroundColor((e.target as HTMLInputElement).value);
            input.click();
          }}
        />
      </div>
    </div>
  );
};
