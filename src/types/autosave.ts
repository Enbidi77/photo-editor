import { UserRole } from './auth';
import { IProjectRepository } from '@/lib/storage/projectRepository';
import { RemoteProjectRepository } from '@/lib/projects/remoteProjectRepository';

export type AutosaveStatus =
  | 'idle'
  | 'saved'
  | 'saving'
  | 'saved-locally-waiting-sync'
  | 'offline'
  | 'failed-retrying';

export interface AutosaveState {
  status: AutosaveStatus;
  statusMessage: string;
  isDirty: boolean;
  lastSavedTime: number | null;
  lastError: string | null;
}

export type SaveTrigger = 'debounce' | 'interval' | 'manual' | 'lifecycle';

export interface SaveResult {
  success: boolean;
  error?: string;
  isStale?: boolean;
  savedLocally: boolean;
  savedRemotely: boolean;
}

export interface AutosaveOptions {
  projectId: string | null;
  userRole?: UserRole;
  debounceMs?: number;
  maxIntervalMs?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  enabled?: boolean;
  localRepository?: IProjectRepository;
  remoteRepository?: RemoteProjectRepository;
}
