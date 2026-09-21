'use client';

import React from 'react';
import { useViewStore } from '@/store/viewStore';

interface GuidesOverlayProps {
  docX: number;
  docY: number;
}

export const GuidesOverlay: React.FC<GuidesOverlayProps> = ({ docX, docY }) => {
  const { guides, showGuides, zoom, removeGuide } = useViewStore();

  if (!showGuides || guides.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {guides.map((g) => {
        if (g.orientation === 'horizontal') {
          const top = docY + g.position * zoom;
          return (
            <div
              key={g.id}
              style={{
                position: 'absolute',
                top: `${top}px`,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: '#00ffff',
                boxShadow: '0 0 1px rgba(0, 255, 255, 0.8)',
                pointerEvents: 'auto',
                cursor: 'ns-resize',
              }}
              onDoubleClick={() => removeGuide(g.id)}
              title={`Horizontal Guide: ${g.position}px (Double-click to remove)`}
            />
          );
        } else {
          const left = docX + g.position * zoom;
          return (
            <div
              key={g.id}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${left}px`,
                width: 1,
                backgroundColor: '#00ffff',
                boxShadow: '0 0 1px rgba(0, 255, 255, 0.8)',
                pointerEvents: 'auto',
                cursor: 'ew-resize',
              }}
              onDoubleClick={() => removeGuide(g.id)}
              title={`Vertical Guide: ${g.position}px (Double-click to remove)`}
            />
          );
        }
      })}
    </div>
  );
};
