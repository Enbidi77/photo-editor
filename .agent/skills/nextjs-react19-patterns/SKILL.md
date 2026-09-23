---
name: nextjs-react19-patterns
description: Best practices for Next.js 15 (App Router) and React 19 in high-performance web applications, including client boundary isolation for canvas, Server Actions, route handlers, and SSR safety.
---

# Next.js 15 & React 19 Engineering Patterns

This skill guides development on modern Next.js 15 and React 19 web applications with intensive client-side interactivity (like canvas and photo editing).

---

## 1. Client-Side Boundary Isolation (Canvas & DOM-Only Libraries)

Libraries like `konva`, `html2canvas`, and DOM `Image` access browser globals (`window`, `document`, `HTMLCanvasElement`) that do not exist during Next.js Server-Side Rendering (SSR).

### The Golden Rule:
* **Never import Konva directly inside a Server Component.**
* **Never let a Client Component importing Konva be rendered during SSR without dynamic import protection.**

### Dynamic Import Pattern:
```tsx
// src/components/editor/EditorStageLoader.tsx
'use client';

import dynamic from 'next/dynamic';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export const DynamicEditorStage = dynamic(
  () => import('./EditorStage').then((mod) => mod.EditorStage),
  {
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    ),
  }
);
```

---

## 2. React 19 Features & Optimizations

Pixelforge runs on React 19. Leverage native React 19 features while avoiding outdated patterns:

### `ref` as a Standard Prop
In React 19, `forwardRef` is no longer needed for standard components. You can pass `ref` directly as a prop:
```tsx
interface CanvasOverlayProps {
  ref?: React.Ref<HTMLDivElement>;
  active: boolean;
}

export function CanvasOverlay({ ref, active }: CanvasOverlayProps) {
  return <div ref={ref} className={active ? 'active' : ''} />;
}
```

### Granular Store Subscriptions (Preventing Rerender Cascades)
When consuming Zustand in React 19 with heavy canvas apps:
```tsx
import { useShallow } from 'zustand/react/shallow';
import { useLayerStore } from '@/store/layerStore';

// BAD: Re-renders on ANY change to any layer
const layers = useLayerStore((state) => state.layers);

// GOOD: Subscribes only to layer IDs or specific properties
const layerIds = useLayerStore(
  useShallow((state) => state.layers.map((l) => l.id))
);
```

---

## 3. Server Actions & Route Handlers for Asset Processing

### When to Use Server Actions:
* Updating metadata, project titles, permissions, or folder structure.
* Authenticated user operations that return JSON data or mutate Drizzle database rows.

### When to Use Route Handlers (`app/api/.../route.ts`):
* Binary image upload streaming (preventing payload size limits in Server Actions).
* Generating downloadable export streams or ZIP bundles of edited projects.
* Proxying external images to bypass CORS issues on HTML5 canvas.

### Proxy Route Example (Bypassing Canvas CORS Taint):
```typescript
// src/app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');
  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
```

---

## 4. Tree-Shaking and Bundle Hygiene

Graphics applications easily accumulate massive bundle sizes. Follow these import patterns:

* **Lodash-es**: Always import named paths: `import debounce from 'lodash-es/debounce';` rather than `import { debounce } from 'lodash-es';`
* **Lucide / MUI Icons**: Ensure imports use direct component names: `import CropIcon from '@mui/icons-material/Crop';` or named imports from `lucide-react`.
* **Server Only**: Any file containing database queries, secret keys, or Drizzle client connections must start with `import 'server-only';`.
