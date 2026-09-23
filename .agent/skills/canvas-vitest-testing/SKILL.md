---
name: canvas-vitest-testing
description: Comprehensive testing strategies for HTML5 Canvas, Konva, and Zustand state in Vitest and jsdom environments without requiring a real GPU or display server.
---

# Canvas & Graphics Testing with Vitest

This skill provides practical recipes for testing canvas-heavy photo editor applications using Vitest and jsdom.

---

## 1. Mocking HTML5 Canvas in JSDOM

`jsdom` provides a stub `HTMLCanvasElement`, but its `getContext('2d')` returns `null` by default unless mocked or polyfilled.

### Clean 2D Context Mock Helper:
Add or import this setup when testing components or utilities that interact with canvas contexts:

```typescript
// tests/setup/mockCanvas.ts
import { vi } from 'vitest';

export function setupCanvasMock() {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (contextId: string) {
    if (contextId === '2d') {
      return {
        canvas: this,
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4 * 100 * 100),
          width: 100,
          height: 100,
        })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4 * 100 * 100),
          width: 100,
          height: 100,
        })),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        measureText: vi.fn(() => ({ width: 50, height: 12 })),
      } as unknown as CanvasRenderingContext2D;
    }
    return originalGetContext.call(this, contextId as any);
  };
}
```

---

## 2. Unit Testing Zustand Stores in Isolation

Never test Zustand state by clicking around rendered canvas elements when a pure state test is 100x faster and more deterministic.

### Pattern: Testing `historyStore` Undo/Redo
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '@/store/historyStore';

describe('historyStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useHistoryStore.setState({
      past: [],
      present: null,
      future: [],
    });
  });

  it('records an action and invalidates future on new mutations', () => {
    const { pushAction, undo, canUndo, canRedo } = useHistoryStore.getState();

    pushAction({ id: 'action-1', description: 'Add Layer' });
    expect(canUndo()).toBe(true);
    expect(canRedo()).toBe(false);

    undo();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(true);

    // New action should clear the redo stack
    pushAction({ id: 'action-2', description: 'Change Opacity' });
    expect(canRedo()).toBe(false);
  });
});
```

---

## 3. Testing Pure Math & Coordinate Transformations

Coordinate calculations (screen to stage, zoom clamping, aspect ratio fitting) must be pure functions with 100% test coverage:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateFitDimensions } from '@/editor/canvas/viewportUtils';

describe('calculateFitDimensions', () => {
  it('correctly fits landscape image in square container', () => {
    const result = calculateFitDimensions({
      imageWidth: 1920,
      imageHeight: 1080,
      containerWidth: 800,
      containerHeight: 800,
    });

    expect(result.width).toBe(800);
    expect(result.height).toBe(450);
  });

  it('correctly fits portrait image in landscape container', () => {
    const result = calculateFitDimensions({
      imageWidth: 1000,
      imageHeight: 2000,
      containerWidth: 1200,
      containerHeight: 800,
    });

    expect(result.height).toBe(800);
    expect(result.width).toBe(400);
  });
});
```

---

## 4. Testing Filter Algorithms

When testing image filters, assert input vs output pixel byte transformations on small, predictable byte arrays:

```typescript
import { describe, it, expect } from 'vitest';
import { applyInvertFilter } from '@/editor/filters/invert';

describe('applyInvertFilter', () => {
  it('inverts RGB channels while preserving alpha', () => {
    // 1 pixel with RGBA [100, 150, 200, 255]
    const pixelData = new Uint8ClampedArray([100, 150, 200, 255]);
    const mockImageData = { data: pixelData, width: 1, height: 1 } as ImageData;

    applyInvertFilter(mockImageData);

    expect(pixelData[0]).toBe(155); // 255 - 100
    expect(pixelData[1]).toBe(105); // 255 - 150
    expect(pixelData[2]).toBe(55);  // 255 - 200
    expect(pixelData[3]).toBe(255); // Alpha remains untouched
  });
});
```
