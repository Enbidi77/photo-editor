'use client';

import React, { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { editorTokens } from '@/theme/palette';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { HistoryPanel } from './HistoryPanel';
import { NavigatorPanel } from './NavigatorPanel';
import { ColorPanel } from './ColorPanel';
import { BrushesPanel } from './BrushesPanel';
import { CharacterPanel } from './CharacterPanel';
import {
  Layers,
  Sliders,
  History,
  Compass,
  Palette,
  Paintbrush,
  Type,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';

interface DockTabItem {
  id: 'layers' | 'properties' | 'history' | 'navigator' | 'color' | 'brushes' | 'character';
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const PanelDock: React.FC = () => {
  const { activePanel, setActivePanel, rightSidebarCollapsed, toggleRightSidebar } = useUIStore();
  const { layers } = useLayerStore();
  const { entries } = useHistoryStore();

  const [dockWidth, setDockWidth] = useState(280);

  const TABS: DockTabItem[] = [
    { id: 'layers', label: 'Layers', icon: <Layers size={13} />, badge: layers.length },
    { id: 'properties', label: 'Properties', icon: <Sliders size={13} /> },
    { id: 'history', label: 'History', icon: <History size={13} />, badge: entries.length },
    { id: 'navigator', label: 'Navigator', icon: <Compass size={13} /> },
    { id: 'color', label: 'Color', icon: <Palette size={13} /> },
    { id: 'brushes', label: 'Brushes', icon: <Paintbrush size={13} /> },
    { id: 'character', label: 'Character', icon: <Type size={13} /> },
  ];

  if (rightSidebarCollapsed) {
    return (
      <div
        style={{
          width: 32,
          backgroundColor: editorTokens.bg.panel,
          borderLeft: `1px solid ${editorTokens.border.subtle}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '6px 0',
          zIndex: 35,
          userSelect: 'none',
        }}
      >
        <Tooltip title="Expand Panels" placement="left">
          <button
            type="button"
            onClick={toggleRightSidebar}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: editorTokens.text.secondary,
              cursor: 'pointer',
              padding: 4,
              marginBottom: 8,
            }}
          >
            <ChevronLeft size={16} />
          </button>
        </Tooltip>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TABS.map((tab) => (
            <Tooltip key={tab.id} title={tab.label} placement="left">
              <button
                type="button"
                onClick={() => {
                  setActivePanel(tab.id);
                  toggleRightSidebar();
                }}
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: activePanel === tab.id ? editorTokens.accent.primary : 'transparent',
                  color: activePanel === tab.id ? '#ffffff' : editorTokens.text.secondary,
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                {tab.icon}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: dockWidth,
        minWidth: 240,
        maxWidth: 420,
        backgroundColor: editorTokens.bg.panel,
        borderLeft: `1px solid ${editorTokens.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Panel Tab Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: editorTokens.bg.panelHeader,
          borderBottom: `1px solid ${editorTokens.border.subtle}`,
          overflowX: 'auto',
          padding: '0 4px',
          height: 28,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePanel(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 8px',
                height: '100%',
                backgroundColor: isActive ? editorTokens.bg.panel : 'transparent',
                border: 'none',
                borderTop: isActive ? `2px solid ${editorTokens.accent.primary}` : '2px solid transparent',
                color: isActive ? '#ffffff' : editorTokens.text.secondary,
                fontSize: '0.68rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? editorTokens.accent.primary : editorTokens.bg.surface,
                    color: '#ffffff',
                    fontSize: '0.6rem',
                    padding: '0 4px',
                    borderRadius: 10,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Collapse Button */}
        <Tooltip title="Collapse Panels">
          <button
            type="button"
            onClick={toggleRightSidebar}
            style={{
              marginLeft: 'auto',
              backgroundColor: 'transparent',
              border: 'none',
              color: editorTokens.text.muted,
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRight size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Active Panel Body */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activePanel === 'layers' && <LayersPanel />}
        {activePanel === 'properties' && <PropertiesPanel />}
        {activePanel === 'history' && <HistoryPanel />}
        {activePanel === 'navigator' && <NavigatorPanel />}
        {activePanel === 'color' && <ColorPanel />}
        {activePanel === 'brushes' && <BrushesPanel />}
        {activePanel === 'character' && <CharacterPanel />}
      </div>
    </div>
  );
};
