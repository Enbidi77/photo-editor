---
name: canvas-konva-graphics
description: Expert guidance on HTML5 Canvas and Konva.js rendering architectures, non-destructive image filters, layer hierarchies, zoom/pan transforms, coordinate systems, caching, and memory management for photo editors.
---

# Canvas & Konva.js Graphics Architecture Guide

This skill provides expert patterns and architectural best practices for building high-performance photo and graphics editors with HTML5 Canvas and Konva.js.

---

## 1. Stage and Layer Architecture

A photo editor must separate concerns across independent layers to prevent unnecessary repainting:

```
Konva.Stage
├── Background/Checkerboard Layer (Static canvas background, transparent grid)
├── Document Canvas Layer (Clipping area defining the document dimensions)
│   ├── Image Layer (Base photo / imported images)
│   ├── Vector/Adjustment Layers (Drawings, shapes, text, masks)
│   └── Filter Layer (Raster effects applied to layers)
├── Overlay Layer (Crop rectangles, guides, alignment rulers)
└── Transformer/Selection Layer (Konva.Transformer, bounding box handles)
```

### Best Practices:
* **Never combine active interactive elements on the same layer as heavy images**: Repainting a 24MP image layer when moving a selection box or cursor causes severe frame drops.
* Keep `Konva.Transformer` on a dedicated top-level layer with `listening: true`.
* Disable event listening (`listening: false`) on static background layers.

---

## 2. Coordinate System Mapping

Canvas viewports involve three coordinate spaces:
1. **Screen / Pointer Space**: Raw client pixels from DOM mouse/touch events (`e.clientX`, `e.clientY`).
2. **Stage Space**: Coordinates relative to the Konva Stage container, affected by stage position (`stage.x()`, `stage.y()`) and scale (`stage.scaleX()`).
3. **Document / Layer Space**: Logical coordinates within the user's artwork.

### Accurate Pointer Coordinate Conversion:
```typescript
export function getRelativePointerPosition(stage: Konva.Stage) {
  const pointerPosition = stage.getPointerPosition();
  if (!pointerPosition) return null;

  const transform = stage.getAbsoluteTransform().copy();
  // Invert the transform matrix to convert screen coordinates to local stage space
  transform.invert();

  return transform.point(pointerPosition);
}
```

### Zoom-to-Point Implementation:
When zooming with the mouse wheel, zoom relative to the pointer position rather than the top-left corner:
```typescript
export function zoomStageToPoint(
  stage: Konva.Stage,
  pointer: { x: number; y: number },
  direction: 'in' | 'out',
  scaleFactor = 1.1
) {
  const oldScale = stage.scaleX();
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const newScale = direction === 'in' ? oldScale * scaleFactor : oldScale / scaleFactor;
  // Clamp zoom range (e.g. 5% to 3200%)
  const clampedScale = Math.min(Math.max(newScale, 0.05), 32);

  stage.scale({ x: clampedScale, y: clampedScale });
  stage.position({
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  });
  stage.batchDraw();
}
```

---

## 3. Non-Destructive Image Filters Pipeline

To maintain high visual fidelity and allow undoing/editing filters without degrading image quality:

1. **Keep the Source Image Untouched**: Always retain the pristine original `HTMLImageElement` or offscreen canvas buffer in memory.
2. **Apply Filters Non-Destructively**:
   - In Konva, apply filters using `node.filters([Konva.Filters.Brighten, Konva.Filters.Contrast])`.
   - Always call `node.cache()` before filters will render!
   - When filter parameters change (e.g., brightness value adjusted), call `node.clearCache()` or re-run `node.cache()` and `layer.batchDraw()`.
3. **Custom Pixel Filter Shader (2D Convolutions & LUTs)**:
```typescript
import Konva from 'konva';

// Custom Warmth / Temperature filter example
Konva.Filters.Temperature = function (imageData: ImageData) {
  const data = imageData.data;
  const nPixels = data.length;
  const kelvin = this.temperature() || 0; // range -100 to 100

  const rFactor = 1 + kelvin * 0.003;
  const bFactor = 1 - kelvin * 0.003;

  for (let i = 0; i < nPixels; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] * rFactor));     // Red
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * bFactor)); // Blue
  }
};
```

---

## 4. Performance & Memory Management (Large Images)

High-resolution photos (e.g., 4000x3000 = 12 million pixels = ~48MB raw uncompressed RGBA per canvas buffer) can easily cause mobile and desktop browsers to crash (Out of Memory).

### Critical Rules:
* **Cache Resolution Scaling**: By default, `node.cache()` caches at 1:1 or `devicePixelRatio`. For large images, explicitly cap cache pixel ratio:
  ```typescript
  node.cache({ pixelRatio: Math.min(window.devicePixelRatio, 2) });
  ```
* **Disposing Deleted Nodes**: When removing an image or layer:
  ```typescript
  node.clearCache();
  node.destroy(); // Properly frees event listeners and canvas references
  ```
* **Revoking Object URLs**: Always call `URL.revokeObjectURL(blobUrl)` as soon as the image `onload` event fires.
* **Batch Drawing**: NEVER call `layer.draw()` directly inside mousemove or animation loops. ALWAYS use `layer.batchDraw()` to coalesce render passes to the browser's `requestAnimationFrame`.

---

## 5. State Synchronization with Zustand / Immer

1. Store canonical document state (layer hierarchy, transforms, filter settings) in Zustand stores.
2. Let Konva render based on state, but during continuous dragging/transforming, avoid triggering React state updates on every 60fps tick.
3. Update local Konva node transforms during `onDragMove` / `onTransform`, and commit final values to Zustand in `onDragEnd` / `onTransformEnd`. This keeps the undo/redo history clean.
