# PixelForge — Professional Photoshop-Like Web Image Editor

PixelForge is a production-quality, browser-based desktop image editor built with **Next.js (App Router)**, **TypeScript**, **MUI**, **Zustand**, and **Konva.js**. Its interaction patterns, workspace organization, terminology, shortcuts, and editing workflow are designed to feel immediately familiar to experienced Adobe Photoshop users.

---

## Key Features

- **Photoshop-Familiar Information Architecture**:
  - Application Menu Bar (File, Edit, Image, Layer, Select, Filter, View, Window, Help)
  - Contextual Options Bar dynamically updating according to the active tool
  - Compact Left Toolbar with 18 tools and keyboard shortcuts
  - Infinite-feeling Canvas Workspace with centered artboard, transparency checkerboard, and shadow
  - Precision Horizontal & Vertical Rulers with cursor tracking indicators and drag-to-create guides
  - Collapsible, tabbed Right Panel Dock (Layers, Properties, History, Navigator, Color, Brushes, Character)
  - Bottom Status Bar with document dimensions, zoom percentage dropdown, cursor coordinates, and tool contextual hints

- **Professional Toolset**:
  - **Move Tool (V)**: 8-handle transformer, rotation, shift-constrained aspect ratio, alt-center scaling, coordinate nudge
  - **Brush Tool (B)**: Freehand painting engine with size, hardness, opacity, and flow controls
  - **Eraser Tool (E)**: Non-destructive erasure on paint layers
  - **Text Tool (T)**: Full typography support (font family, size, weight, italic, alignment, line height, letter spacing, color)
  - **Shape Tool (U)**: Rectangles, rounded rectangles, ellipses, and polygons with fill, stroke, stroke width, and corner radius
  - **Eyedropper Tool (I)**: Pixel-perfect color sampling directly into foreground swatch
  - **Crop Tool (C)**: Rule-of-thirds grid overlay with aspect presets (Free, 1:1, 16:9, 4:3, 9:16), commit (Enter) and cancel (Esc)
  - **Marquee Tool (M)**: Rectangular and elliptical selection with animated marching-ants border
  - **Hand Tool (H) & Zoom Tool (Z)**: Spacebar temporary pan, mouse-wheel cursor-centered zooming

- **Non-Destructive Layer System**:
  - Multi-layer stack with image, text, shape, paint, and adjustment layers
  - Opacity slider (0 - 100%) and 16 blend modes (Normal, Multiply, Screen, Overlay, etc.)
  - Visibility toggles (eye), lock toggles (lock), drag/button reordering (Bring Forward, Send Backward, Bring to Front, Send to Back)
  - Duplicate layer (`Ctrl+J`) and inline double-click renaming

- **Image Adjustments & Composable Filters**:
  - Tonal balance adjustments: Brightness, Contrast, Saturation, Exposure, Hue
  - Composable filters: Gaussian Blur, Sharpen, Black & White (Grayscale), Sepia, Invert Colors, Add Noise, Pixelate/Mosaic

- **History & Command Pattern (Undo/Redo)**:
  - Command pattern with `execute()` and `undo()` for every meaningful editor action
  - Time-travel History Panel allowing users to jump back and forward to any state
  - Global hotkeys: `Ctrl/Cmd + Z` (Undo), `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` (Redo)

- **Storage, Project Files & Export**:
  - Native `.pxf` (PixelForge Project) JSON file format supporting project save and load
  - IndexedDB persistence for project auto-saving and Recent Projects library
  - Multi-format exporter: PNG (with transparency), JPEG, and WEBP with quality slider and 0.5x to 4x resolution multipliers
  - Image import via file picker, drag-and-drop onto canvas, or clipboard paste (`Ctrl+V`)

