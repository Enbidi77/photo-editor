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

  if (!selection) return null;

  if (selection.shape === 'polygon' && selection.points && selection.points.length >= 4) {
    const pointsStr = selection.points
      .reduce((acc, val, i) => {
        const coord = val * zoom;
        return acc + (i % 2 === 0 ? `${coord},` : `${coord} `);
      }, '')
      .trim();

    return (
      <div
        style={{
          position: 'absolute',
          left: `${docX}px`,
          top: `${docY}px`,
          pointerEvents: 'none',
          zIndex: 21,
          overflow: 'visible',
        }}
      >
        <svg style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <polygon
            points={pointsStr}
            fill="none"
            stroke="black"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon
            points={pointsStr}
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
            strokeDasharray="4 4"
            style={{ animation: 'marchingAntsSvg 0.8s linear infinite' }}
          />
        </svg>
        <style>{`
          @keyframes marchingAntsSvg {
            to { stroke-dashoffset: -8; }
          }
        `}</style>
      </div>
    );
  }

  if (selection.width === 0 || selection.height === 0) return null;

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
      <style>{`
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
