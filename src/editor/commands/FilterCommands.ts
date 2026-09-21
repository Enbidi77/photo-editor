import { ICommand } from './Command';
import { useLayerStore } from '@/store/layerStore';
import { ImageAdjustments, ImageLayer } from '@/types/layer';
import { nanoid } from 'nanoid';

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

  execute(): void {
    useLayerStore.getState().updateLayer<ImageLayer>(this.layerId, {
      adjustments: this.nextAdjustments,
    });
  }

  undo(): void {
    useLayerStore.getState().updateLayer<ImageLayer>(this.layerId, {
      adjustments: this.prevAdjustments,
    });
  }
}
