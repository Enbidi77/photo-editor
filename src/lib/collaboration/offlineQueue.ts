import { openDB, IDBPDatabase } from 'idb';
import { EditorOperation } from '@/types/operation';

const QUEUE_DB_NAME = 'pixelforge_offline_queue';
const STORE_NAME = 'pending_operations';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getQueueDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(QUEUE_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueOperation(op: EditorOperation): Promise<void> {
  try {
    const db = await getQueueDB();
    await db.put(STORE_NAME, op);
  } catch (err) {
    console.error('Failed to enqueue offline operation:', err);
  }
}

export async function getPendingOperations(projectId: string): Promise<EditorOperation[]> {
  try {
    const db = await getQueueDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'projectId', projectId);
    return all.sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

export async function removePendingOperation(id: string): Promise<void> {
  try {
    const db = await getQueueDB();
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.error('Failed to remove pending operation:', err);
  }
}

export async function clearPendingOperations(projectId: string): Promise<void> {
  try {
    const ops = await getPendingOperations(projectId);
    const db = await getQueueDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const op of ops) {
      await tx.store.delete(op.id);
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to clear pending operations:', err);
  }
}
