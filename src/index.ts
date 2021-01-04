import { undo, redo } from './undo';

export {
  createBackup,
  loadBackup,
  BackupSaveFunction,
  BackupLoadFunction,
  SliceBackupInterface,
  StateBackupInterface,
} from './backup';
export { createBackupSlice } from './slice';
export { CopySliceBackupInterface } from './def';
export {
  createUndoableReducer,
  createUndoableAction,
  iterateUndoHistory,
} from './undo';
export const UndoActions = { undo, redo };