- **Command Palette & Accessibility**:
  - Searchable Command Palette (`Ctrl/Cmd + K`)
  - Centralized Keyboard Shortcut Registry & Cheat Sheet Dialog (`?`)

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15+ (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **UI Library** | MUI (Material-UI v6) with Emotion & Lucide Icons |
| **State Management** | Zustand (Modular domain slices) |
| **Canvas Engine** | Konva.js (Hardware-accelerated 2D canvas with multi-handle Transformer) |
| **Data & Storage** | TanStack Query, IndexedDB (`idb`), ProjectRepository pattern |
| **Utilities** | nanoid, date-fns, clsx, file-saver, lodash-es |
| **Testing** | Vitest, React Testing Library, JSDOM |

---

## Architecture Overview

```text
src/
├── app/                        # Next.js App Router (page.tsx, layout.tsx, editor/page.tsx)
├── theme/                      # Photoshop dark tokens (#181818, #202020, #252525) & MUI theme
├── types/                      # Domain interfaces (document, layer, tools, history, project, filters)
├── store/                      # Zustand slices
│   ├── documentStore.ts        # Document meta & dimensions
│   ├── layerStore.ts           # Layers stack, active selection, reordering, opacity, blend
│   ├── toolStore.ts            # Active tool, options, foreground/background color swatches
│   ├── viewStore.ts            # Zoom (%, fit, scale), pan offsets, rulers, guides, grid
│   ├── historyStore.ts         # Undo/redo command stacks & chronological history
│   ├── uiStore.ts              # Active panels, sidebar collapse, active dialogs, toast alerts
│   └── selectionStore.ts       # Marquee selection area & feather
├── editor/
│   ├── canvas/                 # Konva Stage, Viewport, Rulers, GuidesOverlay, CropOverlay, MarqueeOverlay
│   ├── commands/               # Command pattern classes (AddLayer, DeleteLayer, Transform, Opacity, Crop, etc.)
│   └── export/                 # Exporter (PNG/JPG/WEBP) & PxfSerializer (.pxf pack/unpack)
├── components/
│   ├── layout/                 # EditorShell, TopMenuBar, OptionsBar, DocumentTabs, StatusBar
│   ├── toolbar/                # ToolBar & ToolButton
│   ├── panels/                 # LayersPanel, PropertiesPanel, HistoryPanel, NavigatorPanel, ColorPanel, BrushesPanel, CharacterPanel
│   ├── dialogs/                # NewDocumentDialog, ExportDialog, ShortcutsDialog, FiltersDialog, AdjustmentsDialog
│   ├── common/                 # CommandPalette, ToastNotification
│   └── home/                   # StartScreen (Recent Projects & Document Launcher)
└── lib/
    ├── storage/                # IndexedDB wrapper & ProjectRepository
    ├── keyboard/               # Centralized shortcut registry & input filter
    └── image/                  # ImageLoader & clipboard reader
```

---

## State Management

PixelForge isolates high-frequency canvas interactions from global UI state:
- **Zustand Stores**: Hold the single source of truth for the document structure, layer tree, active selections, and tools.
- **Local Interaction Loops**: While dragging transform handles, drawing brush lines, or panning, coordinates update smoothly via requestAnimationFrame / native event targets, committing clean `ICommand` instances on mouse-up. This guarantees a 60 FPS editing experience without React reconciliation bottlenecks.

---

## Layer Model

Layers are represented as typed interfaces extending `BaseLayer`:

```typescript
export interface BaseLayer {
  id: string;
  type: 'IMAGE' | 'TEXT' | 'SHAPE' | 'PAINT' | 'ADJUSTMENT' | 'GROUP';
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  zIndex: number;
  parentId: string | null;
}
```

Specific subtypes (`ImageLayer`, `TextLayer`, `ShapeLayer`, `PaintLayer`) carry specialized metadata:
- `ImageLayer`: includes `imageUrl`, natural dimensions, and non-destructive `ImageAdjustments` (brightness, contrast, saturation, blur, noise, grayscale, invert, sepia, pixelate).
- `TextLayer`: includes font family, size, weight, style, line height, tracking, fill color, and text content.
- `ShapeLayer`: includes geometry kind (rect, rounded-rect, ellipse, polygon, line), fill color, stroke color, stroke width, and corner radius.
- `PaintLayer`: contains an array of `PaintPath` strokes for freehand brush and eraser drawing.

---

## History & Command Model

All non-destructive editing actions implement the `ICommand` interface:

```typescript
export interface ICommand {
  id: string;
  label: string;
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
}
```

Executing an `ICommand` via `useHistoryStore.getState().executeCommand(cmd)` executes the change, pushes it to the undo stack, clears any divergent redo branch, and records an entry in the History panel. Pressing `Ctrl+Z` calls `cmd.undo()`.

---

## Project Format (`.pxf`)

A `.pxf` file is a JSON document bundling document metadata and the complete layer stack:

```json
{
  "version": 1,
  "id": "proj-uuid",
  "document": {
    "id": "doc-uuid",
    "name": "Artwork",
    "width": 1920,
    "height": 1080,
    "resolution": 72,
    "backgroundColor": "#ffffff",
    "colorMode": "RGB"
  },
  "layers": [ ... ],
  "thumbnail": "data:image/jpeg;base64,...",
  "createdAt": 1726920000000,
  "updatedAt": 1726920000000
}
```

---

## Extending PixelForge

### 1. Adding a New Tool
1. Add the tool ID to `ToolType` in `src/types/tools.ts`.
2. Register the tool button and keyboard shortcut in `src/components/toolbar/ToolBar.tsx` and `src/lib/keyboard/shortcutRegistry.ts`.
3. Add any custom tool options to `ToolOptions` in `src/types/tools.ts` and render controls in `src/components/layout/OptionsBar.tsx`.
4. Handle pointer down/move/up events in `src/editor/canvas/CanvasStage.tsx`.

### 2. Adding a New Filter
1. Add the filter ID and metadata to `src/types/filters.ts`.
2. Add adjustment properties to `ImageAdjustments` in `src/types/layer.ts`.
3. Add the filter execution logic in `src/editor/canvas/CanvasStage.tsx` using Konva's filter engine or a custom shader / worker.
4. Add the menu item in `src/components/layout/TopMenuBar.tsx` and slider in `src/components/dialogs/FiltersDialog.tsx`.

### 3. Adding a New Command
1. Create a class implementing `ICommand` in `src/editor/commands/`.
2. Store the necessary before and after state snapshots in constructor parameters.
3. In `execute()`, apply the new state via Zustand stores.
4. In `undo()`, restore the previous state.

---

## Installation & Development

### Prerequisites
- Node.js 18+ (tested on Node 22 and Node 24)
- pnpm, npm, or yarn

### Install Dependencies
```bash
pnpm install
```

### Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Tests
```bash
pnpm test
```

### Production Build
```bash
pnpm build
pnpm start
```
