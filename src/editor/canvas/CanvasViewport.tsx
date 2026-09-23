'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Konva from 'konva';
import { useDocumentStore } from '@/store/documentStore';
import { useViewStore } from '@/store/viewStore';
import { useToolStore } from '@/store/toolStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUIStore } from '@/store/uiStore';
import { Rulers } from './Rulers';
import { GuidesOverlay } from './GuidesOverlay';
import { SmartGuidesOverlay } from './SmartGuidesOverlay';
import { CropOverlay } from './CropOverlay';
import { MarqueeOverlay } from './MarqueeOverlay';
import { CanvasStage } from './CanvasStage';
import { RemoteCursorsOverlay } from '@/components/collaboration/RemoteCursorsOverlay';
import { RemoteSelectionsOverlay } from '@/components/collaboration/RemoteSelectionsOverlay';
import { ImageLoader } from '@/lib/image/imageLoader';
import { AddLayerCommand } from '../commands/LayerCommands';
import { ImageLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';
import { editorTokens } from '@/theme/palette';
import { isFormInputElement } from '@/lib/keyboard/shortcutRegistry';
import { nanoid } from 'nanoid';

interface CanvasViewportProps {
  onStageReady?: (stage: Konva.Stage) => void;
  onDocumentPointerMove?: (x: number, y: number) => void;
}

const RULER_SIZE = 20;

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  onStageReady,
  onDocumentPointerMove,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });

  const { document: doc } = useDocumentStore();
  const {
    zoom,
    panX,
    panY,
    showRulers,
    showGrid,
    setZoom,
    panBy,
    fitToViewport,
    setCursorPos,
    addGuide,
  } = useViewStore();

  const { activeTool, isTemporaryHand } = useToolStore();
  const { layers, selectLayer } = useLayerStore();
  const { executeCommand } = useHistoryStore();
  const { showToast } = useUIStore();

  const [mouseDocCoords, setMouseDocCoords] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Update viewport size on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setViewportSize({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initial fit to screen
  useEffect(() => {
    if (doc && viewportSize.width > 200 && viewportSize.height > 200) {
      fitToViewport(viewportSize.width, viewportSize.height, doc.width, doc.height);
    }
  }, [doc?.id]);

  // Compute document position in viewport (centered by default + panX, panY)
  const rulerOffset = showRulers ? RULER_SIZE : 0;
  const docW = (doc?.width || 800) * zoom;
  const docH = (doc?.height || 600) * zoom;
  const centerDocX = rulerOffset + (viewportSize.width - rulerOffset - docW) / 2 + panX;
  const centerDocY = rulerOffset + (viewportSize.height - rulerOffset - docH) / 2 + panY;

  // Track cursor position in document coordinates
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // If active pan
      if (isPanningRef.current) {
        const dx = clientX - lastMousePosRef.current.x;
        const dy = clientY - lastMousePosRef.current.y;
        lastMousePosRef.current = { x: clientX, y: clientY };
        panBy(dx, dy);
        return;
      }

      // Compute document coordinates
      const docX = (clientX - centerDocX) / zoom;
      const docY = (clientY - centerDocY) / zoom;
      const roundX = Math.round(docX);
      const roundY = Math.round(docY);

      setMouseDocCoords({ x: roundX, y: roundY });
      setCursorPos(roundX, roundY);
      onDocumentPointerMove?.(roundX, roundY);
    },
    [centerDocX, centerDocY, zoom, panBy, setCursorPos, onDocumentPointerMove]
  );

  // Pan interaction
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle click (button 1) or Hand tool or Spacebar held
      if (e.button === 1 || activeTool === 'hand' || isTemporaryHand) {
        e.preventDefault();
        isPanningRef.current = true;
        setIsPanning(true);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          lastMousePosRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
        }
      }
    },
    [activeTool, isTemporaryHand]
  );

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
  }, []);

  // Zoom on wheel (Ctrl+wheel or standard wheel)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Determine zoom delta
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.max(0.05, Math.min(32, zoom * zoomFactor));

      // Zoom centered at mouse cursor position
      const mouseDocX = (mouseX - centerDocX) / zoom;
      const mouseDocY = (mouseY - centerDocY) / zoom;

      const newCenterDocX = mouseX - mouseDocX * newZoom;
      const newCenterDocY = mouseY - mouseDocY * newZoom;

      const defaultCenterX = rulerOffset + (viewportSize.width - rulerOffset - (doc?.width || 800) * newZoom) / 2;
      const defaultCenterY = rulerOffset + (viewportSize.height - rulerOffset - (doc?.height || 600) * newZoom) / 2;

      useViewStore.getState().setPan(newCenterDocX - defaultCenterX, newCenterDocY - defaultCenterY);
      setZoom(newZoom);
    },
    [zoom, centerDocX, centerDocY, rulerOffset, viewportSize, doc?.width, doc?.height, setZoom]
  );

  // Helper to place an imported image onto canvas
  const placeImageOnCanvas = useCallback(
    (imgInfo: { dataUrl: string; name: string; width: number; height: number }) => {
      if (!doc) return;

      // Fit image reasonably inside canvas if larger than document
      let targetW = imgInfo.width;
      let targetH = imgInfo.height;
      const maxW = doc.width * 0.85;
      const maxH = doc.height * 0.85;

      if (targetW > maxW || targetH > maxH) {
        const scale = Math.min(maxW / targetW, maxH / targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }

      // Center on document
      const posX = Math.round((doc.width - targetW) / 2);
      const posY = Math.round((doc.height - targetH) / 2);

      const newImageLayer: ImageLayer = {
        id: nanoid(),
        type: 'IMAGE',
        name: imgInfo.name,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        x: posX,
        y: posY,
        width: targetW,
        height: targetH,
        rotation: 0,
        zIndex: layers.length,
        parentId: null,
        imageUrl: imgInfo.dataUrl,
        naturalWidth: imgInfo.width,
        naturalHeight: imgInfo.height,
        adjustments: { ...DEFAULT_ADJUSTMENTS },
      };

      const cmd = new AddLayerCommand(newImageLayer, 0);
      executeCommand(cmd);
      selectLayer(newImageLayer.id);
      showToast(`Imported "${imgInfo.name}"`, 'success');
    },
    [doc, layers.length, executeCommand, selectLayer, showToast]
  );

  // Drag and drop image files directly onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const imgInfo = await ImageLoader.loadFromFile(file);
          placeImageOnCanvas(imgInfo);
        } catch (err) {
          showToast('Failed to import image', 'error');
        }
      }
    }
  };

  // Clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isFormInputElement(e.target)) return;
      if (!e.clipboardData) return;

      const imgInfo = await ImageLoader.loadFromClipboard(e.clipboardData.items);
      if (imgInfo) {
        placeImageOnCanvas(imgInfo);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [placeImageOnCanvas]);

  const cursorStyle = isPanning || activeTool === 'hand' || isTemporaryHand
    ? 'grab'
    : activeTool === 'zoom'
    ? 'zoom-in'
    : activeTool === 'eyedropper'
    ? 'crosshair'
    : activeTool === 'crop'
    ? 'default'
    : activeTool === 'brush' || activeTool === 'eraser'
    ? 'crosshair'
    : activeTool === 'text'
    ? 'text'
    : 'default';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: editorTokens.bg.canvas,
        overflow: 'hidden',
        cursor: cursorStyle,
        userSelect: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Precision Rulers */}
      {showRulers && (
        <Rulers
          viewportWidth={viewportSize.width}
          viewportHeight={viewportSize.height}
          docX={centerDocX}
          docY={centerDocY}
          cursorX={mouseDocCoords.x}
          cursorY={mouseDocCoords.y}
          onAddGuide={addGuide}
        />
      )}

      {/* Guides Overlay */}
      <GuidesOverlay docX={centerDocX} docY={centerDocY} />

      {/* Smart Guides Overlay */}
      <SmartGuidesOverlay docX={centerDocX} docY={centerDocY} />

      {/* Selection Marquee Overlay */}
      <MarqueeOverlay docX={centerDocX} docY={centerDocY} zoom={zoom} />

      {/* Interactive Crop Frame Overlay */}
      <CropOverlay docX={centerDocX} docY={centerDocY} zoom={zoom} />

      {/* Centered Document Artboard */}
      {doc && (
        <div
          style={{
            position: 'absolute',
            left: `${centerDocX}px`,
            top: `${centerDocY}px`,
            width: `${doc.width * zoom}px`,
            height: `${doc.height * zoom}px`,
            boxShadow: editorTokens.shadow.canvasDoc,
            outline: `1px solid ${editorTokens.border.medium}`,
            transformOrigin: '0 0',
          }}
        >
          {/* Transparency Checkerboard */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: doc.backgroundColor === 'transparent' ? '#ffffff' : doc.backgroundColor,
              backgroundImage:
                doc.backgroundColor === 'transparent'
                  ? `linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
                     linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
                     linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
                     linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)`
                  : 'none',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              zIndex: 1,
            }}
          />

          {/* Grid Overlay if enabled */}
          {showGrid && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                pointerEvents: 'none',
                zIndex: 15,
              }}
            />
          )}

          {/* Konva Stage Scale Container */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              zIndex: 5,
            }}
          >
            <CanvasStage
              onStageReady={onStageReady}
              onPointerMove={(x, y) => setCursorPos(x, y)}
            />
          </div>

          {/* Remote collaborator selections overlay */}
          <RemoteSelectionsOverlay zoom={zoom} />

          {/* Remote collaborator cursors overlay */}
          <RemoteCursorsOverlay zoom={zoom} />
        </div>
      )}
    </div>
  );
};
