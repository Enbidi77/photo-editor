'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import Konva from 'konva';
import '@/editor/filters/stylizeFilters';
import { useViewStore } from '@/store/viewStore';
import { MaskData } from '@/types/layer';
import { UpdateMaskDataCommand } from '../commands/MaskCommands';
import { computeSnap, SnapConfig } from '@/lib/snap/snapEngine';
import { floodFillSelect, maskToBoundingBox, maskToPolygon } from '@/lib/image/floodFill';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useToolStore } from '@/store/toolStore';
import { useHistoryStore } from '@/store/historyStore';
import { useSelectionStore } from '@/store/selectionStore';
import {
  Layer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  PaintLayer,
  PaintPath,
} from '@/types/layer';
import { AddLayerCommand, TransformLayerCommand, UpdateLayerPropertiesCommand } from '../commands/LayerCommands';
import { nanoid } from 'nanoid';
import { useEditorContextMenu } from '@/hooks/useEditorContextMenu';
import { EditorContextMenu } from '@/components/common/EditorContextMenu';
import {
  GradientType,
  renderGradientCanvas,
  renderShapeGradientCanvas,
  resolveGradientStops,
  DEFAULT_GRADIENT_OPTIONS,
} from '@/lib/image/gradient';

interface CanvasStageProps {
  onStageReady?: (stage: Konva.Stage) => void;
  onPointerMove?: (x: number, y: number) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  onStageReady,
  onPointerMove,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const mainLayerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  // Cache for HTMLImageElements to avoid reloading on every render
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Store references
  const { document: doc } = useDocumentStore();
  const { layers, activeLayerId, selectLayer, updateLayer, editingMaskLayerId } = useLayerStore();
  const {
    snapEnabled, snapThreshold, snapToGuides, snapToLayers,
    snapToDocumentBounds, snapToGrid, guides,
    setActiveSmartGuides, clearSmartGuides,
  } = useViewStore();
  const { activeTool, options, foregroundColor, setForegroundColor, backgroundColor } = useToolStore();
  const { executeCommand } = useHistoryStore();
  const { setSelection } = useSelectionStore();
  const { contextMenu, openLayerMenu, openCanvasMenu, closeMenu } = useEditorContextMenu();
  const contextMenuHandledRef = useRef(false);

  // Active interaction refs
  const isDrawingRef = useRef(false);
  const currentPaintPathRef = useRef<PaintPath | null>(null);
  const activePaintLineNodeRef = useRef<Konva.Line | null>(null);

  const isCreatingShapeRef = useRef(false);
  const shapeStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const previewShapeNodeRef = useRef<Konva.Shape | null>(null);

  const isSelectingMarqueeRef = useRef(false);
  const marqueeStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Lasso tool refs
  const isDrawingLassoRef = useRef(false);
  const lassoPointsRef = useRef<number[]>([]);
  const lassoPreviewLineRef = useRef<Konva.Line | null>(null);

  // Mask painting refs
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMaskPaintingRef = useRef(false);
  const maskPreviousDataRef = useRef<string>('');

  // Gradient tool refs
  const isDrawingGradientRef = useRef(false);
  const gradientStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const gradientGuideLineRef = useRef<Konva.Line | null>(null);
  const gradientStartCircleRef = useRef<Konva.Circle | null>(null);
  const gradientEndCircleRef = useRef<Konva.Circle | null>(null);

