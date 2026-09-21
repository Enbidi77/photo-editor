'use client';

import React from 'react';
import { useSelectionStore } from '@/store/selectionStore';

interface MarqueeOverlayProps {
  docX: number;
  docY: number;
  zoom: number;
}

export const MarqueeOverlay: React.FC<MarqueeOverlayProps> = ({ docX, docY, zoom }) => {
  const { selection } = useSelectionStore();

  if (!selection || selection.width === 0 || selection.height === 0) return null;

  const left = docX + Math.min(selection.x, selection.x + selection.width) * zoom;
  const top = docY + Math.min(selection.y, selection.y + selection.height) * zoom;
  const width = Math.abs(selection.width) * zoom;
  const height = Math.abs(selection.height) * zoom;

  const isEllipse = selection.shape === 'ellipse';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 21,
        borderRadius: isEllipse ? '50%' : 0,
        boxShadow: '0 0 0 1px #000000',
        border: '1px dashed #ffffff',
        animation: 'marchingAnts 0.8s linear infinite',
      }}
    >
      <style jsx>{`
        @keyframes marchingAnts {
          0% {
            border-style: dashed;
            outline: 1px solid #000;
          }
          50% {
            outline: 1px solid #fff;
          }
          100% {
            border-style: dashed;
            outline: 1px solid #000;
          }
        }
      `}</style>
    </div>
  );
};
