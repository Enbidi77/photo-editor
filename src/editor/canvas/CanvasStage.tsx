'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import Konva from 'konva';
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
  const { layers, activeLayerId, selectLayer, updateLayer } = useLayerStore();
  const { activeTool, options, foregroundColor, setForegroundColor } = useToolStore();
  const { executeCommand } = useHistoryStore();
  const { setSelection } = useSelectionStore();

  // Active interaction refs
  const isDrawingRef = useRef(false);
  const currentPaintPathRef = useRef<PaintPath | null>(null);
  const activePaintLineNodeRef = useRef<Konva.Line | null>(null);

  const isCreatingShapeRef = useRef(false);
  const shapeStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const previewShapeNodeRef = useRef<Konva.Shape | null>(null);

  const isSelectingMarqueeRef = useRef(false);
  const marqueeStartPosRef = useRef<{ x: number; y: number } | null>(null);

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
          listening: !layer.locked,
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
          listening: !layer.locked,
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
            listening: !layer.locked,
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
            listening: !layer.locked,
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
            listening: !layer.locked,
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
            listening: !layer.locked,
            globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
          });
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
          listening: !layer.locked,
          globalCompositeOperation: layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as any),
        });

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
        // Selection on click
        node.on('mousedown tap', (e) => {
          if (activeTool === 'move') {
            e.cancelBubble = true;
            selectLayer(layer.id, e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey);
          }
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

        node.on('dragend', () => {
          if (!dragStartProps) return;
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

      // Click on stage background with move tool: deselect
      if (activeTool === 'move' && e.target === stage) {
        selectLayer('');
      }
    },
    [
      activeTool,
      options,
      foregroundColor,
      layers,
      executeCommand,
      selectLayer,
      setForegroundColor,
      setSelection,
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
    },
    [activeTool, onPointerMove, options.marquee.shape, setSelection]
  );

  const handleStagePointerUp = useCallback(() => {
    const mainLayer = mainLayerRef.current;

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

    // Finish Marquee selection
    if (isSelectingMarqueeRef.current) {
      isSelectingMarqueeRef.current = false;
      marqueeStartPosRef.current = null;
    }
  }, [
    layers,
    activeLayerId,
    doc?.width,
    doc?.height,
    activeTool,
    options.shape,
    foregroundColor,
    executeCommand,
    selectLayer,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${doc?.width || 800}px`,
        height: `${doc?.height || 600}px`,
        position: 'relative',
      }}
      onMouseDown={(e) => {
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
    />
  );
};
