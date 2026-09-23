'use client';

import React from 'react';
import { useViewStore } from '@/store/viewStore';

interface SmartGuidesOverlayProps {
  docX: number;
  docY: number;
}

export const SmartGuidesOverlay: React.FC<SmartGuidesOverlayProps> = ({ docX, docY }) => {
  const { activeSmartGuides, zoom } = useViewStore();

  if (!activeSmartGuides || activeSmartGuides.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 22,
        overflow: 'hidden',
      }}
    >
      {activeSmartGuides.map((guide, index) => {
        const isEdge = guide.type === 'edge';
        const lineStyle = isEdge ? '1px dashed #FF00FF' : '1px solid #FF00FF';

        if (guide.orientation === 'horizontal') {
          const top = docY + guide.position * zoom;
          return (
            <div
              key={`smart-guide-h-${guide.position}-${index}`}
              style={{
                position: 'absolute',
                top: `${top}px`,
                left: 0,
                right: 0,
                height: 0,
                borderTop: lineStyle,
                opacity: 0.85,
                pointerEvents: 'none',
              }}
            />
          );
        } else {
          const left = docX + guide.position * zoom;
          return (
            <div
              key={`smart-guide-v-${guide.position}-${index}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${left}px`,
                width: 0,
                borderLeft: lineStyle,
                opacity: 0.85,
                pointerEvents: 'none',
              }}
            />
          );
        }
      })}
    </div>
  );
};
