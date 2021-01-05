import {
  createSlice,
  CreateSliceOptions,
  Slice,
  SliceCaseReducers,
  ValidateSliceCaseReducers,
} from '@reduxjs/toolkit';
import {
  BackupSaveFunction,
  BackupLoadFunction,
  SliceBackupInterface,
} from './backup';

interface SliceAddon<Slice> {
  /**
   * Creates a new backup interface for this slice. @see createBackup
   * @param save Save method to conver this slice into a storage object
   * @param load Load method to recover the slice state from a storage object (created by save)
   */
  createBackupInterface<Stored>(
    save: BackupSaveFunction<Slice, Stored>,
    load: BackupLoadFunction<Slice, Stored>
  ): SliceBackupInterface<Slice, Stored>;
}

/**
 * Extended slice options to add support for automatically creating undoable actions
 */
export interface CreateBackupSliceOptions<
  State = any,
  CR extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  UndoCR extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string
> extends CreateSliceOptions<State, CR, Name> {
  /** Similar to @see reducers but these actions are created using @see createUndoableAction */
  undoableReducers?: ValidateSliceCaseReducers<State, UndoCR>;
}

/**
 * Creates a slice definition via redux toolkit with an addon function to create backup interfaces
 * @param options Slice definition options for redux toolkit. @see createSlice
 */
export function createBackupSlice<
  State,
  CaseReducers extends SliceCaseReducers<State>,
  UndoCR extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string
>(
  options: CreateBackupSliceOptions<State, CaseReducers, UndoCR, Name>
): Slice<State, CaseReducers & UndoCR, Name> & SliceAddon<State> {
  if (options.undoableReducers) {
    // Merge into reducers object
    const reducers: any = { ...options.reducers };
    for (const key in options.undoableReducers) {
      // make sure to append /undoable/ to the front
      reducers['undoable/' + key] = options.undoableReducers[key];
    }

    // Merge back into options object
    options = { ...options, reducers };
  }

  // Create slice using redux toolkit
  const slice = createSlice(options) as Slice<
    State,
    CaseReducers & UndoCR,
    Name
  >;

  // we need to fix up the indicies of the returned action for any undoable actions
  if (options.undoableReducers) {
    const actions: any = slice.actions;
    const actionKeys = Object.keys(actions);
    for (const key of actionKeys) {
      // Just find any with the undoable/
      if (key.indexOf('undoable/') === 0) {
        // Remove undoable/ from the key name
        actions[key.replace('undoable/', '')] = actions[key];
        delete actions[key];
      }
    }
  }

  return {
    ...slice,
    createBackupInterface: <Stored>(
      save: BackupSaveFunction<State, Stored>,
      load: BackupLoadFunction<State, Stored>
    ) => ({ save, load }),
  };
}
