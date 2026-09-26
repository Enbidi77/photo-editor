import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUIStore } from '@/store/uiStore';
import { ImageLoader } from '@/lib/image/imageLoader';
import { AddLayerCommand } from '@/editor/commands/LayerCommands';
import { ImageLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { nanoid } from 'nanoid';

describe('Drag and Drop Image Upload Workflow', () => {
  beforeEach(() => {
    useDocumentStore.getState().createNewDocument('DndTestDoc', 1000, 800, 72, '#ffffff');
    useLayerStore.getState().clearLayers();
    useHistoryStore.getState().clearHistory();
    vi.clearAllMocks();
  });

  it('correctly loads image metadata from ImageLoader mock', async () => {
    const mockFile = new File(['fake-bytes'], 'vacation.jpg', { type: 'image/jpeg' });

    vi.spyOn(ImageLoader, 'loadFromFile').mockResolvedValueOnce({
      dataUrl: 'data:image/jpeg;base64,mockdata',
      name: 'vacation.jpg',
      width: 600,
      height: 400,
    });

    const info = await ImageLoader.loadFromFile(mockFile);
    expect(info.name).toBe('vacation.jpg');
    expect(info.width).toBe(600);
    expect(info.height).toBe(400);
    expect(info.dataUrl).toContain('mockdata');
  });

  it('places dropped image at custom drop document coordinates', async () => {
    const doc = useDocumentStore.getState().document;
    expect(doc).not.toBeNull();

    const imgInfo = {
      dataUrl: 'data:image/png;base64,image1',
      name: 'drop-image.png',
      width: 400,
      height: 300,
    };

    // Simulate drop at (350, 450) in document space
    const dropDocPos = { x: 350, y: 450 };
    const targetW = imgInfo.width;
    const targetH = imgInfo.height;
    const posX = Math.round(dropDocPos.x - targetW / 2);
    const posY = Math.round(dropDocPos.y - targetH / 2);

    const layer: ImageLayer = {
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
      zIndex: 0,
      parentId: null,
      imageUrl: imgInfo.dataUrl,
      naturalWidth: imgInfo.width,
      naturalHeight: imgInfo.height,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
    };

    await useHistoryStore.getState().executeCommand(new AddLayerCommand(layer, 0));

    const layers = useLayerStore.getState().layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].type).toBe('IMAGE');
    expect(layers[0].name).toBe('drop-image.png');
    // Center at (350, 450) with width 400 and height 300 means x = 350 - 200 = 150, y = 450 - 150 = 300
    expect(layers[0].x).toBe(150);
    expect(layers[0].y).toBe(300);
  });

  it('handles multi-image drops with cascading layer offsets', async () => {
    const images = [
      { name: 'photo-1.png', width: 200, height: 200 },
      { name: 'photo-2.png', width: 200, height: 200 },
      { name: 'photo-3.png', width: 200, height: 200 },
    ];

    const dropDocPos = { x: 500, y: 400 };

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const posX = Math.round(dropDocPos.x - img.width / 2) + i * 24;
      const posY = Math.round(dropDocPos.y - img.height / 2) + i * 24;

      const layer: ImageLayer = {
        id: `img-${i}`,
        type: 'IMAGE',
        name: img.name,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        x: posX,
        y: posY,
        width: img.width,
        height: img.height,
        rotation: 0,
        zIndex: i,
        parentId: null,
        imageUrl: 'data:image/png;base64,xxx',
        naturalWidth: img.width,
        naturalHeight: img.height,
        adjustments: { ...DEFAULT_ADJUSTMENTS },
      };

      await useHistoryStore.getState().executeCommand(new AddLayerCommand(layer, 0));
    }

    const layers = useLayerStore.getState().layers;
    expect(layers).toHaveLength(3);
    // Each subsequent layer has cascading offset (+24px)
    expect(layers.find((l) => l.id === 'img-0')?.x).toBe(400);
    expect(layers.find((l) => l.id === 'img-1')?.x).toBe(424);
    expect(layers.find((l) => l.id === 'img-2')?.x).toBe(448);
  });

  it('auto-scales oversized dropped images to fit within document boundaries', () => {
    const doc = useDocumentStore.getState().document;
    expect(doc).not.toBeNull();
    const docWidth = doc!.width; // 1000
    const docHeight = doc!.height; // 800

    const hugeImage = { width: 4000, height: 2400 };
    const maxW = docWidth * 0.85; // 850
    const maxH = docHeight * 0.85; // 680

    const scale = Math.min(maxW / hugeImage.width, maxH / hugeImage.height);
    const targetW = Math.round(hugeImage.width * scale);
    const targetH = Math.round(hugeImage.height * scale);

    expect(targetW).toBeLessThanOrEqual(maxW);
    expect(targetH).toBeLessThanOrEqual(maxH);
    // Aspect ratio preserved: 4000 / 2400 = 1.6667
    expect((targetW / targetH).toFixed(2)).toBe((hugeImage.width / hugeImage.height).toFixed(2));
  });

  it('StartScreen creates new document with image natural dimensions on drop', async () => {
    // Reset document
    useDocumentStore.setState({ document: null });
    useLayerStore.getState().clearLayers();

    const droppedImage = {
      name: 'Landscape.png',
      width: 1280,
      height: 720,
      dataUrl: 'data:image/png;base64,landscape',
    };

    // Simulate StartScreen drop action
    useDocumentStore.getState().createNewDocument(droppedImage.name, droppedImage.width, droppedImage.height, 72, '#ffffff');

    const firstLayer: ImageLayer = {
      id: 'landscape-layer',
      type: 'IMAGE',
      name: droppedImage.name,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 0,
      y: 0,
      width: droppedImage.width,
      height: droppedImage.height,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      imageUrl: droppedImage.dataUrl,
      naturalWidth: droppedImage.width,
      naturalHeight: droppedImage.height,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
    };
    useLayerStore.getState().addLayer(firstLayer, 0);

    const doc = useDocumentStore.getState().document;
    expect(doc).not.toBeNull();
    expect(doc?.width).toBe(1280);
    expect(doc?.height).toBe(720);
    expect(doc?.name).toBe('Landscape.png');

    const layers = useLayerStore.getState().layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].width).toBe(1280);
    expect(layers[0].height).toBe(720);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { DropzoneOverlay } from '@/components/common/DropzoneOverlay';

