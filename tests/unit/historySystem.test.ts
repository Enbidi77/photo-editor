import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore } from '@/store/layerStore';
import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import {
  AddLayerCommand,
  DeleteLayerCommand,
  DuplicateLayerCommand,
  TransformLayerCommand,
  ChangeOpacityCommand,
  ChangeBlendModeCommand,
  ReorderLayerCommand,
  UpdateLayerPropertiesCommand,
  ToggleVisibilityCommand,
  ToggleLockCommand,
  RenameLayerCommand,
} from '@/editor/commands/LayerCommands';
import { ResizeDocumentCommand, CropDocumentCommand } from '@/editor/commands/DocumentCommands';
import { ApplyAdjustmentsCommand } from '@/editor/commands/FilterCommands';
import {
  UpdateMaskDataCommand,
  ToggleMaskEnabledCommand,
  ToggleMaskInvertedCommand,
  ToggleMaskLinkedCommand,
} from '@/editor/commands/MaskCommands';
import { ShapeLayer, ImageLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';
import { PxfSerializer } from '@/editor/export/PxfSerializer';
import { applyRemoteOperation, OperationFactory } from '@/lib/collaboration/operations';
import { isFormInputElement } from '@/lib/keyboard/shortcutRegistry';

describe('Comprehensive Undo/Redo System', () => {
  beforeEach(() => {
    useCollaborationStore.setState({ userRole: 'editor', connected: false });
    useLayerStore.getState().clearLayers();
    useDocumentStore.getState().createNewDocument('Test Doc', 1000, 1000, 72, '#ffffff');
    useHistoryStore.getState().clearHistory('Initial State');
  });

  const createTestShapeLayer = (id = 'layer-1', name = 'Shape 1'): ShapeLayer => ({
    id,
    type: 'SHAPE',
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 50,
    y: 50,
    width: 200,
    height: 100,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    shapeKind: 'rect',
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 2,
    cornerRadius: 0,
  });

  const createTestImageLayer = (id = 'img-1', name = 'Image 1'): ImageLayer => ({
    id,
    type: 'IMAGE',
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    imageUrl: 'data:image/png;base64,mock',
    naturalWidth: 400,
    naturalHeight: 300,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  });

  describe('1. History Stack Lifecycle & Redo Clearing', () => {
    it('initializes with a clean baseline state', () => {
      const history = useHistoryStore.getState();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.entries).toHaveLength(1);
      expect(history.currentIndex).toBe(0);
      expect(history.undoStack).toHaveLength(0);
      expect(history.redoStack).toHaveLength(0);
    });

    it('executes command, pushes to undo stack, and supports full undo -> redo', async () => {
      const layer = createTestShapeLayer();
      const cmd = new AddLayerCommand(layer, 0);

      const success = await useHistoryStore.getState().executeCommand(cmd);
      expect(success).toBe(true);
      expect(useLayerStore.getState().layers).toHaveLength(1);
      expect(useHistoryStore.getState().canUndo()).toBe(true);
      expect(useHistoryStore.getState().canRedo()).toBe(false);
      expect(useHistoryStore.getState().currentIndex).toBe(1);

      // Undo
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers).toHaveLength(0);
      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().canRedo()).toBe(true);
      expect(useHistoryStore.getState().currentIndex).toBe(0);

      // Redo
      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers).toHaveLength(1);
      expect(useHistoryStore.getState().canUndo()).toBe(true);
      expect(useHistoryStore.getState().canRedo()).toBe(false);
      expect(useHistoryStore.getState().currentIndex).toBe(1);
    });

    it('clears redo stack when a new command is executed after undo', async () => {
      const layer1 = createTestShapeLayer('l1', 'Layer 1');
      const layer2 = createTestShapeLayer('l2', 'Layer 2');
      const layer3 = createTestShapeLayer('l3', 'Layer 3');

      await useHistoryStore.getState().executeCommand(new AddLayerCommand(layer1, 0));
      await useHistoryStore.getState().executeCommand(new AddLayerCommand(layer2, 1));

      // Undo layer 2
      await useHistoryStore.getState().undo();
      expect(useHistoryStore.getState().canRedo()).toBe(true);
      expect(useHistoryStore.getState().redoStack).toHaveLength(1);

      // Execute a new command (layer 3)
      await useHistoryStore.getState().executeCommand(new AddLayerCommand(layer3, 1));
      expect(useHistoryStore.getState().canRedo()).toBe(false);
      expect(useHistoryStore.getState().redoStack).toHaveLength(0);

      const layers = useLayerStore.getState().layers;
      expect(layers.map((l) => l.id)).toEqual(['l1', 'l3']);
    });
  });

  describe('2. Bounded Maximum History Size', () => {
    it('bounds history entries and undoStack to 100 items', async () => {
      const layer = createTestShapeLayer('bounded-1');
      useLayerStore.getState().addLayer(layer);

      // Execute 105 opacity commands
      for (let i = 1; i <= 105; i++) {
        const cmd = new ChangeOpacityCommand('bounded-1', (i - 1) / 200, i / 200);
        await useHistoryStore.getState().executeCommand(cmd);
      }

      const history = useHistoryStore.getState();
      expect(history.undoStack.length).toBeLessThanOrEqual(100);
      expect(history.entries.length).toBeLessThanOrEqual(100);
      expect(history.currentIndex).toBe(history.entries.length - 1);
    });
  });

  describe('3. No-Op Guard Rejection', () => {
    it('rejects commands that produce zero state change without modifying stacks', async () => {
      const layer = createTestShapeLayer('noop-1');
      useLayerStore.getState().addLayer(layer);

      // No-op Transform
      const transformCmd = new TransformLayerCommand(
        'noop-1',
        { x: 50, y: 50, width: 200, height: 100, rotation: 0 },
        { x: 50, y: 50, width: 200, height: 100, rotation: 0 }
      );
      const res1 = await useHistoryStore.getState().executeCommand(transformCmd);
      expect(res1).toBe(false);
      expect(useHistoryStore.getState().canUndo()).toBe(false);

      // No-op Opacity
      const opacityCmd = new ChangeOpacityCommand('noop-1', 1.0, 1.0);
      const res2 = await useHistoryStore.getState().executeCommand(opacityCmd);
      expect(res2).toBe(false);
      expect(useHistoryStore.getState().canUndo()).toBe(false);

      // No-op Blend Mode
      const blendCmd = new ChangeBlendModeCommand('noop-1', 'normal', 'normal');
      const res3 = await useHistoryStore.getState().executeCommand(blendCmd);
      expect(res3).toBe(false);

      // No-op Reorder
      const reorderCmd = new ReorderLayerCommand(0, 0);
      const res4 = await useHistoryStore.getState().executeCommand(reorderCmd);
      expect(res4).toBe(false);

      // No-op Document Resize
      const doc = useDocumentStore.getState().document!;
      const resizeCmd = new ResizeDocumentCommand({ ...doc }, { ...doc });
      const res5 = await useHistoryStore.getState().executeCommand(resizeCmd);
      expect(res5).toBe(false);
    });
  });

  describe('4. Reversible Layer Lifecycle & Property Commands', () => {
    it('handles DeleteLayerCommand with index and state restoration', async () => {
      const l1 = createTestShapeLayer('del-1', 'Layer 1');
      const l2 = createTestShapeLayer('del-2', 'Layer 2');
      useLayerStore.getState().addLayer(l1, 0);
      useLayerStore.getState().addLayer(l2, 1);

      const deleteCmd = new DeleteLayerCommand(l1);
      await useHistoryStore.getState().executeCommand(deleteCmd);

      expect(useLayerStore.getState().layers).toHaveLength(1);
      expect(useLayerStore.getState().layers[0].id).toBe('del-2');

      // Undo deletion
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers).toHaveLength(2);
      expect(useLayerStore.getState().layers[0].id).toBe('del-1');

      // Redo deletion
      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers).toHaveLength(1);
      expect(useLayerStore.getState().layers[0].id).toBe('del-2');
    });

    it('handles DuplicateLayerCommand undo and redo', async () => {
      const l1 = createTestShapeLayer('dup-src', 'Source Layer');
      useLayerStore.getState().addLayer(l1);

      const dupCmd = new DuplicateLayerCommand('dup-src');
      await useHistoryStore.getState().executeCommand(dupCmd);

      expect(useLayerStore.getState().layers).toHaveLength(2);
      const duplicate = useLayerStore.getState().layers.find((l) => l.id !== 'dup-src')!;
      expect(duplicate.name).toBe('Source Layer copy');

      // Undo
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers).toHaveLength(1);
      expect(useLayerStore.getState().layers[0].id).toBe('dup-src');

      // Redo
      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers).toHaveLength(2);
    });

    it('handles ReorderLayerCommand undo and redo', async () => {
      const l1 = createTestShapeLayer('r-1', 'Bottom');
      const l2 = createTestShapeLayer('r-2', 'Top');
      useLayerStore.getState().addLayer(l1, 0);
      useLayerStore.getState().addLayer(l2, 1);

      const reorderCmd = new ReorderLayerCommand(0, 1);
      await useHistoryStore.getState().executeCommand(reorderCmd);
      expect(useLayerStore.getState().layers.map((l) => l.id)).toEqual(['r-2', 'r-1']);

      // Undo
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers.map((l) => l.id)).toEqual(['r-1', 'r-2']);

      // Redo
      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers.map((l) => l.id)).toEqual(['r-2', 'r-1']);
    });

    it('handles ToggleVisibilityCommand, ToggleLockCommand, and RenameLayerCommand', async () => {
      const l1 = createTestShapeLayer('prop-1', 'Original');
      useLayerStore.getState().addLayer(l1);

      // Visibility
      await useHistoryStore.getState().executeCommand(new ToggleVisibilityCommand('prop-1', true));
      expect(useLayerStore.getState().layers[0].visible).toBe(false);
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].visible).toBe(true);

      // Lock
      await useHistoryStore.getState().executeCommand(new ToggleLockCommand('prop-1', false));
      expect(useLayerStore.getState().layers[0].locked).toBe(true);
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].locked).toBe(false);

      // Rename
      await useHistoryStore.getState().executeCommand(new RenameLayerCommand('prop-1', 'Original', 'Renamed'));
      expect(useLayerStore.getState().layers[0].name).toBe('Renamed');
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].name).toBe('Original');
    });

    it('handles UpdateLayerPropertiesCommand for vector/shape attributes', async () => {
      const l1 = createTestShapeLayer('shape-prop');
      useLayerStore.getState().addLayer(l1);

      const cmd = new UpdateLayerPropertiesCommand(
        'shape-prop',
        { fill: '#ff0000', strokeWidth: 2 },
        { fill: '#00ff00', strokeWidth: 10 },
        'Change Fill & Stroke'
      );
      await useHistoryStore.getState().executeCommand(cmd);

      const updated = useLayerStore.getState().layers[0] as ShapeLayer;
      expect(updated.fill).toBe('#00ff00');
      expect(updated.strokeWidth).toBe(10);

      await useHistoryStore.getState().undo();
      const undone = useLayerStore.getState().layers[0] as ShapeLayer;
      expect(undone.fill).toBe('#ff0000');
      expect(undone.strokeWidth).toBe(2);
    });
  });

  describe('5. Filters & Adjustments Reversibility', () => {
    it('handles ApplyAdjustmentsCommand and preserves image adjustment state', async () => {
      const img = createTestImageLayer('filter-img');
      useLayerStore.getState().addLayer(img);

      const prev = { ...img.adjustments };
      const next = { ...prev, brightness: 35, contrast: -20, sepia: true };

      const cmd = new ApplyAdjustmentsCommand('filter-img', prev, next, 'Sepia Adjust');
      await useHistoryStore.getState().executeCommand(cmd);

      const adjusted = (useLayerStore.getState().layers[0] as ImageLayer).adjustments;
      expect(adjusted.brightness).toBe(35);
      expect(adjusted.contrast).toBe(-20);
      expect(adjusted.sepia).toBe(true);

      // Undo
      await useHistoryStore.getState().undo();
      const reverted = (useLayerStore.getState().layers[0] as ImageLayer).adjustments;
      expect(reverted.brightness).toBe(0);
      expect(reverted.contrast).toBe(0);
      expect(reverted.sepia).toBe(false);

      // Redo
      await useHistoryStore.getState().redo();
      const redone = (useLayerStore.getState().layers[0] as ImageLayer).adjustments;
      expect(redone.brightness).toBe(35);
      expect(redone.sepia).toBe(true);
    });
  });

  describe('6. Document Operations (Resize & Crop)', () => {
    it('handles ResizeDocumentCommand undo and redo', async () => {
      const prevDoc = { ...useDocumentStore.getState().document! };
      const nextDoc = { ...prevDoc, width: 1440, height: 900, backgroundColor: '#000000' };

      const cmd = new ResizeDocumentCommand(prevDoc, nextDoc);
      await useHistoryStore.getState().executeCommand(cmd);

      expect(useDocumentStore.getState().document?.width).toBe(1440);
      expect(useDocumentStore.getState().document?.height).toBe(900);
      expect(useDocumentStore.getState().document?.backgroundColor).toBe('#000000');

      // Undo
      await useHistoryStore.getState().undo();
      expect(useDocumentStore.getState().document?.width).toBe(1000);
      expect(useDocumentStore.getState().document?.height).toBe(1000);
      expect(useDocumentStore.getState().document?.backgroundColor).toBe('#ffffff');

      // Redo
      await useHistoryStore.getState().redo();
      expect(useDocumentStore.getState().document?.width).toBe(1440);
    });

    it('handles CropDocumentCommand undo and redo with layer coordinate shifts', async () => {
      const prevDoc = { ...useDocumentStore.getState().document! };
      const l1 = createTestShapeLayer('crop-l1');
      useLayerStore.getState().addLayer(l1);
      const prevLayers = useLayerStore.getState().layers;

      const nextDoc = { ...prevDoc, width: 500, height: 500 };
      const nextLayers = prevLayers.map((l) => ({ ...l, x: l.x - 20, y: l.y - 20 }));

      const cmd = new CropDocumentCommand(prevDoc, nextDoc, prevLayers, nextLayers);
      await useHistoryStore.getState().executeCommand(cmd);

      expect(useDocumentStore.getState().document?.width).toBe(500);
      expect(useLayerStore.getState().layers[0].x).toBe(30);

      // Undo
      await useHistoryStore.getState().undo();
      expect(useDocumentStore.getState().document?.width).toBe(1000);
      expect(useLayerStore.getState().layers[0].x).toBe(50);

      // Redo
      await useHistoryStore.getState().redo();
      expect(useDocumentStore.getState().document?.width).toBe(500);
      expect(useLayerStore.getState().layers[0].x).toBe(30);
    });
  });

  describe('7. Mask Commands Reversibility', () => {
    it('handles UpdateMaskDataCommand, ToggleMaskEnabled, ToggleMaskInverted, ToggleMaskLinked', async () => {
      const l1 = createTestShapeLayer('mask-target');
      l1.mask = {
        enabled: true,
        dataUrl: 'data:image/png;base64,mask1',
        inverted: false,
        linked: true,
      };
      useLayerStore.getState().addLayer(l1);

      // Update Mask Data
      const maskCmd = new UpdateMaskDataCommand('mask-target', 'data:image/png;base64,mask1', 'data:image/png;base64,mask2');
      await useHistoryStore.getState().executeCommand(maskCmd);
      expect(useLayerStore.getState().layers[0].mask?.dataUrl).toBe('data:image/png;base64,mask2');

      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].mask?.dataUrl).toBe('data:image/png;base64,mask1');

      // Toggle Enabled
      await useHistoryStore.getState().executeCommand(new ToggleMaskEnabledCommand('mask-target'));
      expect(useLayerStore.getState().layers[0].mask?.enabled).toBe(false);
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].mask?.enabled).toBe(true);

      // Toggle Inverted
      await useHistoryStore.getState().executeCommand(new ToggleMaskInvertedCommand('mask-target'));
      expect(useLayerStore.getState().layers[0].mask?.inverted).toBe(true);
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].mask?.inverted).toBe(false);

      // Toggle Linked
      await useHistoryStore.getState().executeCommand(new ToggleMaskLinkedCommand('mask-target'));
      expect(useLayerStore.getState().layers[0].mask?.linked).toBe(false);
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].mask?.linked).toBe(true);
    });
  });

  describe('8. Multi-Step History Navigation (jumpTo)', () => {
    it('navigates backward and forward across arbitrary steps with full state integrity', async () => {
      const layer = createTestShapeLayer('jump-layer');
      useLayerStore.getState().addLayer(layer);

      // 4 sequential steps
      await useHistoryStore.getState().executeCommand(new ChangeOpacityCommand('jump-layer', 1, 0.8)); // index 1
      await useHistoryStore.getState().executeCommand(new ChangeOpacityCommand('jump-layer', 0.8, 0.6)); // index 2
      await useHistoryStore.getState().executeCommand(new ChangeOpacityCommand('jump-layer', 0.6, 0.4)); // index 3
      await useHistoryStore.getState().executeCommand(new ChangeOpacityCommand('jump-layer', 0.4, 0.2)); // index 4

      expect(useHistoryStore.getState().currentIndex).toBe(4);
      expect(useLayerStore.getState().layers[0].opacity).toBe(0.2);

      // Jump directly back to index 2 (opacity 0.6)
      await useHistoryStore.getState().jumpTo(2);
      expect(useHistoryStore.getState().currentIndex).toBe(2);
      expect(useLayerStore.getState().layers[0].opacity).toBe(0.6);
      expect(useHistoryStore.getState().canUndo()).toBe(true);
      expect(useHistoryStore.getState().canRedo()).toBe(true);

      // Jump directly forward to index 4 (opacity 0.2)
      await useHistoryStore.getState().jumpTo(4);
      expect(useHistoryStore.getState().currentIndex).toBe(4);
      expect(useLayerStore.getState().layers[0].opacity).toBe(0.2);
      expect(useHistoryStore.getState().canUndo()).toBe(true);
      expect(useHistoryStore.getState().canRedo()).toBe(false);

      // Jump back to baseline index 0 (initial opacity 1.0)
      await useHistoryStore.getState().jumpTo(0);
      expect(useHistoryStore.getState().currentIndex).toBe(0);
      expect(useLayerStore.getState().layers[0].opacity).toBe(1.0);
      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().canRedo()).toBe(true);
    });
  });

  describe('9. Viewer Role Security Protection', () => {
    it('blocks executeCommand, undo, redo, and jumpTo when user is a viewer', async () => {
      const layer = createTestShapeLayer('viewer-layer');
      useLayerStore.getState().addLayer(layer);

      // Switch to viewer mode
      useCollaborationStore.setState({ userRole: 'viewer' });

      const cmd = new ChangeOpacityCommand('viewer-layer', 1.0, 0.5);
      const executed = await useHistoryStore.getState().executeCommand(cmd);

      expect(executed).toBe(false);
      expect(useLayerStore.getState().layers[0].opacity).toBe(1.0);
      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().canRedo()).toBe(false);

      // Undo attempt
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].opacity).toBe(1.0);

      // Redo attempt
      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers[0].opacity).toBe(1.0);

      // jumpTo attempt
      await useHistoryStore.getState().jumpTo(0);
      expect(useHistoryStore.getState().currentIndex).toBe(0);
    });
  });

  describe('10. Collaboration Remote Operations Isolation', () => {
    it('applies remote operations directly to stores without polluting local history', () => {
      const remoteLayer = createTestShapeLayer('remote-1', 'Remote Layer');

      const op = OperationFactory.addLayer('proj-1', 'user-bob', remoteLayer, 0);
      applyRemoteOperation(op);

      // Layer should be present in store
      expect(useLayerStore.getState().layers).toHaveLength(1);
      expect(useLayerStore.getState().layers[0].id).toBe('remote-1');

      // Local history must NOT have captured this remote operation
      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().undoStack).toHaveLength(0);
      expect(useHistoryStore.getState().entries).toHaveLength(1); // Only baseline
    });
  });

  describe('11. Safe Document Deserialization & Clean Reset', () => {
    it('resets history to clean baseline upon PxfSerializer deserialization', async () => {
      const l1 = createTestShapeLayer('old-1');
      useLayerStore.getState().addLayer(l1);
      await useHistoryStore.getState().executeCommand(new ChangeOpacityCommand('old-1', 1, 0.5));
      expect(useHistoryStore.getState().canUndo()).toBe(true);

      const mockProject = {
        version: 1 as const,
        id: 'proj-new',
        document: {
          id: 'proj-new',
          name: 'Restored Document',
          width: 800,
          height: 600,
          resolution: 72,
          backgroundColor: '#000000',
          colorMode: 'RGB' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDirty: false,
        },
        layers: [createTestShapeLayer('loaded-1')],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      PxfSerializer.deserialize(mockProject);

      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().canRedo()).toBe(false);
      expect(useHistoryStore.getState().entries).toHaveLength(1);
      expect(useHistoryStore.getState().entries[0].label).toBe('Open Project');
      expect(useDocumentStore.getState().document?.name).toBe('Restored Document');
      expect(useLayerStore.getState().layers).toHaveLength(1);
    });
  });

  describe('12. Missing / Deleted Target Graceful Safety', () => {
    it('executes and undoes gracefully without throwing when target layer is missing', async () => {
      const nonExistentId = 'ghost-layer';

      const transformCmd = new TransformLayerCommand(
        nonExistentId,
        { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
        { x: 10, y: 10, width: 150, height: 150, rotation: 15 }
      );
      expect(() => transformCmd.execute()).not.toThrow();
      expect(() => transformCmd.undo()).not.toThrow();

      const opacityCmd = new ChangeOpacityCommand(nonExistentId, 1, 0.5);
      expect(() => opacityCmd.execute()).not.toThrow();
      expect(() => opacityCmd.undo()).not.toThrow();

      const blendCmd = new ChangeBlendModeCommand(nonExistentId, 'normal', 'multiply');
      expect(() => blendCmd.execute()).not.toThrow();
      expect(() => blendCmd.undo()).not.toThrow();

      const renameCmd = new RenameLayerCommand(nonExistentId, 'Old', 'New');
      expect(() => renameCmd.execute()).not.toThrow();
      expect(() => renameCmd.undo()).not.toThrow();
    });
  });

  describe('13. Form Input Shortcut Isolation', () => {
    it('identifies form inputs and protects typing from firing editor shortcuts', () => {
      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      const contentEditableDiv = document.createElement('div');
      contentEditableDiv.contentEditable = 'true';

      const muiInput = document.createElement('input');
      muiInput.className = 'MuiInputBase-input';

      const normalDiv = document.createElement('div');
      const canvas = document.createElement('canvas');

      expect(isFormInputElement(input)).toBe(true);
      expect(isFormInputElement(textarea)).toBe(true);
      expect(isFormInputElement(select)).toBe(true);
      expect(isFormInputElement(contentEditableDiv)).toBe(true);
      expect(isFormInputElement(muiInput)).toBe(true);

      expect(isFormInputElement(normalDiv)).toBe(false);
      expect(isFormInputElement(canvas)).toBe(false);
      expect(isFormInputElement(null)).toBe(false);
    });
  });
});
