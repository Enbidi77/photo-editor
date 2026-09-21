import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  CollaborationAdapter,
  CollaborationUser,
  getRandomColor,
} from './adapter';
import { EditorOperation } from '@/types/operation';
import { Collaborator, RemoteCursor, RemoteSelection } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import {
  enqueueOperation,
  getPendingOperations,
  removePendingOperation,
} from './offlineQueue';

export class SupabaseRealtimeCollaborationAdapter implements CollaborationAdapter {
  private channel: RealtimeChannel | null = null;
  private projectId: string | null = null;
  private user: CollaborationUser | null = null;

  private operationSubscribers: Set<(op: EditorOperation) => void> = new Set();
  private cursorSubscribers: Set<(cursor: RemoteCursor) => void> = new Set();
  private selectionSubscribers: Set<(sel: RemoteSelection) => void> = new Set();
  private presenceSubscribers: Set<(collaborators: Collaborator[]) => void> = new Set();

  private lastCursorPublish = 0;
  private pendingCursor: { x: number; y: number; tool?: string } | null = null;
  private cursorTimer: any = null;

  async connect(projectId: string, user: CollaborationUser): Promise<void> {
    this.projectId = projectId;
    this.user = user;
    const store = useCollaborationStore.getState();
    store.setConnectionState('connecting');

    const supabase = getSupabaseBrowserClient();
    const channelName = `project:${projectId}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    });

    // 1. Listen for broadcasted document operations
    channel.on('broadcast', { event: 'document_operation' }, ({ payload }) => {
      const op = payload as EditorOperation;
      this.operationSubscribers.forEach((handler) => handler(op));
    });

    // 2. Listen for remote cursors
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const cursor = payload as RemoteCursor;
      store.updateRemoteCursor(cursor);
      this.cursorSubscribers.forEach((handler) => handler(cursor));
    });

    // 3. Listen for remote selections
    channel.on('broadcast', { event: 'selection' }, ({ payload }) => {
      const sel = payload as RemoteSelection;
      store.updateRemoteSelection(sel);
      this.selectionSubscribers.forEach((handler) => handler(sel));
    });

    // 4. Listen for presence sync (collaborators joining/leaving)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const collaborators: Collaborator[] = [];

      Object.entries(state).forEach(([userId, presences]) => {
        if (presences.length > 0) {
          const p = presences[0] as any;
          collaborators.push({
            userId,
            displayName: p.displayName || 'Collaborator',
            avatarUrl: p.avatarUrl || '',
            role: p.role || 'viewer',
            color: p.color || getRandomColor(userId),
            activeTool: p.activeTool,
            lastSeen: Date.now(),
          });
        }
      });

      store.setCollaborators(collaborators);
      this.presenceSubscribers.forEach((handler) => handler(collaborators));
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      store.removeRemoteCursor(key);
      store.removeRemoteSelection(key);
    });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        store.setConnectionState('connected');
        // Track own presence
        await channel.track({
          displayName: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          color: user.color,
        });
        // Flush any pending offline operations
        this.flushOfflineQueue();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        store.setConnectionState('error');
      } else if (status === 'CLOSED') {
        store.setConnectionState('disconnected');
      }
    });

    this.channel = channel;
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      const supabase = getSupabaseBrowserClient();
      await this.channel.untrack();
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.projectId = null;
    this.user = null;
    useCollaborationStore.getState().resetCollaboration();
  }

  async publishOperation(operation: EditorOperation): Promise<void> {
    const store = useCollaborationStore.getState();

    if (!this.channel || store.connectionState !== 'connected') {
      // Buffer in offline queue
      await enqueueOperation(operation);
      store.setPendingOperationsCount(store.pendingOperationsCount + 1);
      return;
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'document_operation',
        payload: operation,
      });
    } catch (err) {
      console.warn('Failed to broadcast operation, enqueuing offline:', err);
      await enqueueOperation(operation);
      store.setPendingOperationsCount(store.pendingOperationsCount + 1);
    }
  }

  subscribeOperations(handler: (op: EditorOperation) => void): () => void {
    this.operationSubscribers.add(handler);
    return () => this.operationSubscribers.delete(handler);
  }

  // Throttled cursor publishing (approx 15-20 updates/sec)
  async publishCursor(cursor: { x: number; y: number; tool?: string }): Promise<void> {
    if (!this.channel || !this.user) return;

    this.pendingCursor = cursor;
    const now = Date.now();

    if (now - this.lastCursorPublish > 50) {
      this.sendCursorNow();
    } else if (!this.cursorTimer) {
      this.cursorTimer = setTimeout(() => {
        this.cursorTimer = null;
        this.sendCursorNow();
      }, 50);
    }
  }

  private sendCursorNow() {
    if (!this.channel || !this.user || !this.pendingCursor) return;
    this.lastCursorPublish = Date.now();
    const payload: RemoteCursor = {
      userId: this.user.id,
      displayName: this.user.name,
      color: this.user.color,
      x: this.pendingCursor.x,
      y: this.pendingCursor.y,
      tool: this.pendingCursor.tool,
    };

    this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload,
    });
  }

  subscribeCursors(handler: (cursor: RemoteCursor) => void): () => void {
    this.cursorSubscribers.add(handler);
    return () => this.cursorSubscribers.delete(handler);
  }

  async publishSelection(layerId: string): Promise<void> {
    if (!this.channel || !this.user) return;
    const payload: RemoteSelection = {
      userId: this.user.id,
      layerId,
      color: this.user.color,
    };
    await this.channel.send({
      type: 'broadcast',
      event: 'selection',
      payload,
    });
  }

  subscribeSelections(handler: (selection: RemoteSelection) => void): () => void {
    this.selectionSubscribers.add(handler);
    return () => this.selectionSubscribers.delete(handler);
  }

  async publishPresence(activeTool?: string): Promise<void> {
    if (!this.channel || !this.user) return;
    await this.channel.track({
      displayName: this.user.name,
      avatarUrl: this.user.avatarUrl,
      role: this.user.role,
      color: this.user.color,
      activeTool,
    });
  }

  subscribePresence(handler: (collaborators: Collaborator[]) => void): () => void {
    this.presenceSubscribers.add(handler);
    return () => this.presenceSubscribers.delete(handler);
  }

  private async flushOfflineQueue() {
    if (!this.projectId || !this.channel) return;
    const store = useCollaborationStore.getState();

    try {
      const pending = await getPendingOperations(this.projectId);
      if (pending.length === 0) return;

      for (const op of pending) {
        await this.channel.send({
          type: 'broadcast',
          event: 'document_operation',
          payload: op,
        });
        await removePendingOperation(op.id);
      }
      store.setPendingOperationsCount(0);
    } catch (err) {
      console.error('Failed to flush offline queue:', err);
    }
  }
}