  // Initialize Konva Stage
  useEffect(() => {
    if (!containerRef.current || !doc) return;

    const stage = new Konva.Stage({
      container: containerRef.current,
      width: doc.width,
      height: doc.height,
    });

    const mainLayer = new Konva.Layer();
    stage.add(mainLayer);

    const transformer = new Konva.Transformer({
      anchorSize: 8,
      anchorStroke: '#0078d4',
      anchorFill: '#ffffff',
      anchorStrokeWidth: 1.5,
      borderStroke: '#0078d4',
      borderStrokeWidth: 1,
      borderDash: [4, 4],
      rotateAnchorOffset: 24,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'bottom-right',
        'bottom-center',
        'bottom-left',
        'middle-left',
      ],
      boundBoxFunc: (oldBox, newBox) => {
        // Prevent negative or tiny bounding boxes
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        return newBox;
      },
    });

    mainLayer.add(transformer);

    stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
      if (contextMenuHandledRef.current) {
        contextMenuHandledRef.current = false;
        return;
      }
      const pointerPos = stage.getPointerPosition();
      openCanvasMenu(
        e.evt.clientX,
        e.evt.clientY,
        pointerPos ? { x: Math.round(pointerPos.x), y: Math.round(pointerPos.y) } : undefined
      );
    });

    stageRef.current = stage;
    mainLayerRef.current = mainLayer;
    transformerRef.current = transformer;

    if (onStageReady) {
      onStageReady(stage);
    }

    return () => {
      stage.destroy();
      stageRef.current = null;
      mainLayerRef.current = null;
      transformerRef.current = null;
    };
  }, [doc?.id]); // Recreate only if document ID changes

  // Update Stage Dimensions if document size changes (e.g. after crop)
  useEffect(() => {
    if (!stageRef.current || !doc) return;
    if (stageRef.current.width() !== doc.width || stageRef.current.height() !== doc.height) {
      stageRef.current.width(doc.width);
      stageRef.current.height(doc.height);
      stageRef.current.batchDraw();
    }
  }, [doc?.width, doc?.height]);

  // Synchronize Konva Nodes with Zustand Layers
  useEffect(() => {
    const stage = stageRef.current;
    const mainLayer = mainLayerRef.current;
    const transformer = transformerRef.current;
    if (!stage || !mainLayer || !transformer || !doc) return;

    // Remove old layer nodes (except transformer and preview nodes)
    const children = mainLayer.getChildren((node) => {
      return node !== transformer && node !== previewShapeNodeRef.current;
    });
    children.forEach((child) => child.destroy());

    // Render layers in reverse order: layers[0] is top layer, so rendered last
    const reversedLayers = [...layers].reverse();

    reversedLayers.forEach((layer) => {
      let node: Konva.Group | Konva.Shape | null = null;

      if (layer.type === 'IMAGE') {
        const imgLayer = layer as ImageLayer;
        let imgElement = imageCacheRef.current.get(imgLayer.imageUrl);

        if (!imgElement) {
          imgElement = new window.Image();
          imgElement.crossOrigin = 'Anonymous';
          imgElement.src = imgLayer.imageUrl;
          imgElement.onload = () => {
            if (mainLayerRef.current) {
              mainLayerRef.current.batchDraw();
            }
          };
          imageCacheRef.current.set(imgLayer.imageUrl, imgElement);
        }

        const konvaImage = new Konva.Image({
          id: layer.id,
          name: layer.name,
          image: imgElement,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: layer.rotation,
          opacity: layer.opacity,
          visible: layer.visible,
          draggable: activeTool === 'move' && !layer.locked,
          listening: layer.visible,
          globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
        });

        // Apply filters
        const { adjustments } = imgLayer;
        const filters: any[] = [];

        if (adjustments.blur > 0) {
          filters.push(Konva.Filters.Blur);
          konvaImage.blurRadius(adjustments.blur);
        }
        if (adjustments.brightness !== 0) {
          filters.push(Konva.Filters.Brighten);
          konvaImage.brightness(adjustments.brightness);
        }
        if (adjustments.contrast !== 0) {
          filters.push(Konva.Filters.Contrast);
          konvaImage.contrast(adjustments.contrast);
        }
        if (adjustments.noise > 0) {
          filters.push(Konva.Filters.Noise);
          konvaImage.noise(adjustments.noise);
        }
        if (adjustments.grayscale) {
          filters.push(Konva.Filters.Grayscale);
        }
        if (adjustments.invert) {
          filters.push(Konva.Filters.Invert);
        }
        if (adjustments.sepia) {
          filters.push(Konva.Filters.Sepia);
        }
        if (adjustments.pixelate > 0) {
          filters.push(Konva.Filters.Pixelate);
          konvaImage.pixelSize(adjustments.pixelate);
        }
        if (adjustments.vignetteAmount > 0) {
          filters.push((Konva.Filters as any).Vignette);
          (konvaImage as any).vignetteAmount(adjustments.vignetteAmount);
          (konvaImage as any).vignetteMidpoint(adjustments.vignetteMidpoint ?? 50);
          (konvaImage as any).vignetteRoundness(adjustments.vignetteRoundness ?? 50);
        }
        if (adjustments.chromaticShift > 0) {
          filters.push((Konva.Filters as any).ChromaticAberration);
          (konvaImage as any).chromaticShift(adjustments.chromaticShift);
          (konvaImage as any).chromaticDirection(adjustments.chromaticDirection ?? 0);
        }

        if (filters.length > 0 && imgElement.complete) {
          konvaImage.filters(filters);
          try {
            konvaImage.cache();
          } catch (e) {
            console.warn('Image caching skipped:', e);
          }
        }

        node = konvaImage;
      } else if (layer.type === 'TEXT') {
        const textLayer = layer as TextLayer;
        node = new Konva.Text({
          id: layer.id,
          name: layer.name,
          text: textLayer.text,
          x: layer.x,
          y: layer.y,
          width: layer.width > 0 ? layer.width : undefined,
          fontSize: textLayer.fontSize,
          fontFamily: textLayer.fontFamily,
          fontStyle: `${textLayer.fontStyle} ${textLayer.fontWeight}`,
          fill: textLayer.fill,
          align: textLayer.align,
          lineHeight: textLayer.lineHeight,
          letterSpacing: textLayer.letterSpacing,
          rotation: layer.rotation,
          opacity: layer.opacity,
          visible: layer.visible,
          draggable: activeTool === 'move' && !layer.locked,
          listening: layer.visible,
          globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
        });
      } else if (layer.type === 'SHAPE') {
        const shapeLayer = layer as ShapeLayer;
        if (shapeLayer.shapeKind === 'rect' || shapeLayer.shapeKind === 'rounded-rect') {
          node = new Konva.Rect({
            id: layer.id,
            name: layer.name,
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height,
            fill: shapeLayer.fill,
            stroke: shapeLayer.stroke,
            strokeWidth: shapeLayer.strokeWidth,
            cornerRadius: shapeLayer.cornerRadius,
            rotation: layer.rotation,
            opacity: layer.opacity,
            visible: layer.visible,
            draggable: activeTool === 'move' && !layer.locked,
            listening: layer.visible,
            globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
          });
        } else if (shapeLayer.shapeKind === 'circle' || shapeLayer.shapeKind === 'ellipse') {
          node = new Konva.Ellipse({
            id: layer.id,
            name: layer.name,
            x: layer.x + layer.width / 2,
            y: layer.y + layer.height / 2,
            radiusX: Math.abs(layer.width / 2),
            radiusY: Math.abs(layer.height / 2),
            fill: shapeLayer.fill,
            stroke: shapeLayer.stroke,
            strokeWidth: shapeLayer.strokeWidth,
            rotation: layer.rotation,
            opacity: layer.opacity,
            visible: layer.visible,
            draggable: activeTool === 'move' && !layer.locked,
            listening: layer.visible,
            globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
          });
        } else if (shapeLayer.shapeKind === 'polygon') {
          node = new Konva.RegularPolygon({
            id: layer.id,
            name: layer.name,
            x: layer.x + layer.width / 2,
            y: layer.y + layer.height / 2,
            sides: shapeLayer.sides || 5,
            radius: Math.max(layer.width, layer.height) / 2,
            fill: shapeLayer.fill,
            stroke: shapeLayer.stroke,
            strokeWidth: shapeLayer.strokeWidth,
            rotation: layer.rotation,
            opacity: layer.opacity,
            visible: layer.visible,
            draggable: activeTool === 'move' && !layer.locked,
            listening: layer.visible,
            globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
          });
        } else if (shapeLayer.shapeKind === 'line') {
          node = new Konva.Line({
            id: layer.id,
            name: layer.name,
            x: layer.x,
            y: layer.y,
            points: [0, 0, layer.width, layer.height],
            stroke: shapeLayer.stroke || shapeLayer.fill,
            strokeWidth: shapeLayer.strokeWidth || 2,
            rotation: layer.rotation,
            opacity: layer.opacity,
            visible: layer.visible,
            draggable: activeTool === 'move' && !layer.locked,
            listening: layer.visible,
            globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
          });
        }

        if (node && shapeLayer.fillType === 'gradient' && shapeLayer.gradient) {
          try {
            const gradCanvas = renderShapeGradientCanvas(
              Math.max(1, shapeLayer.width),
              Math.max(1, shapeLayer.height),
              shapeLayer.gradient
            );
            (node as any).fillPriority('pattern');
            (node as any).fillPatternImage(gradCanvas);
            (node as any).fillPatternRepeat('no-repeat');
            if (shapeLayer.shapeKind === 'circle' || shapeLayer.shapeKind === 'ellipse' || shapeLayer.shapeKind === 'polygon') {
              (node as any).fillPatternOffset({ x: shapeLayer.width / 2, y: shapeLayer.height / 2 });
            } else {
              (node as any).fillPatternOffset({ x: 0, y: 0 });
            }
          } catch (err) {
            console.warn('Failed to render shape gradient canvas:', err);
          }
        }
      } else if (layer.type === 'PAINT') {
        const paintLayer = layer as PaintLayer;
        const group = new Konva.Group({
          id: layer.id,
          name: layer.name,
          x: layer.x,
          y: layer.y,
          rotation: layer.rotation,
          opacity: layer.opacity,
          visible: layer.visible,
          draggable: activeTool === 'move' && !layer.locked,
          listening: layer.visible,
          globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
        });

        if (paintLayer.dataUrl) {
          let imgElement = imageCacheRef.current.get(paintLayer.dataUrl);
          if (!imgElement) {
            imgElement = new window.Image();
            imgElement.crossOrigin = 'Anonymous';
            imgElement.src = paintLayer.dataUrl;
            imgElement.onload = () => {
              if (mainLayerRef.current) {
                mainLayerRef.current.batchDraw();
              }
            };
            imageCacheRef.current.set(paintLayer.dataUrl, imgElement);
          }
          const konvaImage = new Konva.Image({
            image: imgElement,
            x: 0,
            y: 0,
            width: layer.width,
            height: layer.height,
          });
          group.add(konvaImage);
        }

        paintLayer.paths.forEach((p) => {
          const line = new Konva.Line({
            points: p.points,
            stroke: p.color,
            strokeWidth: p.size,
            tension: 0.4,
            lineCap: 'round',
            lineJoin: 'round',
            globalCompositeOperation: p.isEraser ? 'destination-out' : 'source-over',
            opacity: p.opacity,
          });
          group.add(line);
        });

        node = group;
      }

      if (node) {
        // Apply layer mask if present and enabled
        if (layer.mask?.enabled && layer.mask.dataUrl) {
          const maskGroup = new Konva.Group({
            id: layer.id,
            name: layer.name,
            x: 0,
            y: 0,
            opacity: layer.opacity,
            visible: layer.visible,
            draggable: activeTool === 'move' && !layer.locked,
            listening: layer.visible,
            globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
          });

          // Reset the individual node's outer properties since the group handles them
          node.opacity(1);
          node.visible(true);
          node.draggable(false);
          node.setAttr('globalCompositeOperation', 'source-over');
          node.id('');
          maskGroup.add(node);

          // Load and apply mask image as a clipping layer
          let maskImg = imageCacheRef.current.get(`mask-${layer.id}`);
          if (!maskImg || maskImg.src !== layer.mask.dataUrl) {
            maskImg = new window.Image();
            maskImg.crossOrigin = 'Anonymous';
            maskImg.src = layer.mask.dataUrl;
            maskImg.onload = () => {
              if (mainLayerRef.current) mainLayerRef.current.batchDraw();
            };
            imageCacheRef.current.set(`mask-${layer.id}`, maskImg);
          }

          if (maskImg.complete && maskImg.naturalWidth > 0) {
            const maskNode = new Konva.Image({
              image: maskImg,
              x: 0,
              y: 0,
              width: doc.width,
              height: doc.height,
              globalCompositeOperation: 'destination-in',
            });
            maskGroup.add(maskNode);
          }

          node = maskGroup;
        }

        // Selection on click
        node.on('mousedown tap', (e) => {
          if (e.evt && 'button' in e.evt && (e.evt as MouseEvent).button === 2) {
            return;
          }
          if (activeTool === 'move') {
            e.cancelBubble = true;
            selectLayer(layer.id, e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey);
          }
        });

        // Context menu on right click
        node.on('contextmenu', (e) => {
          e.evt.preventDefault();
          e.cancelBubble = true;
          contextMenuHandledRef.current = true;
          openLayerMenu(layer.id, e.evt.clientX, e.evt.clientY, 'canvas');
        });

        // Record drag position start for undo
        let dragStartProps: any = null;
        node.on('dragstart', () => {
          dragStartProps = {
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height,
            rotation: layer.rotation,
          };
        });

        node.on('dragmove', () => {
          if (!snapEnabled) return;
          const nodeX = Math.round(node!.x());
          const nodeY = Math.round(node!.y());
          const otherLayers = layers
            .filter((l) => l.id !== layer.id && l.visible && !l.locked)
            .map((l) => ({ x: l.x, y: l.y, width: l.width, height: l.height, visible: l.visible, locked: l.locked }));

          const snapConfig: SnapConfig = {
            snapEnabled,
            snapThreshold,
            snapToGuides,
            snapToLayers,
            snapToDocumentBounds,
            snapToGrid,
          };

          const result = computeSnap(
            { x: nodeX, y: nodeY, width: layer.width, height: layer.height },
            otherLayers,
            { width: doc.width, height: doc.height },
            guides,
            snapConfig
          );

          node!.x(result.snappedX);
          node!.y(result.snappedY);
          setActiveSmartGuides(result.guides);
        });

        node.on('dragend', () => {
          if (!dragStartProps) return;
          clearSmartGuides();
          const newX = Math.round(node!.x());
          const newY = Math.round(node!.y());
          updateLayer(layer.id, { x: newX, y: newY });

          const cmd = new TransformLayerCommand(
            layer.id,
            dragStartProps,
            { ...dragStartProps, x: newX, y: newY }
          );
          executeCommand(cmd);
          dragStartProps = null;
        });

        mainLayer.add(node);
      }
    });

    // Bring transformer to top
    transformer.moveToTop();

    // Attach transformer to active node if move tool is active
    if (activeTool === 'move' && activeLayerId) {
      const activeNode = mainLayer.findOne(`#${activeLayerId}`);
      const activeLayer = layers.find((l) => l.id === activeLayerId);

      if (activeNode && activeLayer && !activeLayer.locked && activeLayer.visible) {
        transformer.nodes([activeNode]);

        let transformStartProps: any = null;
        transformer.off('transformstart');
        transformer.off('transformend');

        transformer.on('transformstart', () => {
          transformStartProps = {
            x: activeLayer.x,
            y: activeLayer.y,
            width: activeLayer.width,
            height: activeLayer.height,
            rotation: activeLayer.rotation,
          };
        });

        transformer.on('transformend', () => {
          if (!transformStartProps) return;
          const scaleX = activeNode.scaleX();
          const scaleY = activeNode.scaleY();
          activeNode.scaleX(1);
          activeNode.scaleY(1);

          const newWidth = Math.max(5, Math.round(activeNode.width() * scaleX));
          const newHeight = Math.max(5, Math.round(activeNode.height() * scaleY));
          const newX = Math.round(activeNode.x());
          const newY = Math.round(activeNode.y());
          const newRotation = Math.round(activeNode.rotation());

          const nextProps = {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            rotation: newRotation,
          };

          updateLayer(activeLayerId, nextProps);

          const cmd = new TransformLayerCommand(activeLayerId, transformStartProps, nextProps);
          executeCommand(cmd);
          transformStartProps = null;
        });
      } else {
        transformer.nodes([]);
      }
    } else {
      transformer.nodes([]);
    }

    mainLayer.batchDraw();
  }, [layers, activeLayerId, activeTool, doc]);

  // Stage Pointer Event Handlers (Drawing, Shapes, Eyedropper, Marquee)
  const handleStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      const mainLayer = mainLayerRef.current;
      if (!stage || !mainLayer) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const { x, y } = pointerPos;

      // Eyedropper tool
      if (activeTool === 'eyedropper') {
        const ctx = mainLayer.getCanvas().getContext();
        const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
        setForegroundColor(hex);
        return;
      }

      // Text tool: click to spawn new text layer
      if (activeTool === 'text') {
        const newTextLayer: TextLayer = {
          id: nanoid(),
          type: 'TEXT',
          name: `Text ${layers.length + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          x: Math.round(x),
          y: Math.round(y),
          width: 300,
          height: 50,
          rotation: 0,
          zIndex: layers.length,
          parentId: null,
          text: 'Double click to edit',
          fontFamily: options.text.fontFamily,
          fontSize: options.text.fontSize,
          fontWeight: options.text.fontWeight,
          fontStyle: options.text.fontStyle,
          fill: foregroundColor,
          align: options.text.align,
          lineHeight: options.text.lineHeight,
          letterSpacing: options.text.letterSpacing,
          underline: false,
        };

        const cmd = new AddLayerCommand(newTextLayer, 0);
        executeCommand(cmd);
        selectLayer(newTextLayer.id);
        return;
      }

      // Brush / Eraser tool
      if (activeTool === 'brush' || activeTool === 'eraser') {
        // Mask painting mode: when editing a mask, brush/eraser targets the mask canvas
        if (editingMaskLayerId) {
          const maskLayer = layers.find((l) => l.id === editingMaskLayerId);
          if (maskLayer?.mask) {
            isMaskPaintingRef.current = true;
            maskPreviousDataRef.current = maskLayer.mask.dataUrl;

            // Create or get offscreen mask canvas
            if (!maskCanvasRef.current) {
              maskCanvasRef.current = document.createElement('canvas');
            }
            const maskCanvas = maskCanvasRef.current;
            maskCanvas.width = doc!.width;
            maskCanvas.height = doc!.height;
            const mctx = maskCanvas.getContext('2d')!;

            // Draw existing mask
            const existingMaskImg = new window.Image();
            existingMaskImg.src = maskLayer.mask.dataUrl;
            existingMaskImg.onload = () => {
              mctx.drawImage(existingMaskImg, 0, 0);
            };
            if (existingMaskImg.complete) {
              mctx.drawImage(existingMaskImg, 0, 0);
            }

            // Set up brush for mask painting
            const isEraser = activeTool === 'eraser';
            const size = isEraser ? options.eraser.size : options.brush.size;
            // For masks: brush paints white (reveal), eraser paints black (hide)
            mctx.strokeStyle = isEraser ? '#000000' : '#ffffff';
            mctx.lineWidth = size;
            mctx.lineCap = 'round';
            mctx.lineJoin = 'round';
            mctx.beginPath();
            mctx.moveTo(x, y);

            // Also draw a visible preview on the Konva canvas
            const lineNode = new Konva.Line({
              points: [x, y],
              stroke: isEraser ? 'rgba(255,0,0,0.5)' : 'rgba(255,255,255,0.5)',
              strokeWidth: size,
              tension: 0.4,
              lineCap: 'round',
              lineJoin: 'round',
              opacity: 0.5,
            });
            activePaintLineNodeRef.current = lineNode;
            mainLayer.add(lineNode);
            mainLayer.batchDraw();

            currentPaintPathRef.current = {
              id: nanoid(),
              points: [x, y],
              color: isEraser ? '#000000' : '#ffffff',
              size,
              opacity: 1,
              isEraser: false,
            };
            isDrawingRef.current = true;
            return;
          }
        }

        isDrawingRef.current = true;
        const isEraser = activeTool === 'eraser';
        const size = isEraser ? options.eraser.size : options.brush.size;
        const opacity = isEraser ? options.eraser.opacity : options.brush.opacity;
        const color = foregroundColor;

        const path: PaintPath = {
          id: nanoid(),
          points: [x, y],
          color,
          size,
          opacity,
          isEraser,
        };
        currentPaintPathRef.current = path;

        // Render real-time stroke on Konva layer
        const lineNode = new Konva.Line({
          points: [x, y],
          stroke: color,
          strokeWidth: size,
          tension: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
          globalCompositeOperation: isEraser ? 'destination-out' : 'source-over',
          opacity,
        });
        activePaintLineNodeRef.current = lineNode;
        mainLayer.add(lineNode);
        mainLayer.batchDraw();
        return;
      }

      // Shape tools (rectangle, ellipse, polygon)
      if (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'polygon') {
        isCreatingShapeRef.current = true;
        shapeStartPosRef.current = { x, y };

        if (activeTool === 'rectangle') {
          const rect = new Konva.Rect({
            x,
            y,
            width: 0,
            height: 0,
            fill: options.shape.fill || foregroundColor,
            stroke: options.shape.stroke,
            strokeWidth: options.shape.strokeWidth,
            cornerRadius: options.shape.cornerRadius,
            dash: [4, 4],
          });
          previewShapeNodeRef.current = rect;
          mainLayer.add(rect);
        } else if (activeTool === 'ellipse') {
          const ellipse = new Konva.Ellipse({
            x,
            y,
            radiusX: 0,
            radiusY: 0,
            fill: options.shape.fill || foregroundColor,
            stroke: options.shape.stroke,
            strokeWidth: options.shape.strokeWidth,
            dash: [4, 4],
          });
          previewShapeNodeRef.current = ellipse;
          mainLayer.add(ellipse);
        }
        return;
      }

      // Marquee tool
      if (activeTool === 'marquee') {
        isSelectingMarqueeRef.current = true;
        marqueeStartPosRef.current = { x, y };
        setSelection({
          x,
          y,
          width: 0,
          height: 0,
          shape: options.marquee.shape,
        });
        return;
      }

      // Lasso tool: freehand selection
      if (activeTool === 'lasso') {
        isDrawingLassoRef.current = true;
        lassoPointsRef.current = [x, y];

        const lineNode = new Konva.Line({
          points: [x, y],
          stroke: '#ffffff',
          strokeWidth: 1,
          dash: [4, 4],
          closed: false,
          listening: false,
        });
        lassoPreviewLineRef.current = lineNode;
        mainLayer.add(lineNode);
        mainLayer.batchDraw();
        return;
      }

      // Magic Wand tool: click to select by color
      if (activeTool === 'magic-wand') {
        const canvas = mainLayer.getCanvas();
        const ctx = canvas.getContext();
        const imageData = ctx.getImageData(0, 0, doc!.width, doc!.height);
        const mask = floodFillSelect(
          imageData,
          Math.round(x),
          Math.round(y),
          options.magicWand.tolerance,
          options.magicWand.contiguous
        );

        const polygon = maskToPolygon(mask, doc!.width, doc!.height);
        if (polygon.length >= 6) {
          const bbox = maskToBoundingBox(mask, doc!.width, doc!.height);
          setSelection({
            x: bbox?.x || 0,
            y: bbox?.y || 0,
            width: bbox?.width || doc!.width,
            height: bbox?.height || doc!.height,
            shape: 'polygon',
            points: polygon,
          });
        } else {
          setSelection(null);
        }
        return;
      }

      // Gradient tool: click to begin drag
      if (activeTool === 'gradient') {
        isDrawingGradientRef.current = true;
        gradientStartPosRef.current = { x, y };

        const guideLine = new Konva.Line({
          points: [x, y, x, y],
          stroke: '#0078d4',
          strokeWidth: 2,
          dash: [4, 4],
          listening: false,
        });
        const startCircle = new Konva.Circle({
          x,
          y,
          radius: 4,
          fill: '#ffffff',
          stroke: '#0078d4',
          strokeWidth: 2,
          listening: false,
        });
        const endCircle = new Konva.Circle({
          x,
          y,
          radius: 4,
          fill: '#ffffff',
          stroke: '#0078d4',
          strokeWidth: 2,
          listening: false,
        });

        gradientGuideLineRef.current = guideLine;
        gradientStartCircleRef.current = startCircle;
        gradientEndCircleRef.current = endCircle;

        mainLayer.add(guideLine);
        mainLayer.add(startCircle);
        mainLayer.add(endCircle);
        mainLayer.batchDraw();
        return;
      }

      // Click on stage background with move tool: deselect
      if (activeTool === 'move' && e.target === stage) {
        selectLayer('');
      }
    },
    [
      activeTool,
      options,
      foregroundColor,
      backgroundColor,
      layers,
      executeCommand,
      selectLayer,
      setForegroundColor,
      setSelection,
      editingMaskLayerId,
      doc,
    ]
  );

  const handleStagePointerMove = useCallback(
    () => {
      const stage = stageRef.current;
      const mainLayer = mainLayerRef.current;
      if (!stage || !mainLayer) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const { x, y } = pointerPos;
      if (onPointerMove) {
        onPointerMove(Math.round(x), Math.round(y));
      }

      // Active Brush / Eraser drawing
      if (isDrawingRef.current && currentPaintPathRef.current && activePaintLineNodeRef.current) {
        const nextPoints = currentPaintPathRef.current.points.concat([x, y]);
        currentPaintPathRef.current.points = nextPoints;
        activePaintLineNodeRef.current.points(nextPoints);
        mainLayer.batchDraw();

        // Also draw on mask canvas if mask painting
        if (isMaskPaintingRef.current && maskCanvasRef.current) {
          const mctx = maskCanvasRef.current.getContext('2d')!;
          mctx.lineTo(x, y);
          mctx.stroke();
        }

        return;
      }

      // Active Shape drawing
      if (isCreatingShapeRef.current && shapeStartPosRef.current && previewShapeNodeRef.current) {
        const startX = shapeStartPosRef.current.x;
        const startY = shapeStartPosRef.current.y;
        const w = x - startX;
        const h = y - startY;

        if (activeTool === 'rectangle') {
          const rect = previewShapeNodeRef.current as Konva.Rect;
          rect.x(w < 0 ? x : startX);
          rect.y(h < 0 ? y : startY);
          rect.width(Math.abs(w));
          rect.height(Math.abs(h));
        } else if (activeTool === 'ellipse') {
          const ellipse = previewShapeNodeRef.current as Konva.Ellipse;
          ellipse.x(startX + w / 2);
          ellipse.y(startY + h / 2);
          ellipse.radiusX(Math.abs(w / 2));
          ellipse.radiusY(Math.abs(h / 2));
        }
        mainLayer.batchDraw();
        return;
      }

      // Active Lasso drawing
      if (isDrawingLassoRef.current && lassoPreviewLineRef.current) {
        lassoPointsRef.current.push(x, y);
        lassoPreviewLineRef.current.points(lassoPointsRef.current);
        mainLayer.batchDraw();
        return;
      }

      // Active Marquee selection
      if (isSelectingMarqueeRef.current && marqueeStartPosRef.current) {
        const startX = marqueeStartPosRef.current.x;
        const startY = marqueeStartPosRef.current.y;
        setSelection({
          x: Math.min(startX, x),
          y: Math.min(startY, y),
          width: Math.abs(x - startX),
          height: Math.abs(y - startY),
          shape: options.marquee.shape,
        });
      }

      // Active Gradient drag
      if (isDrawingGradientRef.current && gradientStartPosRef.current) {
        const startX = gradientStartPosRef.current.x;
        const startY = gradientStartPosRef.current.y;

        if (gradientGuideLineRef.current) {
          gradientGuideLineRef.current.points([startX, startY, x, y]);
        }
        if (gradientEndCircleRef.current) {
          gradientEndCircleRef.current.position({ x, y });
        }
        mainLayer.batchDraw();
        return;
      }
    },
    [activeTool, onPointerMove, options.marquee.shape, setSelection]
  );

  const handleStagePointerUp = useCallback(() => {
    const mainLayer = mainLayerRef.current;

    // Finish Mask painting stroke
    if (isMaskPaintingRef.current && maskCanvasRef.current && editingMaskLayerId) {
      isMaskPaintingRef.current = false;

      // Remove preview line
      if (activePaintLineNodeRef.current) {
        activePaintLineNodeRef.current.destroy();
        activePaintLineNodeRef.current = null;
      }

      const newDataUrl = maskCanvasRef.current.toDataURL('image/png');
      const cmd = new UpdateMaskDataCommand(
        editingMaskLayerId,
        maskPreviousDataRef.current,
        newDataUrl
      );
      executeCommand(cmd);

      currentPaintPathRef.current = null;
      isDrawingRef.current = false;
      return;
    }

    // Finish Brush / Eraser stroke
    if (isDrawingRef.current && currentPaintPathRef.current) {
      isDrawingRef.current = false;
      const finishedPath = currentPaintPathRef.current;
      currentPaintPathRef.current = null;

      // Remove temporary Konva line
      if (activePaintLineNodeRef.current) {
        activePaintLineNodeRef.current.destroy();
        activePaintLineNodeRef.current = null;
      }

      // Find if active layer is already a PaintLayer
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (activeLayer && activeLayer.type === 'PAINT' && !activeLayer.locked) {
        const paintLayer = activeLayer as PaintLayer;
        const nextPaths = [...paintLayer.paths, finishedPath];
        const cmd = new UpdateLayerPropertiesCommand(
          paintLayer.id,
          { paths: paintLayer.paths },
          { paths: nextPaths },
          'Brush Stroke'
        );
        executeCommand(cmd);
      } else {
        // Create new PaintLayer
        const newPaintLayer: PaintLayer = {
          id: nanoid(),
          type: 'PAINT',
          name: `Paint ${layers.length + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: doc?.width || 800,
          height: doc?.height || 600,
          rotation: 0,
          zIndex: layers.length,
          parentId: null,
          paths: [finishedPath],
        };
        const cmd = new AddLayerCommand(newPaintLayer, 0);
        executeCommand(cmd);
        selectLayer(newPaintLayer.id);
      }
      return;
    }

    // Finish Shape creation
    if (isCreatingShapeRef.current && shapeStartPosRef.current) {
      isCreatingShapeRef.current = false;
      if (previewShapeNodeRef.current) {
        previewShapeNodeRef.current.destroy();
        previewShapeNodeRef.current = null;
      }

      const stage = stageRef.current;
      const pointerPos = stage?.getPointerPosition();
      if (!pointerPos) return;

      const startX = shapeStartPosRef.current.x;
      const startY = shapeStartPosRef.current.y;
      const finalX = pointerPos.x;
      const finalY = pointerPos.y;
      shapeStartPosRef.current = null;

      const w = Math.abs(finalX - startX);
      const h = Math.abs(finalY - startY);

      if (w > 5 && h > 5) {
        const minX = Math.min(startX, finalX);
        const minY = Math.min(startY, finalY);

        const newShapeLayer: ShapeLayer = {
          id: nanoid(),
          type: 'SHAPE',
          name: `${activeTool === 'rectangle' ? 'Rectangle' : 'Ellipse'} ${layers.length + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(w),
          height: Math.round(h),
          rotation: 0,
          zIndex: layers.length,
          parentId: null,
          shapeKind: activeTool === 'rectangle' ? 'rect' : 'ellipse',
          fill: options.shape.fill || foregroundColor,
          stroke: options.shape.stroke,
          strokeWidth: options.shape.strokeWidth,
          cornerRadius: options.shape.cornerRadius,
          sides: options.shape.sides,
        };

        const cmd = new AddLayerCommand(newShapeLayer, 0);
        executeCommand(cmd);
        selectLayer(newShapeLayer.id);
      }
      if (mainLayer) mainLayer.batchDraw();
      return;
    }

    // Finish Lasso selection
    if (isDrawingLassoRef.current) {
      isDrawingLassoRef.current = false;

      // Destroy preview line
      if (lassoPreviewLineRef.current) {
        lassoPreviewLineRef.current.destroy();
        lassoPreviewLineRef.current = null;
      }

      const pts = lassoPointsRef.current;
      if (pts.length >= 6) {
        // Close the polygon
        pts.push(pts[0], pts[1]);

        // Compute bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < pts.length; i += 2) {
          if (pts[i] < minX) minX = pts[i];
          if (pts[i] > maxX) maxX = pts[i];
          if (pts[i + 1] < minY) minY = pts[i + 1];
          if (pts[i + 1] > maxY) maxY = pts[i + 1];
        }

        setSelection({
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(maxX - minX),
          height: Math.round(maxY - minY),
          shape: 'polygon',
          points: pts,
        });
      }
      lassoPointsRef.current = [];
      if (mainLayer) mainLayer.batchDraw();
      return;
    }

    // Finish Marquee selection
    if (isSelectingMarqueeRef.current) {
      isSelectingMarqueeRef.current = false;
      marqueeStartPosRef.current = null;
    }

    // Finish Gradient tool drag
    if (isDrawingGradientRef.current && gradientStartPosRef.current) {
      isDrawingGradientRef.current = false;
      const startX = gradientStartPosRef.current.x;
      const startY = gradientStartPosRef.current.y;
      gradientStartPosRef.current = null;

      // Clean up temporary guide nodes
      if (gradientGuideLineRef.current) {
        gradientGuideLineRef.current.destroy();
        gradientGuideLineRef.current = null;
      }
      if (gradientStartCircleRef.current) {
        gradientStartCircleRef.current.destroy();
        gradientStartCircleRef.current = null;
      }
      if (gradientEndCircleRef.current) {
        gradientEndCircleRef.current.destroy();
        gradientEndCircleRef.current = null;
      }

      const stage = stageRef.current;
      const pointerPos = stage?.getPointerPosition();
      const endX = pointerPos ? pointerPos.x : startX;
      const endY = pointerPos ? pointerPos.y : startY;

      const gradOpts = options.gradient || DEFAULT_GRADIENT_OPTIONS;
      const stops = resolveGradientStops(
        gradOpts.presetId,
        foregroundColor,
        backgroundColor,
        gradOpts.stops
      );

      // Check if minimum drag threshold is met (if < 3px, expand slightly so gradient has dimension)
      let finalEndX = endX;
      let finalEndY = endY;
      const distSq = (finalEndX - startX) ** 2 + (finalEndY - startY) ** 2;
      if (distSq < 9) {
        finalEndX = startX + 100;
        finalEndY = startY;
      }

      const activeLayer = layers.find((l) => l.id === activeLayerId);

      // If active layer is SHAPE: apply gradient fill to the shape!
      if (activeLayer && activeLayer.type === 'SHAPE' && !activeLayer.locked) {
        const shapeLayer = activeLayer as ShapeLayer;
        const localStartX = startX - shapeLayer.x;
        const localStartY = startY - shapeLayer.y;
        const localEndX = finalEndX - shapeLayer.x;
        const localEndY = finalEndY - shapeLayer.y;

        const nextGradient = {
          type: gradOpts.type,
          presetId: gradOpts.presetId,
          stops,
          reverse: gradOpts.reverse,
          opacity: gradOpts.opacity,
          startX: localStartX,
          startY: localStartY,
          endX: localEndX,
          endY: localEndY,
        };

        const cmd = new UpdateLayerPropertiesCommand(
          shapeLayer.id,
          { fillType: shapeLayer.fillType, gradient: shapeLayer.gradient },
          { fillType: 'gradient', gradient: nextGradient },
          'Shape Gradient Fill'
        );
        executeCommand(cmd);
        if (mainLayer) mainLayer.batchDraw();
        return;
      }

      // Otherwise, draw gradient on active paint layer or create new paint layer
      const canvasW = doc?.width || 800;
      const canvasH = doc?.height || 600;

      // Render the gradient canvas
      const gradCanvas = renderGradientCanvas(
        canvasW,
        canvasH,
        startX,
        startY,
        finalEndX,
        finalEndY,
        gradOpts.type,
        stops,
        gradOpts.reverse,
        gradOpts.opacity
      );

      // If selection exists, clip the gradient into the selection
      let finalCanvas = gradCanvas;
      const selection = useSelectionStore.getState().selection;
      if (selection && selection.width > 0 && selection.height > 0) {
        const clippedCanvas = document.createElement('canvas');
        clippedCanvas.width = canvasW;
        clippedCanvas.height = canvasH;
        const cctx = clippedCanvas.getContext('2d');
        if (cctx) {
          cctx.save();
          cctx.beginPath();
          if (selection.shape === 'rect') {
            cctx.rect(selection.x, selection.y, selection.width, selection.height);
          } else if (selection.shape === 'ellipse') {
            cctx.ellipse(
              selection.x + selection.width / 2,
              selection.y + selection.height / 2,
              selection.width / 2,
              selection.height / 2,
              0,
              0,
              Math.PI * 2
            );
          } else if (selection.shape === 'polygon' && selection.points && selection.points.length >= 6) {
            cctx.moveTo(selection.points[0], selection.points[1]);
            for (let i = 2; i < selection.points.length; i += 2) {
              cctx.lineTo(selection.points[i], selection.points[i + 1]);
            }
            cctx.closePath();
          }
          cctx.clip();
          cctx.drawImage(gradCanvas, 0, 0);
          cctx.restore();
          finalCanvas = clippedCanvas;
        }
      }

      const gradientDataUrl = finalCanvas.toDataURL('image/png');

      // If active layer is a PAINT layer and not locked: composite onto it
      if (activeLayer && activeLayer.type === 'PAINT' && !activeLayer.locked) {
        const paintLayer = activeLayer as PaintLayer;

        const blendCanvas = document.createElement('canvas');
        blendCanvas.width = paintLayer.width || canvasW;
        blendCanvas.height = paintLayer.height || canvasH;
        const bctx = blendCanvas.getContext('2d');

        const finishPaintLayerUpdate = (mergedDataUrl: string) => {
          const cmd = new UpdateLayerPropertiesCommand(
            paintLayer.id,
            { dataUrl: paintLayer.dataUrl, paths: paintLayer.paths },
            { dataUrl: mergedDataUrl, paths: [] },
            'Gradient'
          );
          executeCommand(cmd);
          if (mainLayer) mainLayer.batchDraw();
        };

        if (bctx && paintLayer.dataUrl) {
          const existingImg = new window.Image();
          existingImg.crossOrigin = 'Anonymous';
          existingImg.onload = () => {
            bctx.drawImage(existingImg, 0, 0);
            bctx.drawImage(finalCanvas, 0, 0);
            finishPaintLayerUpdate(blendCanvas.toDataURL('image/png'));
          };
          existingImg.onerror = () => {
            bctx.drawImage(finalCanvas, 0, 0);
            finishPaintLayerUpdate(blendCanvas.toDataURL('image/png'));
          };
          existingImg.src = paintLayer.dataUrl;
        } else if (bctx) {
          bctx.drawImage(finalCanvas, 0, 0);
          finishPaintLayerUpdate(blendCanvas.toDataURL('image/png'));
        } else {
          finishPaintLayerUpdate(gradientDataUrl);
        }
      } else {
        // Create new PaintLayer with the gradient
        const newPaintLayer: PaintLayer = {
          id: nanoid(),
          type: 'PAINT',
          name: `Gradient ${layers.length + 1}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: canvasW,
          height: canvasH,
          rotation: 0,
          zIndex: layers.length,
          parentId: null,
          paths: [],
          dataUrl: gradientDataUrl,
        };
        const cmd = new AddLayerCommand(newPaintLayer, 0);
        executeCommand(cmd);
        selectLayer(newPaintLayer.id);
      }

      if (mainLayer) mainLayer.batchDraw();
      return;
    }
  }, [
    layers,
    activeLayerId,
    doc?.width,
    doc?.height,
    activeTool,
    options.shape,
    options.gradient,
    foregroundColor,
    backgroundColor,
    executeCommand,
    selectLayer,
    editingMaskLayerId,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${doc?.width || 800}px`,
        height: `${doc?.height || 600}px`,
        position: 'relative',
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (contextMenuHandledRef.current) {
          contextMenuHandledRef.current = false;
          return;
        }
        const stage = stageRef.current;
        const pointerPos = stage?.getPointerPosition();
        openCanvasMenu(
          e.clientX,
          e.clientY,
          pointerPos ? { x: Math.round(pointerPos.x), y: Math.round(pointerPos.y) } : undefined
        );
      }}
      onMouseDown={(e) => {
        if (e.button === 2) return;
        // Convert to stage pointer down
        const stage = stageRef.current;
        if (stage) {
          stage.setPointersPositions(e.nativeEvent);
          handleStagePointerDown({} as any);
        }
      }}
      onMouseMove={(e) => {
        const stage = stageRef.current;
        if (stage) {
          stage.setPointersPositions(e.nativeEvent);
          handleStagePointerMove();
        }
      }}
      onMouseUp={() => handleStagePointerUp()}
      onTouchStart={(e) => {
        const stage = stageRef.current;
        if (stage) {
          stage.setPointersPositions(e.nativeEvent);
          handleStagePointerDown({} as any);
        }
      }}
      onTouchMove={(e) => {
        const stage = stageRef.current;
        if (stage) {
          stage.setPointersPositions(e.nativeEvent);
          handleStagePointerMove();
        }
      }}
      onTouchEnd={() => handleStagePointerUp()}
    >
      <EditorContextMenu
        contextMenu={contextMenu}
        onClose={closeMenu}
      />
    </div>
  );
};
