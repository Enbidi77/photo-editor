import { ICommand } from './Command';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';
import { useCollaborationStore } from '@/store/collaborationStore';
import { DocumentMeta } from '@/types/document';
import { Layer } from '@/types/layer';
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

  isNoOp(): boolean {
    return (
      this.prevDocMeta.width === this.nextDocMeta.width &&
      this.prevDocMeta.height === this.nextDocMeta.height &&
      JSON.stringify(this.prevLayers) === JSON.stringify(this.nextLayers)
    );
  }

  execute(): void {
    useDocumentStore.getState().setDocument(this.nextDocMeta);
    useLayerStore.getState().setLayers(this.nextLayers);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateDocument(ctx.projectId, ctx.userId, {
          width: this.nextDocMeta.width,
          height: this.nextDocMeta.height,
        })
      );
    }
  }

  undo(): void {
    useDocumentStore.getState().setDocument(this.prevDocMeta);
    useLayerStore.getState().setLayers(this.prevLayers);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateDocument(ctx.projectId, ctx.userId, {
          width: this.prevDocMeta.width,
          height: this.prevDocMeta.height,
        })
      );
    }
  }
}

export class ResizeDocumentCommand implements ICommand {
  id: string;
  label: string;
  private prevDocMeta: DocumentMeta;
  private nextDocMeta: DocumentMeta;

  constructor(
    prevDocMeta: DocumentMeta,
    nextDocMeta: DocumentMeta,
    label = 'Resize Canvas'
  ) {
    this.id = `cmd-resize-doc-${nanoid(6)}`;
    this.label = label;
    this.prevDocMeta = prevDocMeta;
    this.nextDocMeta = nextDocMeta;
  }

  isNoOp(): boolean {
    return (
      this.prevDocMeta.width === this.nextDocMeta.width &&
      this.prevDocMeta.height === this.nextDocMeta.height &&
      this.prevDocMeta.resolution === this.nextDocMeta.resolution &&
      this.prevDocMeta.backgroundColor === this.nextDocMeta.backgroundColor
    );
  }

  execute(): void {
    useDocumentStore.getState().setDocument(this.nextDocMeta);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateDocument(ctx.projectId, ctx.userId, {
          width: this.nextDocMeta.width,
          height: this.nextDocMeta.height,
          backgroundColor: this.nextDocMeta.backgroundColor,
        })
      );
    }
  }

  undo(): void {
    useDocumentStore.getState().setDocument(this.prevDocMeta);
    const ctx = shouldBroadcast();
    if (ctx) {
      operationBridge.broadcast(
        OperationFactory.updateDocument(ctx.projectId, ctx.userId, {
          width: this.prevDocMeta.width,
          height: this.prevDocMeta.height,
          backgroundColor: this.prevDocMeta.backgroundColor,
        })
      );
    }
  }
}
