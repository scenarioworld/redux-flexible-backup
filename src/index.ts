import { undo, redo, apply } from './undo';

export {
  createBackup,
  loadBackup,
  BackupSaveFunction,
  BackupLoadFunction,
  SliceBackupInterface,
  StateBackupInterface,
} from './backup';
export {
  createBackupSlice,
  CreateBackupSliceOptions,
  SliceAddon,
} from './slice';
export { CopySliceBackupInterface } from './def';
export {
  createUndoableReducer,
  createUndoableAction,
  iterateUndoHistory,
} from './undo';
export const UndoActions = { undo, redo, apply };
export { loadFromStorage, saveToStorage } from './storage';
export {
  loadInitialStateFromSession,
  createSessionMiddleware,
} from './session';
