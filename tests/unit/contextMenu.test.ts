import { describe, it, expect, beforeEach } from 'vitest';
import { useLayerStore } from '@/store/layerStore';
import { useHistoryStore } from '@/store/historyStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import { operationBridge } from '@/lib/collaboration/operationBridge';
import {
  DuplicateLayerCommand,
  ToggleVisibilityCommand,
  ToggleLockCommand,
  RenameLayerCommand,
} from '@/editor/commands/LayerCommands';
import { ToggleMaskLinkedCommand } from '@/editor/commands/MaskCommands';
import {
  activateLayerWithSelectionPreservation,
} from '@/hooks/useEditorContextMenu';
import {
  getActionAvailability,
} from '@/components/common/EditorContextMenu';
import { ShapeLayer, ImageLayer, DEFAULT_ADJUSTMENTS } from '@/types/layer';

describe('Context Menu Commands, Actions, and Rules Engine', () => {
  const createMockShapeLayer = (id: string, name: string, locked = false, visible = true): ShapeLayer => ({
    id,
    type: 'SHAPE',
    name,
    visible,
    locked,
    opacity: 1,
    blendMode: 'normal',
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    shapeKind: 'rect',
    fill: '#0078d4',
  });

  const createMockImageLayer = (id: string, name: string): ImageLayer => ({
    id,
    type: 'IMAGE',
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    zIndex: 0,
    parentId: null,
    imageUrl: 'data:image/png;base64,mock',
    naturalWidth: 200,
    naturalHeight: 200,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  });

  beforeEach(() => {
    useLayerStore.getState().clearLayers();
    useHistoryStore.getState().clearHistory();
    useCollaborationStore.getState().resetCollaboration();
    operationBridge.setContext('ctx-proj-1', 'user-ctx-1');
  });

  describe('DuplicateLayerCommand', () => {
    it('duplicates layer with offset, executes, undoes, and redoes', async () => {
      const layer = createMockShapeLayer('shape-1', 'Base Shape');
      useLayerStore.getState().addLayer(layer);

      const cmd = new DuplicateLayerCommand(layer.id);
      await useHistoryStore.getState().executeCommand(cmd);

      const layers = useLayerStore.getState().layers;
      expect(layers).toHaveLength(2);
      const duplicate = layers[0];
      expect(duplicate.id).not.toBe(layer.id);
      expect(duplicate.name).toBe('Base Shape copy');
      expect(duplicate.x).toBe(layer.x + 20);
      expect(duplicate.y).toBe(layer.y + 20);

      // Undo
      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers).toHaveLength(1);
      expect(useLayerStore.getState().layers[0].id).toBe(layer.id);

      // Redo
      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers).toHaveLength(2);
      expect(useLayerStore.getState().layers[0].id).toBe(duplicate.id);
    });

    it('broadcasts ADD_LAYER for editor role and DELETE_LAYER on undo', async () => {
      useCollaborationStore.getState().setUserRole('editor');
      const layer = createMockShapeLayer('shape-2', 'Shape 2');
      useLayerStore.getState().addLayer(layer);

      let broadcasted: any[] = [];
      const unsub = operationBridge.subscribe((op) => {
        broadcasted.push(op);
      });

      const cmd = new DuplicateLayerCommand(layer.id);
      cmd.execute();

      expect(broadcasted).toHaveLength(1);
      expect(broadcasted[0].type).toBe('ADD_LAYER');

      cmd.undo();
      expect(broadcasted).toHaveLength(2);
      expect(broadcasted[1].type).toBe('DELETE_LAYER');

      unsub();
    });

    it('does not broadcast for viewer role', async () => {
      useCollaborationStore.getState().setUserRole('viewer');
      const layer = createMockShapeLayer('shape-3', 'Shape 3');
      useLayerStore.getState().addLayer(layer);

      let broadcasted: any[] = [];
      const unsub = operationBridge.subscribe((op) => {
        broadcasted.push(op);
      });

      const cmd = new DuplicateLayerCommand(layer.id);
      cmd.execute();

      expect(broadcasted).toHaveLength(0);
      unsub();
    });
  });

  describe('ToggleVisibilityCommand', () => {
    it('toggles visibility and supports undo/redo', async () => {
      const layer = createMockShapeLayer('vis-1', 'Vis Layer', false, true);
      useLayerStore.getState().addLayer(layer);

      const cmd = new ToggleVisibilityCommand(layer.id, true);
      await useHistoryStore.getState().executeCommand(cmd);

      expect(useLayerStore.getState().layers[0].visible).toBe(false);

      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].visible).toBe(true);

      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers[0].visible).toBe(false);
    });

    it('broadcasts UPDATE_LAYER operation', async () => {
      useCollaborationStore.getState().setUserRole('editor');
      const layer = createMockShapeLayer('vis-2', 'Vis Layer 2');
      useLayerStore.getState().addLayer(layer);

      let lastOp: any = null;
      const unsub = operationBridge.subscribe((op) => {
        lastOp = op;
      });

      const cmd = new ToggleVisibilityCommand(layer.id, true);
      cmd.execute();

      expect(lastOp?.type).toBe('UPDATE_LAYER');
      expect(lastOp?.payload.patch).toEqual({ visible: false });

      unsub();
    });
  });

  describe('ToggleLockCommand', () => {
    it('toggles lock and supports undo/redo', async () => {
      const layer = createMockShapeLayer('lock-1', 'Lock Layer', false);
      useLayerStore.getState().addLayer(layer);

      const cmd = new ToggleLockCommand(layer.id, false);
      await useHistoryStore.getState().executeCommand(cmd);

      expect(useLayerStore.getState().layers[0].locked).toBe(true);

      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].locked).toBe(false);

      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers[0].locked).toBe(true);
    });

    it('broadcasts UPDATE_LAYER operation', async () => {
      useCollaborationStore.getState().setUserRole('editor');
      const layer = createMockShapeLayer('lock-2', 'Lock Layer 2');
      useLayerStore.getState().addLayer(layer);

      let lastOp: any = null;
      const unsub = operationBridge.subscribe((op) => {
        lastOp = op;
      });

      const cmd = new ToggleLockCommand(layer.id, false);
      cmd.execute();

      expect(lastOp?.type).toBe('UPDATE_LAYER');
      expect(lastOp?.payload.patch).toEqual({ locked: true });

      unsub();
    });
  });

  describe('RenameLayerCommand', () => {
    it('renames layer and supports undo/redo', async () => {
      const layer = createMockShapeLayer('ren-1', 'Original Name');
      useLayerStore.getState().addLayer(layer);

      const cmd = new RenameLayerCommand(layer.id, 'Original Name', 'Renamed Layer');
      await useHistoryStore.getState().executeCommand(cmd);

      expect(useLayerStore.getState().layers[0].name).toBe('Renamed Layer');

      await useHistoryStore.getState().undo();
      expect(useLayerStore.getState().layers[0].name).toBe('Original Name');

      await useHistoryStore.getState().redo();
      expect(useLayerStore.getState().layers[0].name).toBe('Renamed Layer');
    });

    it('broadcasts UPDATE_LAYER operation', async () => {
      useCollaborationStore.getState().setUserRole('editor');
      const layer = createMockShapeLayer('ren-2', 'Old Name');
      useLayerStore.getState().addLayer(layer);

      let lastOp: any = null;
      const unsub = operationBridge.subscribe((op) => {
        lastOp = op;
      });

      const cmd = new RenameLayerCommand(layer.id, 'Old Name', 'New Name');
      cmd.execute();

      expect(lastOp?.type).toBe('UPDATE_LAYER');
      expect(lastOp?.payload.patch).toEqual({ name: 'New Name' });

      unsub();
    });
  });

  describe('ToggleMaskLinkedCommand', () => {
    it('toggles mask linked property and undoes properly', () => {
      const layer = createMockShapeLayer('mask-layer-1', 'Masked Layer');
      useLayerStore.getState().addLayer(layer);
      useLayerStore.getState().addMask(layer.id, 800, 600);

      expect(useLayerStore.getState().layers[0].mask?.linked).toBe(true);

      const cmd = new ToggleMaskLinkedCommand(layer.id);
      cmd.execute();
      expect(useLayerStore.getState().layers[0].mask?.linked).toBe(false);

      cmd.undo();
      expect(useLayerStore.getState().layers[0].mask?.linked).toBe(true);
    });
  });

  describe('Right-Click Layer Activation & Multi-Selection Preservation', () => {
    it('preserves multi-selection when right-clicking a layer already part of the selection', () => {
      const l1 = createMockShapeLayer('l1', 'Layer 1');
      const l2 = createMockShapeLayer('l2', 'Layer 2');
      const l3 = createMockShapeLayer('l3', 'Layer 3');

      useLayerStore.getState().setLayers([l1, l2, l3]);

      // Set multi-selection of l1 and l2, with l1 currently active
      useLayerStore.setState({
        selectedLayerIds: ['l1', 'l2'],
        activeLayerId: 'l1',
      });

      // Right-click l2 (which is part of the multi-selection)
      activateLayerWithSelectionPreservation('l2');

      const state = useLayerStore.getState();
      // Active layer must now be l2
      expect(state.activeLayerId).toBe('l2');
      // Multi-selection MUST be preserved!
      expect(state.selectedLayerIds).toEqual(['l1', 'l2']);
    });

    it('collapses selection to single layer when right-clicking an unselected layer', () => {
      const l1 = createMockShapeLayer('l1', 'Layer 1');
      const l2 = createMockShapeLayer('l2', 'Layer 2');
      const l3 = createMockShapeLayer('l3', 'Layer 3');

      useLayerStore.getState().setLayers([l1, l2, l3]);

      useLayerStore.setState({
        selectedLayerIds: ['l1', 'l2'],
        activeLayerId: 'l1',
      });

      // Right-click l3 (which is NOT part of the multi-selection)
      activateLayerWithSelectionPreservation('l3');

      const state = useLayerStore.getState();
      expect(state.activeLayerId).toBe('l3');
      expect(state.selectedLayerIds).toEqual(['l3']);
    });
  });

  describe('Action Availability Rules Engine (getActionAvailability)', () => {
    const unlockedLayer = createMockShapeLayer('u-1', 'Unlocked');
    const lockedLayer = createMockShapeLayer('l-1', 'Locked', true);

    it('enables all standard actions on an unlocked layer for editor', () => {
      expect(getActionAvailability('rename', unlockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('delete', unlockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('duplicate', unlockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('opacity', unlockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('blend-mode', unlockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('add-mask', unlockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('lock', unlockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('visibility', unlockedLayer, false).enabled).toBe(true);
    });

    it('disables destructive/mutative actions on locked layer and explains why', () => {
      const lockedActions = [
        'rename',
        'delete',
        'opacity',
        'blend-mode',
        'add-mask',
        'apply-mask',
        'delete-mask',
        'replace-image',
        'free-transform',
        'reorder-forward',
        'reorder-backward',
        'reorder-front',
        'reorder-back',
      ];

      for (const action of lockedActions) {
        const result = getActionAvailability(action, lockedLayer, false);
        expect(result.enabled).toBe(false);
        expect(result.reason).toBe('Layer is locked. Unlock to modify.');
      }
    });

    it('allows unlocking, visibility toggling, and duplicating on a locked layer', () => {
      // User must be able to unlock the layer!
      expect(getActionAvailability('lock', lockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('visibility', lockedLayer, false).enabled).toBe(true);
      expect(getActionAvailability('duplicate', lockedLayer, false).enabled).toBe(true);
    });

    it('disables mutative actions in viewer mode and allows read-only actions', () => {
      // Mutative actions disabled
      expect(getActionAvailability('rename', unlockedLayer, true).enabled).toBe(false);
      expect(getActionAvailability('delete', unlockedLayer, true).enabled).toBe(false);
      expect(getActionAvailability('duplicate', unlockedLayer, true).enabled).toBe(false);
      expect(getActionAvailability('opacity', unlockedLayer, true).enabled).toBe(false);
      expect(getActionAvailability('new-shape-layer', null, true).enabled).toBe(false);
      expect(getActionAvailability('paste', null, true, { canPaste: true }).enabled).toBe(false);

      // Read-only actions allowed in viewer mode
      expect(getActionAvailability('select-all', null, true).enabled).toBe(true);
      expect(getActionAvailability('zoom-in', null, true).enabled).toBe(true);
      expect(getActionAvailability('zoom-out', null, true).enabled).toBe(true);
      expect(getActionAvailability('fit-canvas', null, true).enabled).toBe(true);
      expect(getActionAvailability('reset-zoom', null, true).enabled).toBe(true);
      expect(getActionAvailability('edit-text-properties', unlockedLayer, true).enabled).toBe(true);
      expect(getActionAvailability('edit-shape-properties', unlockedLayer, true).enabled).toBe(true);
    });

    it('enforces layer reordering boundaries', () => {
      // Top layer
      const topResult = getActionAvailability('reorder-forward', unlockedLayer, false, { isAtTop: true });
      expect(topResult.enabled).toBe(false);
      expect(topResult.reason).toContain('top of the stack');

      const frontResult = getActionAvailability('reorder-front', unlockedLayer, false, { isAtTop: true });
      expect(frontResult.enabled).toBe(false);

      // Bottom layer
      const bottomResult = getActionAvailability('reorder-backward', unlockedLayer, false, { isAtBottom: true });
      expect(bottomResult.enabled).toBe(false);
      expect(bottomResult.reason).toContain('bottom of the stack');

      const backResult = getActionAvailability('reorder-back', unlockedLayer, false, { isAtBottom: true });
      expect(backResult.enabled).toBe(false);

      // Middle layer
      expect(getActionAvailability('reorder-forward', unlockedLayer, false, { isAtTop: false, isAtBottom: false }).enabled).toBe(true);
      expect(getActionAvailability('reorder-backward', unlockedLayer, false, { isAtTop: false, isAtBottom: false }).enabled).toBe(true);
    });

    it('handles canvas selection state availability', () => {
      // With selection
      expect(getActionAvailability('deselect', null, false, { hasSelection: true }).enabled).toBe(true);
      expect(getActionAvailability('invert-selection', null, false, { hasSelection: true }).enabled).toBe(true);
      expect(getActionAvailability('feather-selection', null, false, { hasSelection: true }).enabled).toBe(true);

      // Without selection
      expect(getActionAvailability('deselect', null, false, { hasSelection: false }).enabled).toBe(false);
      expect(getActionAvailability('invert-selection', null, false, { hasSelection: false }).enabled).toBe(false);
      expect(getActionAvailability('feather-selection', null, false, { hasSelection: false }).enabled).toBe(false);
    });

    it('handles paste clipboard availability', () => {
      expect(getActionAvailability('paste', null, false, { canPaste: true }).enabled).toBe(true);
      expect(getActionAvailability('paste', null, false, { canPaste: false }).enabled).toBe(false);
    });
  });
});
