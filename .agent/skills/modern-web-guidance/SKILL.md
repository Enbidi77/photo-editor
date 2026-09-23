---
name: modern-web-guidance
description: Guide for utilizing modern native web platform features, HTML5 APIs, CSS primitives, and browser performance standards to eliminate bloat and legacy polyfills.
---

# Modern Web Platform Guidance & Best Practices

This skill guides the implementation of modern, native web platform APIs and modern CSS standards to build lightweight, accessible, high-performance web applications without legacy polyfill bloat.

---

## 1. Native UI: Popover & Dialog APIs

Rather than importing heavy tooltip or popup portal packages, use the web platform's built-in top-layer primitives:

### Popover API (Contextual Toolbars & Color Pickers):
```html
<!-- Trigger button -->
<button popovertarget="color-picker-menu">Select Color</button>

<!-- Popover panel (automatically opens in top layer, handles light dismiss & ESC) -->
<div id="color-picker-menu" popover>
  <div class="palette">
    <!-- Color swatches -->
  </div>
</div>
```

```css
/* Style backdrop and entry animation */
[popover] {
  margin: auto;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

[popover]:popover-open {
  opacity: 1;
  transform: scale(1);
}
```

---

## 2. Modern CSS Layout & Color Spaces

### Container Queries for Responsive Editor Panels
Allow toolbars and sidebars to adapt their layout to their own container width, rather than the global viewport:

```css
.sidebar-panel {
  container-type: inline-size;
  container-name: sidebar;
}

/* Switch from grid to compact list when sidebar shrinks below 240px */
@container sidebar (max-width: 240px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
}
```

### Modern Color Spaces (`oklch` & `color-mix`):
* Use `oklch()` for uniform perceptual lightness across hue shifts (crucial for color pickers, tinting, and contrast calculations).
* Use `color-mix()` for creating tints and opacity blends without hardcoding hex values:
  ```css
  .layer-item.active {
    background-color: color-mix(in srgb, var(--primary-color) 15%, transparent);
  }
  ```

---

## 3. High-Performance File & Canvas APIs

### File System Access API
Allow users to directly open, edit, and save files to their local disk without repeated download prompts:

```typescript
// Open image directly from disk
export async function openImageFile(): Promise<File | null> {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Images',
            accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
          },
        ],
      });
      return await handle.getFile();
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }
  // Fallback to standard input element
  return null;
}
```

### Yielding to the Main Thread with `scheduler.yield()`
Long image processing tasks (such as exporting a 4K canvas or computing histograms) can freeze the UI and degrade Interaction to Next Paint (INP). Break long tasks apart:

```typescript
export async function processLargeDatasetInChunks<T>(
  items: T[],
  processItem: (item: T) => void,
  chunkSize = 1000
) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    if (i % chunkSize === 0 && 'scheduler' in window && 'yield' in (window as any).scheduler) {
      await (window as any).scheduler.yield();
    }
  }
}
```

### OffscreenCanvas in Web Workers
Offload heavy raster operations (e.g. Gaussian blur, unsharp mask, bilateral filter) to a Web Worker using `OffscreenCanvas` to keep the main UI running at a silky 60fps.
