import { EditorOperation } from '@/types/operation';

type OperationSubscriber = (op: EditorOperation) => void | Promise<void>;

class OperationBridge {
  private subscribers = new Set<OperationSubscriber>();
  private currentProjectId: string | null = null;
  private currentUserId: string | null = null;

  setContext(projectId: string | null, userId: string | null) {
    this.currentProjectId = projectId;
    this.currentUserId = userId;
  }

  getContext() {
    return {
      projectId: this.currentProjectId,
      userId: this.currentUserId,
    };
  }

  subscribe(subscriber: OperationSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  broadcast(op: EditorOperation): void {
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
