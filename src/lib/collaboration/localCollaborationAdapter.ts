import {
  CollaborationAdapter,
  CollaborationUser,
} from './adapter';
import { EditorOperation } from '@/types/operation';
import { Collaborator, RemoteCursor, RemoteSelection } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useDocumentStore } from '@/store/documentStore';
import { useLayerStore } from '@/store/layerStore';

export class LocalCollaborationAdapter implements CollaborationAdapter {
  private channelName: string | null = null;
  private bc: BroadcastChannel | null = null;
  private user: CollaborationUser | null = null;
  private sessionUserId: string | null = null;
  private peers: Map<string, Collaborator> = new Map();
  private unloadListener: (() => void) | null = null;

  private operationSubscribers: Set<(op: EditorOperation) => void> = new Set();
  private cursorSubscribers: Set<(cursor: RemoteCursor) => void> = new Set();
  private selectionSubscribers: Set<(sel: RemoteSelection) => void> = new Set();
  private presenceSubscribers: Set<(collaborators: Collaborator[]) => void> = new Set();

  private toCollaborator(user: CollaborationUser, sessionUserId: string, activeTool?: string): Collaborator {
    return {
      userId: sessionUserId,
      displayName: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      color: user.color,
      activeTool,
      lastSeen: Date.now(),
    };
  }

  async connect(projectId: string, user: CollaborationUser): Promise<void> {
    this.channelName = `pixelforge:local:${projectId}`;
    this.user = user;
    this.sessionUserId = user.clientId ? `${user.id}:${user.clientId}` : user.id;

    const store = useCollaborationStore.getState();
    store.setConnectionState('connected');

    const myCollab = this.toCollaborator(user, this.sessionUserId);
    this.peers.set(this.sessionUserId, myCollab);
    store.setCollaborators(Array.from(this.peers.values()));

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.bc = new BroadcastChannel(this.channelName);
      this.bc.onmessage = (event) => {
        const { type, payload, targetId, requesterId } = event.data || {};

        if (type === 'operation') {
          this.operationSubscribers.forEach((h) => h(payload));
        } else if (type === 'cursor') {
          if (payload && payload.userId !== this.sessionUserId) {
            store.updateRemoteCursor(payload);
            this.cursorSubscribers.forEach((h) => h(payload));
          }
        } else if (type === 'selection') {
          if (payload && payload.userId !== this.sessionUserId) {
            store.updateRemoteSelection(payload);
            this.selectionSubscribers.forEach((h) => h(payload));
          }
        } else if (type === 'presence_join') {
          if (payload && payload.userId !== this.sessionUserId) {
            this.peers.set(payload.userId, payload);
            const currentList = Array.from(this.peers.values());
            store.setCollaborators(currentList);
            this.presenceSubscribers.forEach((h) => h(currentList));

            // Announce ourselves back to the newly joined peer
            if (this.bc && this.user && this.sessionUserId) {
              const myPresence = this.peers.get(this.sessionUserId) || this.toCollaborator(this.user, this.sessionUserId);
              this.bc.postMessage({ type: 'presence_announce', payload: myPresence });
            }
          }
        } else if (type === 'presence_announce') {
          if (payload && payload.userId !== this.sessionUserId) {
            this.peers.set(payload.userId, payload);
            const currentList = Array.from(this.peers.values());
            store.setCollaborators(currentList);
            this.presenceSubscribers.forEach((h) => h(currentList));
          }
        } else if (type === 'presence_update') {
          if (payload && payload.userId !== this.sessionUserId) {
            const peer = this.peers.get(payload.userId);
            if (peer) {
              peer.activeTool = payload.activeTool;
              peer.lastSeen = Date.now();
              const currentList = Array.from(this.peers.values());
              store.setCollaborators(currentList);
              this.presenceSubscribers.forEach((h) => h(currentList));
            }
          }
        } else if (type === 'presence_leave') {
          if (payload?.userId && payload.userId !== this.sessionUserId) {
            this.peers.delete(payload.userId);
            store.removeRemoteCursor(payload.userId);
            store.removeRemoteSelection(payload.userId);
            const currentList = Array.from(this.peers.values());
            store.setCollaborators(currentList);
            this.presenceSubscribers.forEach((h) => h(currentList));
          }
        } else if (type === 'sync_request') {
          // Another tab just joined and wants the latest state
          if (requesterId && requesterId !== this.sessionUserId && this.bc) {
            try {
              const currentDoc = useDocumentStore.getState().document;
              const currentLayers = useLayerStore.getState().layers;
              if (currentDoc && currentLayers.length > 0) {
                this.bc.postMessage({
                  type: 'sync_response',
                  targetId: requesterId,
                  payload: {
                    document: currentDoc,
                    layers: currentLayers,
                  },
                });
              }
            } catch {
              // Ignore store read errors
            }
          }
        } else if (type === 'sync_response') {
          // Received latest state from an active peer
          if (targetId === this.sessionUserId && payload) {
            if (payload.document) {
              useDocumentStore.getState().setDocument({
                ...payload.document,
                isDirty: false,
              });
            }
            if (Array.isArray(payload.layers) && payload.layers.length > 0) {
              useLayerStore.getState().setLayers(payload.layers);
            }
          }
        }
      };

      // Announce join and request latest state from existing peers
      this.bc.postMessage({ type: 'presence_join', payload: myCollab });
      this.bc.postMessage({ type: 'sync_request', requesterId: this.sessionUserId });

      // Clean up presence on tab close/unload
      const handleUnload = () => {
        if (this.bc && this.sessionUserId) {
          try {
            this.bc.postMessage({ type: 'presence_leave', payload: { userId: this.sessionUserId } });
          } catch {
            // Ignore unload errors
          }
        }
      };

      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
      this.unloadListener = () => {
        window.removeEventListener('beforeunload', handleUnload);
        window.removeEventListener('pagehide', handleUnload);
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.unloadListener) {
      this.unloadListener();
      this.unloadListener = null;
    }

    if (this.bc) {
      if (this.sessionUserId) {
        try {
          this.bc.postMessage({ type: 'presence_leave', payload: { userId: this.sessionUserId } });
        } catch {
          // Ignore close error
        }
      }
      this.bc.close();
      this.bc = null;
    }

    this.peers.clear();
    this.sessionUserId = null;
    this.user = null;
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
    if (!this.bc || !this.user || !this.sessionUserId) return;
    const payload: RemoteCursor = {
      userId: this.sessionUserId,
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
    if (!this.bc || !this.user || !this.sessionUserId) return;
    const payload: RemoteSelection = {
      userId: this.sessionUserId,
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
    if (!this.user || !this.sessionUserId) return;
    const myCollab = this.peers.get(this.sessionUserId);
    if (myCollab) {
      myCollab.activeTool = activeTool;
      myCollab.lastSeen = Date.now();
      useCollaborationStore.getState().setCollaborators(Array.from(this.peers.values()));
    }
    if (this.bc) {
      this.bc.postMessage({
        type: 'presence_update',
        payload: { userId: this.sessionUserId, activeTool },
      });
    }
  }

  subscribePresence(handler: (collaborators: Collaborator[]) => void): () => void {
    this.presenceSubscribers.add(handler);
    return () => this.presenceSubscribers.delete(handler);
  }
}
