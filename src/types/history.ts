export interface ICommand {
  id: string;
  label: string;
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
  isNoOp?(): boolean;
}

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
}
