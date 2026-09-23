import { ICommand } from './Command';
import { useLayerStore } from '@/store/layerStore';
import { MaskData } from '@/types/layer';
import { nanoid } from 'nanoid';

function layerExists(layerId: string): boolean {
  return useLayerStore.getState().layers.some((l) => l.id === layerId);
}

export class AddMaskCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private docWidth: number;
  private docHeight: number;

  constructor(layerId: string, docWidth: number, docHeight: number) {
    this.id = `cmd-add-mask-${nanoid(6)}`;
    this.label = 'Add Layer Mask';
    this.layerId = layerId;
    this.docWidth = docWidth;
    this.docHeight = docHeight;
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    const layer = useLayerStore.getState().layers.find((l) => l.id === this.layerId);
    if (layer?.mask) return; // already has mask
    useLayerStore.getState().addMask(this.layerId, this.docWidth, this.docHeight);
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().removeMask(this.layerId);
  }
}

export class RemoveMaskCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private previousMask: MaskData;

  constructor(layerId: string, previousMask: MaskData) {
    this.id = `cmd-remove-mask-${nanoid(6)}`;
    this.label = 'Delete Layer Mask';
    this.layerId = layerId;
    this.previousMask = previousMask;
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().removeMask(this.layerId);
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().updateLayer(this.layerId, { mask: this.previousMask });
  }
}

export class ToggleMaskEnabledCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;

  constructor(layerId: string) {
    this.id = `cmd-toggle-mask-${nanoid(6)}`;
    this.label = 'Toggle Layer Mask';
    this.layerId = layerId;
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().toggleMaskEnabled(this.layerId);
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().toggleMaskEnabled(this.layerId);
  }
}

export class UpdateMaskDataCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private previousDataUrl: string;
  private nextDataUrl: string;

  constructor(layerId: string, previousDataUrl: string, nextDataUrl: string) {
    this.id = `cmd-update-mask-${nanoid(6)}`;
    this.label = 'Paint Mask';
    this.layerId = layerId;
    this.previousDataUrl = previousDataUrl;
    this.nextDataUrl = nextDataUrl;
  }

  isNoOp(): boolean {
    return this.previousDataUrl === this.nextDataUrl;
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().updateMaskData(this.layerId, this.nextDataUrl);
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().updateMaskData(this.layerId, this.previousDataUrl);
  }
}

export class ApplyMaskCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private previousMask: MaskData;

  constructor(layerId: string, previousMask: MaskData) {
    this.id = `cmd-apply-mask-${nanoid(6)}`;
    this.label = 'Apply Layer Mask';
    this.layerId = layerId;
    this.previousMask = previousMask;
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().applyMask(this.layerId);
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().updateLayer(this.layerId, { mask: this.previousMask });
  }
}

export class ToggleMaskLinkedCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;

  constructor(layerId: string) {
    this.id = `cmd-toggle-mask-linked-${nanoid(6)}`;
    this.label = 'Toggle Mask Link';
    this.layerId = layerId;
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().toggleMaskLinked(this.layerId);
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().toggleMaskLinked(this.layerId);
  }
}

export class ToggleMaskInvertedCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;

  constructor(layerId: string) {
    this.id = `cmd-toggle-mask-inverted-${nanoid(6)}`;
    this.label = 'Invert Layer Mask';
    this.layerId = layerId;
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    const layer = useLayerStore.getState().layers.find((l) => l.id === this.layerId);
    if (!layer?.mask) return;
    useLayerStore.getState().updateLayer(this.layerId, {
      mask: { ...layer.mask, inverted: !layer.mask.inverted },
    });
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    const layer = useLayerStore.getState().layers.find((l) => l.id === this.layerId);
    if (!layer?.mask) return;
    useLayerStore.getState().updateLayer(this.layerId, {
      mask: { ...layer.mask, inverted: !layer.mask.inverted },
    });
  }
}

