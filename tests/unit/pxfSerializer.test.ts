import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { TextLayer } from '@/types/layer';

describe('PXF Project Serializer', () => {
  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useDocumentStore.getState().createNewDocument('Test-Project', 1280, 720, 72, '#ffffff');
  });

  it('serializes document and layer stack to valid PixelForgeProject', () => {
    const textLayer: TextLayer = {
      id: 'txt-1',
      type: 'TEXT',
      name: 'Heading',
      visible: true,
      locked: false,
      opacity: 0.9,
      blendMode: 'normal',
      x: 100,
      y: 150,
      width: 250,
      height: 40,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      text: 'Hello PixelForge',
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: 'bold',
      fontStyle: 'normal',
      fill: '#000000',
      align: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
      underline: false,
    };

    useLayerStore.getState().addLayer(textLayer);

    const project = PxfSerializer.serialize('data:image/png;base64,sample');

    expect(project.version).toBe(1);
    expect(project.document.name).toBe('Test-Project');
    expect(project.document.width).toBe(1280);
    expect(project.document.height).toBe(720);
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0].name).toBe('Heading');
    expect(project.thumbnail).toBe('data:image/png;base64,sample');
  });

  it('deserializes project and restores Zustand state perfectly', () => {
    const savedProject = {
      version: 1 as const,
      id: 'proj-123',
      document: {
        id: 'doc-123',
        name: 'Restored Art',
        width: 1080,
        height: 1080,
        resolution: 300,
        backgroundColor: '#000000',
        colorMode: 'RGB' as const,
        createdAt: 1000,
        updatedAt: 2000,
      },
      layers: [
        {
          id: 'layer-restored',
          type: 'SHAPE' as const,
          name: 'Badge',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal' as const,
          x: 20,
          y: 20,
          width: 200,
          height: 200,
          rotation: 15,
          zIndex: 0,
          parentId: null,
          shapeKind: 'circle' as const,
          fill: '#0078d4',
          stroke: '#ffffff',
          strokeWidth: 2,
          cornerRadius: 0,
        },
      ],
      createdAt: 1000,
      updatedAt: 2000,
    };

    PxfSerializer.deserialize(savedProject);

    expect(useDocumentStore.getState().document?.name).toBe('Restored Art');
    expect(useDocumentStore.getState().document?.width).toBe(1080);
    expect(useLayerStore.getState().layers).toHaveLength(1);
    expect(useLayerStore.getState().layers[0].id).toBe('layer-restored');
  });
});