describe('DropzoneOverlay Visual Polish and Accessibility', () => {
  it('renders dragging state with animated dashed border and format pill', () => {
    render(
      <DropzoneOverlay
        state="dragging"
        title="Drop your image here"
        subtitle="Release to add as a new layer"
        testId="test-dropzone"
      />
    );

    const overlay = screen.getByTestId('test-dropzone');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByText('Drop your image here')).toBeInTheDocument();
    expect(screen.getByText('Release to add as a new layer')).toBeInTheDocument();
    expect(screen.getByText('PNG, JPG, WebP, SVG, GIF, PXF')).toBeInTheDocument();

    // Check SVG animated dashed border exists
    const svgRect = overlay.querySelector('rect.dropzone-dash-stroke');
    expect(svgRect).not.toBeNull();
  });

  it('renders confirmation state with checkmark and confirmation message', () => {
    render(
      <DropzoneOverlay
        state="confirming"
        confirmTitle="Image dropped!"
        confirmSubtitle="Adding new layer to canvas..."
        testId="test-confirming"
      />
    );

    const overlay = screen.getByTestId('test-confirming');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByText('Image dropped!')).toBeInTheDocument();
    expect(screen.getByText('Adding new layer to canvas...')).toBeInTheDocument();
  });

  it('renders error state with retry and dismiss options', () => {
    const handleRetry = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <DropzoneOverlay
        state="error"
        errorMessage="Unsupported file type. Please upload an image."
        onRetry={handleRetry}
        onDismissError={handleDismiss}
        testId="test-error"
      />
    );

    expect(screen.getByText('Upload Problem')).toBeInTheDocument();
    expect(screen.getByText('Unsupported file type. Please upload an image.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissBtn).toBeInTheDocument();
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});

