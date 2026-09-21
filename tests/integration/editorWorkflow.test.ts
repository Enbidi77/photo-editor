import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import {
  AddLayerCommand,
  TransformLayerCommand,
  ChangeOpacityCommand,
  ReorderLayerCommand,
} from '@/editor/commands/LayerCommands';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { ImageLayer, TextLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';

describe('End-to-End Photoshop Editing Workflow', () => {
  beforeEach(() => {
    useDocumentStore.getState().createNewDocument('Workflow-Art', 1920, 1080, 72, '#ffffff');
    useLayerStore.getState().clearLayers();
    useHistoryStore.getState().clearHistory();
  });

  it('executes full primary user editing workflow with commands and serialization', async () => {
    // 1. Verify 1920x1080 document created
    const doc = useDocumentStore.getState().document;
    expect(doc).not.toBeNull();
    expect(doc?.width).toBe(1920);
    expect(doc?.height).toBe(1080);

    // 2. Import / Add Image Layer
    const imageLayer: ImageLayer = {
      id: 'img-main',
      type: 'IMAGE',
      name: 'Landscape Photo',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 100,
      y: 100,
      width: 800,
      height: 600,
      rotation: 0,
      zIndex: 0,
      parentId: null,
      imageUrl: 'data:image/png;base64,sample',
      naturalWidth: 800,
      naturalHeight: 600,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
    };
    await useHistoryStore.getState().executeCommand(new AddLayerCommand(imageLayer, 0));
    expect(useLayerStore.getState().layers).toHaveLength(1);

    // 3, 4, 5. Move, Resize, Rotate Image Layer via TransformLayerCommand
    const prevTransform = { x: 100, y: 100, width: 800, height: 600, rotation: 0 };
    const nextTransform = { x: 150, y: 120, width: 900, height: 675, rotation: 12 };
    await useHistoryStore.getState().executeCommand(
      new TransformLayerCommand('img-main', prevTransform, nextTransform)
    );
    const transformedImg = useLayerStore.getState().layers[0];
    expect(transformedImg.x).toBe(150);
    expect(transformedImg.y).toBe(120);
    expect(transformedImg.width).toBe(900);
    expect(transformedImg.rotation).toBe(12);

    // 6, 7. Create another layer: Text layer
    const textLayer: TextLayer = {
      id: 'text-heading',
      type: 'TEXT',
      name: 'Title Text',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      x: 200,
      y: 80,
      width: 400,
      height: 60,
      rotation: 0,
      zIndex: 1,
      parentId: null,
      text: 'Summer Sunset',
      fontFamily: 'Inter',
      fontSize: 48,
      fontWeight: 'bold',
      fontStyle: 'normal',
      fill: '#ffffff',
      align: 'center',
      lineHeight: 1.2,
      letterSpacing: 2,
      underline: false,
    };
    await useHistoryStore.getState().executeCommand(new AddLayerCommand(textLayer, 0));
    expect(useLayerStore.getState().layers).toHaveLength(2);
    // In store, index 0 is top layer (textLayer)
    expect(useLayerStore.getState().layers[0].id).toBe('text-heading');

    // 8. Change text properties
    useLayerStore.getState().updateLayer('text-heading', { fontSize: 64, fill: '#ffeb3b' });
    const updatedText = useLayerStore.getState().layers[0] as TextLayer;
    expect(updatedText.fontSize).toBe(64);
    expect(updatedText.fill).toBe('#ffeb3b');

    // 9. Change layer opacity
    await useHistoryStore.getState().executeCommand(
      new ChangeOpacityCommand('text-heading', 1, 0.75)
    );
    expect(useLayerStore.getState().layers[0].opacity).toBe(0.75);

    // 10. Reorder layers
    await useHistoryStore.getState().executeCommand(new ReorderLayerCommand(0, 1));
    expect(useLayerStore.getState().layers[0].id).toBe('img-main');
    expect(useLayerStore.getState().layers[1].id).toBe('text-heading');

    // 11. Hide / Show layers
    useLayerStore.getState().toggleVisibility('img-main');
    expect(useLayerStore.getState().layers[0].visible).toBe(false);
    useLayerStore.getState().toggleVisibility('img-main');
    expect(useLayerStore.getState().layers[0].visible).toBe(true);

    // 12. Duplicate layers
    const dup = useLayerStore.getState().duplicateLayer('text-heading');
    expect(dup).not.toBeNull();
    expect(useLayerStore.getState().layers).toHaveLength(3);

    // 13. Undo
    // Undo reorder (which was executed before duplicate in command stack)
    await useHistoryStore.getState().undo(); // Undoes opacity change
    expect(useHistoryStore.getState().canRedo()).toBe(true);

    // 14. Redo
    await useHistoryStore.getState().redo();

    // 15. Serialize to .pxf project
    const project = PxfSerializer.serialize();
    expect(project.version).toBe(1);
    expect(project.document.width).toBe(1920);
    expect(project.document.height).toBe(1080);
    expect(project.layers.length).toBeGreaterThanOrEqual(2);
  });
});
