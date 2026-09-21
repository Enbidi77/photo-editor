import {
  CollaborationAdapter,
  CollaborationUser,
} from './adapter';
import { EditorOperation } from '@/types/operation';
import { Collaborator, RemoteCursor, RemoteSelection } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';

export class LocalCollaborationAdapter implements CollaborationAdapter {
  private channelName: string | null = null;
  private bc: BroadcastChannel | null = null;
  private user: CollaborationUser | null = null;

  private operationSubscribers: Set<(op: EditorOperation) => void> = new Set();
  private cursorSubscribers: Set<(cursor: RemoteCursor) => void> = new Set();
  private selectionSubscribers: Set<(sel: RemoteSelection) => void> = new Set();
  private presenceSubscribers: Set<(collaborators: Collaborator[]) => void> = new Set();

  async connect(projectId: string, user: CollaborationUser): Promise<void> {
    this.channelName = `pixelforge:local:${projectId}`;
    this.user = user;
    const store = useCollaborationStore.getState();
    store.setConnectionState('connected');

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.bc = new BroadcastChannel(this.channelName);
      this.bc.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'operation') {
          this.operationSubscribers.forEach((h) => h(payload));
        } else if (type === 'cursor') {
          store.updateRemoteCursor(payload);
          this.cursorSubscribers.forEach((h) => h(payload));
        } else if (type === 'selection') {
          store.updateRemoteSelection(payload);
          this.selectionSubscribers.forEach((h) => h(payload));
        } else if (type === 'presence') {
          this.presenceSubscribers.forEach((h) => h(payload));
        }
      };
    }

    store.setCollaborators([
      {
        userId: user.id,
        displayName: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        color: user.color,
        lastSeen: Date.now(),
      },
    ]);
  }

  async disconnect(): Promise<void> {
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    useCollaborationStore.getState().resetCollaboration();
  }

  async publishOperation(operation: EditorOperation): Promise<void> {
    if (this.bc) {
      this.bc.postMessage({ type: 'operation', payload: operation });
    }
  }

  subscribeOperations(handler: (op: EditorOperation) => void): () => void {
    this.operationSubscribers.add(handler);
    return () => this.operationSubscribers.delete(handler);
  }

  async publishCursor(cursor: { x: number; y: number; tool?: string }): Promise<void> {
    if (!this.bc || !this.user) return;
    const payload: RemoteCursor = {
      userId: this.user.id,
      displayName: this.user.name,
      color: this.user.color,
      x: cursor.x,
      y: cursor.y,
      tool: cursor.tool,
    };
    this.bc.postMessage({ type: 'cursor', payload });
  }

  subscribeCursors(handler: (cursor: RemoteCursor) => void): () => void {
    this.cursorSubscribers.add(handler);
    return () => this.cursorSubscribers.delete(handler);
  }

  async publishSelection(layerId: string): Promise<void> {
    if (!this.bc || !this.user) return;
    const payload: RemoteSelection = {
      userId: this.user.id,
      layerId,
      color: this.user.color,
    };
    this.bc.postMessage({ type: 'selection', payload });
  }

  subscribeSelections(handler: (selection: RemoteSelection) => void): () => void {
    this.selectionSubscribers.add(handler);
    return () => this.selectionSubscribers.delete(handler);
  }

  async publishPresence(activeTool?: string): Promise<void> {
    if (!this.bc || !this.user) return;
    // Notify presence
  }

  subscribePresence(handler: (collaborators: Collaborator[]) => void): () => void {
    this.presenceSubscribers.add(handler);
    return () => this.presenceSubscribers.delete(handler);
  }
}
