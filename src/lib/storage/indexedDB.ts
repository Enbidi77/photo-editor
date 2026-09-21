import { openDB, IDBPDatabase } from 'idb';
import { PixelForgeProject, RecentProjectSummary } from '@/types/project';

const DB_NAME = 'pixelforge_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProjectToDB(project: PixelForgeProject): Promise<void> {
  const db = await getDB();
  await db.put(STORE_PROJECTS, project);
}

export async function getProjectFromDB(id: string): Promise<PixelForgeProject | undefined> {
  const db = await getDB();
  return db.get(STORE_PROJECTS, id);
}

export async function getAllProjectsFromDB(): Promise<PixelForgeProject[]> {
  const db = await getDB();
  return db.getAll(STORE_PROJECTS);
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_PROJECTS, id);
}

export async function getRecentProjectsList(): Promise<RecentProjectSummary[]> {
  try {
    const projects = await getAllProjectsFromDB();
    return projects
      .map((p) => ({
        id: p.id,
        name: p.document.name,
        width: p.document.width,
        height: p.document.height,
        updatedAt: p.updatedAt,
        thumbnail: p.thumbnail,
        layerCount: p.layers.length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Failed to load recent projects:', err);
    return [];
  }
}
