import { ICommand } from './Command';
import { useLayerStore } from '@/store/layerStore';
import { ImageAdjustments, ImageLayer } from '@/types/layer';
import { nanoid } from 'nanoid';

function layerExists(layerId: string): boolean {
  return useLayerStore.getState().layers.some((l) => l.id === layerId);
}

export class ApplyAdjustmentsCommand implements ICommand {
  id: string;
  label: string;
  private layerId: string;
  private prevAdjustments: ImageAdjustments;
  private nextAdjustments: ImageAdjustments;

  constructor(
    layerId: string,
    prevAdjustments: ImageAdjustments,
    nextAdjustments: ImageAdjustments,
    label = 'Adjust Image'
  ) {
    this.id = `cmd-adjust-${nanoid(6)}`;
    this.label = label;
    this.layerId = layerId;
    this.prevAdjustments = prevAdjustments;
    this.nextAdjustments = nextAdjustments;
  }

  isNoOp(): boolean {
    try {
      return JSON.stringify(this.prevAdjustments) === JSON.stringify(this.nextAdjustments);
    } catch {
      return false;
    }
  }

  execute(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().updateLayer<ImageLayer>(this.layerId, {
      adjustments: this.nextAdjustments,
    });
  }

  undo(): void {
    if (!layerExists(this.layerId)) return;
    useLayerStore.getState().updateLayer<ImageLayer>(this.layerId, {
      adjustments: this.prevAdjustments,
    });
  }
}
