import { ICommand } from './Command';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { DocumentMeta } from '@/types/document';
import { Layer } from '@/types/layer';
import { nanoid } from 'nanoid';

export class CropDocumentCommand implements ICommand {
  id: string;
  label: string;
  private prevDocMeta: DocumentMeta;
  private nextDocMeta: DocumentMeta;
  private prevLayers: Layer[];
  private nextLayers: Layer[];

  constructor(
    prevDocMeta: DocumentMeta,
    nextDocMeta: DocumentMeta,
    prevLayers: Layer[],
    nextLayers: Layer[]
  ) {
    this.id = `cmd-crop-${nanoid(6)}`;
    this.label = 'Crop Canvas';
    this.prevDocMeta = prevDocMeta;
    this.nextDocMeta = nextDocMeta;
    this.prevLayers = prevLayers;
    this.nextLayers = nextLayers;
  }

  execute(): void {
    useDocumentStore.getState().setDocument(this.nextDocMeta);
    useLayerStore.getState().setLayers(this.nextLayers);
  }

  undo(): void {
    useDocumentStore.getState().setDocument(this.prevDocMeta);
    useLayerStore.getState().setLayers(this.prevLayers);
  }
}
