'use client';

import React from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useLayerStore } from '@/store/layerStore';

interface RemoteSelectionsOverlayProps {
  zoom: number;
}

export const RemoteSelectionsOverlay: React.FC<RemoteSelectionsOverlayProps> = ({ zoom }) => {
  const { remoteSelections, collaborators } = useCollaborationStore();
  const { layers } = useLayerStore();

  const selections = Object.values(remoteSelections);
  if (selections.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 18,
      }}
    >
      {selections.map((sel) => {
        const layer = layers.find((l) => l.id === sel.layerId);
        if (!layer || !layer.visible) return null;

        const collab = collaborators.find((c) => c.userId === sel.userId);
        const displayName = collab?.displayName || 'Collaborator';

        const x = layer.x * zoom;
        const y = layer.y * zoom;
        const w = layer.width * zoom;
        const h = layer.height * zoom;
        const rot = layer.rotation || 0;

        return (
          <div
            key={`${sel.userId}-${sel.layerId}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: h,
              border: `2px dashed ${sel.color}`,
              boxSizing: 'border-box',
              pointerEvents: 'none',
              transform: `rotate(${rot}deg)`,
              transformOrigin: '0 0',
              transition: 'all 80ms ease-out',
            }}
          >
            {/* User Pill Badge */}
            <div
              style={{
                position: 'absolute',
                top: -18,
                left: 0,
                backgroundColor: sel.color,
                color: '#ffffff',
                padding: '1px 5px',
                borderRadius: '3px 3px 0 0',
                fontSize: '9px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {displayName}
            </div>

            {/* Corner handles (decorative) */}
            <span
              style={{
                position: 'absolute',
                top: -3,
                left: -3,
                width: 6,
                height: 6,
                backgroundColor: sel.color,
                borderRadius: 1,
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 6,
                height: 6,
                backgroundColor: sel.color,
                borderRadius: 1,
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: -3,
                left: -3,
                width: 6,
                height: 6,
                backgroundColor: sel.color,
                borderRadius: 1,
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 6,
                height: 6,
                backgroundColor: sel.color,
                borderRadius: 1,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
