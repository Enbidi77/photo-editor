import { useState, useCallback } from 'react';
import { useLayerStore } from '@/store/layerStore';

export type ContextMenuTarget =
  | {
      type: 'layer';
      layerId: string;
      source: 'layers-panel' | 'canvas';
    }
  | {
      type: 'canvas';
      coords?: { x: number; y: number };
    };

export interface ContextMenuState {
  mouseX: number;
  mouseY: number;
  target: ContextMenuTarget;
}

/**
 * Activates a layer while preserving any active multi-selection if the layer is already part of it.
 * If the layer is not selected, collapses selection to only this layer and sets it active.
 */
export function activateLayerWithSelectionPreservation(layerId: string): void {
  const { selectedLayerIds, selectLayer } = useLayerStore.getState();
  if (selectedLayerIds.includes(layerId)) {
    useLayerStore.setState({ activeLayerId: layerId });
  } else {
    selectLayer(layerId, false);
  }
}

export function useEditorContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const openLayerMenu = useCallback(
    (layerId: string, clientX: number, clientY: number, source: 'layers-panel' | 'canvas' = 'layers-panel') => {
      activateLayerWithSelectionPreservation(layerId);
      setContextMenu({
        mouseX: clientX,
        mouseY: clientY,
        target: { type: 'layer', layerId, source },
      });
    },
    []
  );

  const openCanvasMenu = useCallback(
    (clientX: number, clientY: number, coords?: { x: number; y: number }) => {
      useLayerStore.getState().selectLayer('');
      setContextMenu({
        mouseX: clientX,
        mouseY: clientY,
        target: { type: 'canvas', coords },
      });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    openLayerMenu,
    openCanvasMenu,
    closeMenu,
  };
}
