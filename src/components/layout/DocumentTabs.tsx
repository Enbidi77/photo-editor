'use client';

import React from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useViewStore } from '@/store/viewStore';
import { editorTokens } from '@/theme/palette';
import { X } from 'lucide-react';

export const DocumentTabs: React.FC = () => {
  const { document: doc } = useDocumentStore();
  const { zoom } = useViewStore();

  if (!doc) return null;

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      style={{
        height: 26,
        backgroundColor: editorTokens.bg.panelHeader,
        borderBottom: `1px solid ${editorTokens.border.subtle}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        zIndex: 34,
        userSelect: 'none',
      }}
    >
      {/* Active Tab */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: editorTokens.bg.toolbar,
          borderTop: `2px solid ${editorTokens.accent.primary}`,
          borderRight: `1px solid ${editorTokens.border.subtle}`,
          borderLeft: `1px solid ${editorTokens.border.subtle}`,
          padding: '0 10px',
          height: '100%',
          fontSize: '0.72rem',
          color: editorTokens.text.primary,
        }}
      >
        <span>
          {doc.name} @ {zoomPercent}% ({doc.colorMode}) {doc.isDirty ? '*' : ''}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Close document?')) {
              useDocumentStore.getState().closeDocument();
            }
          }}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: editorTokens.text.muted,
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2,
          }}
          title="Close Document"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
