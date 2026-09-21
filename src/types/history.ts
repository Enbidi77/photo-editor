export interface ICommand {
  id: string;
  label: string;
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
}

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
}
