import { PixelForgeProject, RecentProjectSummary } from '@/types/project';
import {
  saveProjectToDB,
  getProjectFromDB,
  getAllProjectsFromDB,
  deleteProjectFromDB,
  getRecentProjectsList,
} from './indexedDB';

export interface IProjectRepository {
  save(project: PixelForgeProject): Promise<void>;
  get(id: string): Promise<PixelForgeProject | undefined>;
  getAll(): Promise<PixelForgeProject[]>;
  getRecent(): Promise<RecentProjectSummary[]>;
  delete(id: string): Promise<void>;
}

export class LocalProjectRepository implements IProjectRepository {
  async save(project: PixelForgeProject): Promise<void> {
    return saveProjectToDB(project);
  }

  async get(id: string): Promise<PixelForgeProject | undefined> {
    return getProjectFromDB(id);
  }

  async getAll(): Promise<PixelForgeProject[]> {
    return getAllProjectsFromDB();
  }

  async getRecent(): Promise<RecentProjectSummary[]> {
    return getRecentProjectsList();
  }

  async delete(id: string): Promise<void> {
    return deleteProjectFromDB(id);
  }
}

// Default singleton instance
export const projectRepository: IProjectRepository = new LocalProjectRepository();
