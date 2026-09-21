import { ICommand } from './Command';
import { useLayerStore } from '@/store/layerStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import { Layer, BlendMode } from '@/types/layer';
import { nanoid } from 'nanoid';
import { OperationFactory } from '@/lib/collaboration/operations';
import { operationBridge } from '@/lib/collaboration/operationBridge';

function shouldBroadcast(): { projectId: string; userId: string } | null {
  const { userRole } = useCollaborationStore.getState();
  if (userRole === 'viewer') return null;

  const { projectId, userId } = operationBridge.getContext();
  if (!projectId || !userId) return null;
  return { projectId, userId };
}

export class AddLayerCommand implements ICommand {
  id: string;
  label: string;
  private layer: Layer;
  private index: number;

  constructor(layer: Layer, index = 0) {
    this.id = `cmd-add-layer-${nanoid(6)}`;
    this.label = `New ${layer.type.toLowerCase()} layer`;
    this.layer = layer;
    this.index = index;
  }

  execute(): void {
    useLayerStore.getState().addLayer(this.layer, this.index);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.addLayer(ctx.projectId, ctx.userId, this.layer, this.index)
      );
    }
  }

  undo(): void {
    useLayerStore.getState().removeLayer(this.layer.id);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.deleteLayer(ctx.projectId, ctx.userId, this.layer.id)
      );
    }
  }
}

export class DeleteLayerCommand implements ICommand {
  id: string;
  label: string;
  private layer: Layer;
  private index: number;

  constructor(layer: Layer) {
    this.id = `cmd-delete-layer-${nanoid(6)}`;
    this.label = `Delete ${layer.name}`;
    this.layer = layer;
    this.index = useLayerStore.getState().layers.findIndex((l) => l.id === layer.id);
  }

  execute(): void {
    useLayerStore.getState().removeLayer(this.layer.id);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.deleteLayer(ctx.projectId, ctx.userId, this.layer.id)
      );
    }
  }

  undo(): void {
    useLayerStore.getState().addLayer(this.layer, Math.max(0, this.index));
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.addLayer(ctx.projectId, ctx.userId, this.layer, Math.max(0, this.index))
      );
    }
  }
}

export class TransformLayerCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private prevTransform: { x: number; y: number; width: number; height: number; rotation: number; scaleX?: number; scaleY?: number };
  private newTransform: { x: number; y: number; width: number; height: number; rotation: number; scaleX?: number; scaleY?: number };

  constructor(
    layerId: string,
    prevTransform: { x: number; y: number; width: number; height: number; rotation: number; scaleX?: number; scaleY?: number },
    newTransform: { x: number; y: number; width: number; height: number; rotation: number; scaleX?: number; scaleY?: number }
  ) {
    this.id = `cmd-transform-${nanoid(6)}`;
    this.label = 'Free Transform';
    this.layerId = layerId;
    this.prevTransform = prevTransform;
    this.newTransform = newTransform;
  }

  execute(): void {
    useLayerStore.getState().updateLayer(this.layerId, this.newTransform);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.transformLayer(ctx.projectId, ctx.userId, this.layerId, this.newTransform)
      );
    }
  }

  undo(): void {
    useLayerStore.getState().updateLayer(this.layerId, this.prevTransform);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.transformLayer(ctx.projectId, ctx.userId, this.layerId, this.prevTransform)
      );
    }
  }
}

export class ChangeOpacityCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private prevOpacity: number;
  private newOpacity: number;

  constructor(layerId: string, prevOpacity: number, newOpacity: number) {
    this.id = `cmd-opacity-${nanoid(6)}`;
    this.label = 'Change Opacity';
    this.layerId = layerId;
    this.prevOpacity = prevOpacity;
    this.newOpacity = newOpacity;
  }

  execute(): void {
    useLayerStore.getState().setLayerOpacity(this.layerId, this.newOpacity);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateOpacity(ctx.projectId, ctx.userId, this.layerId, this.newOpacity)
      );
    }
  }

  undo(): void {
    useLayerStore.getState().setLayerOpacity(this.layerId, this.prevOpacity);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateOpacity(ctx.projectId, ctx.userId, this.layerId, this.prevOpacity)
      );
    }
  }
}

export class ChangeBlendModeCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private prevBlend: BlendMode;
  private newBlend: BlendMode;

  constructor(layerId: string, prevBlend: BlendMode, newBlend: BlendMode) {
    this.id = `cmd-blend-${nanoid(6)}`;
    this.label = 'Change Blend Mode';
    this.layerId = layerId;
    this.prevBlend = prevBlend;
    this.newBlend = newBlend;
  }

  execute(): void {
    useLayerStore.getState().setLayerBlendMode(this.layerId, this.newBlend);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateBlendMode(ctx.projectId, ctx.userId, this.layerId, this.newBlend)
      );
    }
  }

  undo(): void {
    useLayerStore.getState().setLayerBlendMode(this.layerId, this.prevBlend);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateBlendMode(ctx.projectId, ctx.userId, this.layerId, this.prevBlend)
      );
    }
  }
}

export class ReorderLayerCommand implements ICommand {
  id: string;
  label: string;
  private startIndex: number;
  private endIndex: number;

  constructor(startIndex: number, endIndex: number) {
    this.id = `cmd-reorder-${nanoid(6)}`;
    this.label = 'Reorder Layer';
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  execute(): void {
    useLayerStore.getState().reorderLayers(this.startIndex, this.endIndex);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.reorderLayer(ctx.projectId, ctx.userId, this.startIndex, this.endIndex)
      );
    }
  }

  undo(): void {
    useLayerStore.getState().reorderLayers(this.endIndex, this.startIndex);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.reorderLayer(ctx.projectId, ctx.userId, this.endIndex, this.startIndex)
      );
    }
  }
}

export class UpdateLayerPropertiesCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private prevProps: Partial<Layer>;
  private nextProps: Partial<Layer>;

  constructor(layerId: string, prevProps: Partial<Layer>, nextProps: Partial<Layer>, label = 'Update Layer') {
    this.id = `cmd-update-layer-${nanoid(6)}`;
    this.label = label;
    this.layerId = layerId;
    this.prevProps = prevProps;
    this.nextProps = nextProps;
  }

  execute(): void {
    useLayerStore.getState().updateLayer(this.layerId, this.nextProps);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateLayer(ctx.projectId, ctx.userId, this.layerId, this.nextProps)
      );
    }
  }

  undo(): void {
    useLayerStore.getState().updateLayer(this.layerId, this.prevProps);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateLayer(ctx.projectId, ctx.userId, this.layerId, this.prevProps)
      );
    }
  }
}
