import { EditorOperation } from '@/types/operation';

type OperationSubscriber = (op: EditorOperation) => void | Promise<void>;

class OperationBridge {
  private subscribers = new Set<OperationSubscriber>();
  private currentProjectId: string | null = null;
  private currentUserId: string | null = null;
  private currentClientId: string | null = null;

  setContext(projectId: string | null, userId: string | null, clientId?: string | null) {
    this.currentProjectId = projectId;
    this.currentUserId = userId;
    this.currentClientId = clientId || null;
  }

  getContext() {
    return {
      projectId: this.currentProjectId,
      userId: this.currentUserId,
      clientId: this.currentClientId,
    };
  }

  subscribe(subscriber: OperationSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  broadcast(op: EditorOperation): void {
    if (!op.clientId && this.currentClientId) {
      op.clientId = this.currentClientId;
    }
    this.subscribers.forEach((sub) => {
      try {
        sub(op);
      } catch (err) {
        console.error('Operation bridge dispatch error:', err);
      }
    });
  }
}

export const operationBridge = new OperationBridge();
