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
import { DropzoneOverlay, DropzoneState } from '@/components/common/DropzoneOverlay';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
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
  const [dropState, setDropState] = useState<DropzoneState>('idle');
  const [dropError, setDropError] = useState<string>('');
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearErrorTimeout = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  const triggerError = useCallback((msg: string) => {
    clearErrorTimeout();
    setDropError(msg);
    setDropState('error');
    errorTimeoutRef.current = setTimeout(() => {
      setDropState('idle');
    }, 5000);
  }, [clearErrorTimeout]);

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
    (
      imgInfo: { dataUrl: string; name: string; width: number; height: number },
      dropDocPos?: { x: number; y: number },
      offsetIndex = 0
    ) => {
      if (!doc) return;

      const imgWidth = imgInfo.width || 800;
      const imgHeight = imgInfo.height || 600;

      // Fit image reasonably inside canvas if larger than document
      let targetW = imgWidth;
      let targetH = imgHeight;
      const maxW = doc.width * 0.85;
      const maxH = doc.height * 0.85;

      if (targetW > maxW || targetH > maxH) {
        const scale = Math.min(maxW / targetW, maxH / targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }

      // Position: centered at drop cursor position if provided, else centered on document
      let posX = Math.round((doc.width - targetW) / 2);
      let posY = Math.round((doc.height - targetH) / 2);

      if (dropDocPos) {
        posX = Math.round(dropDocPos.x - targetW / 2) + offsetIndex * 24;
        posY = Math.round(dropDocPos.y - targetH / 2) + offsetIndex * 24;
      }

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
        naturalWidth: imgWidth,
        naturalHeight: imgHeight,
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
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounterRef.current += 1;
        clearErrorTimeout();
        setDropState('dragging');
      }
    },
    [clearErrorTimeout]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDropState((prev) => (prev === 'dragging' ? 'idle' : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) {
        setDropState('idle');
        return;
      }

      const validFiles = files.filter(
        (f) =>
          f.type.startsWith('image/') ||
          /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(f.name) ||
          f.name.endsWith('.pxf') ||
          f.type === 'application/json'
      );

      if (validFiles.length === 0) {
        triggerError('Unsupported file type. Please drop an image (PNG, JPG, WebP, SVG, GIF) or .pxf project.');
        return;
      }

      // Show brief confirmation animation before processing begins
      setDropState('confirming');
      await new Promise((resolve) => setTimeout(resolve, 450));

      // Calculate drop coordinates in document space if dropped near document area
      let dropDocPos: { x: number; y: number } | undefined;
      const container = containerRef.current;
      if (container && doc) {
        const rect = container.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const docX = (clientX - centerDocX) / zoom;
        const docY = (clientY - centerDocY) / zoom;
        dropDocPos = { x: Math.round(docX), y: Math.round(docY) };
      }

      let importedCount = 0;
      for (const file of validFiles) {
        if (file.name.endsWith('.pxf') || file.type === 'application/json') {
          try {
            await PxfSerializer.loadFromFile(file);
            showToast(`Opened project "${file.name}"`, 'success');
            setDropState('idle');
            return;
          } catch {
            showToast('Failed to open project file', 'error');
          }
        } else {
          try {
            const imgInfo = await ImageLoader.loadFromFile(file);
            placeImageOnCanvas(imgInfo, dropDocPos, importedCount);
            importedCount++;
          } catch (err) {
            showToast(`Failed to load "${file.name}"`, 'error');
          }
        }
      }

      setDropState('idle');
    },
    [doc, centerDocX, centerDocY, zoom, placeImageOnCanvas, showToast, triggerError]
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setDropState('confirming');
    await new Promise((resolve) => setTimeout(resolve, 350));
    let count = 0;
    for (const file of files) {
      if (file.name.endsWith('.pxf') || file.type === 'application/json') {
        try {
          await PxfSerializer.loadFromFile(file);
          showToast(`Opened project "${file.name}"`, 'success');
          setDropState('idle');
          return;
        } catch {
          showToast('Failed to open project file', 'error');
        }
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(file.name)) {
        try {
          const imgInfo = await ImageLoader.loadFromFile(file);
          placeImageOnCanvas(imgInfo, undefined, count);
          count++;
        } catch {
          showToast(`Failed to load "${file.name}"`, 'error');
        }
      }
    }
    setDropState('idle');
    e.target.value = '';
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
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
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
            filter: dropState === 'dragging' ? 'blur(3px) brightness(0.65)' : 'none',
            transition: 'filter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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

      {/* Hidden file input for error retry */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pxf,application/json"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Prominent, accessible DropzoneOverlay */}
      <DropzoneOverlay
        state={dropState}
        title="Drop your image here"
        subtitle="Release to add directly as a new layer"
        confirmTitle="Image dropped!"
        confirmSubtitle="Adding new layer to canvas..."
        errorMessage={dropError}
        onRetry={() => fileInputRef.current?.click()}
        onDismissError={() => setDropState('idle')}
        testId="canvas-dropzone-overlay"
      />
    </div>
  );
};
