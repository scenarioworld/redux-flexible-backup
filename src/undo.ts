import {
  Action,
  createAction,
  PayloadActionCreator,
  Reducer,
} from '@reduxjs/toolkit';
import {
  createBackup,
  loadBackup,
  StateBackupInterface,
  StateOrSlice,
  StoredState,
} from './backup';
import { createHistory, restoreWithRewind, StateDelta } from './diff';

type UndoMoment<
  S,
  BackupInterface extends StateBackupInterface<S>
> = StoredState<S, BackupInterface>;
type UndoMomentDiff<
  S,
  BackupInterface extends StateBackupInterface<S>
> = StateDelta<UndoMoment<S, BackupInterface>>;
type UndoableState<
  S extends Record<string, unknown>,
  BackupInterface extends StateBackupInterface<S>
> = S & {
  history: UndoMomentDiff<S, BackupInterface>[];
  present: UndoMoment<S, BackupInterface> | undefined;
  future: UndoMomentDiff<S, BackupInterface>[];
};

/**
 * Creates an action with the appropriate name format to be "undoable"
 * @param feature Feature name
 * @param type Action type name
 */
export function createUndoableAction<PayloadType = void>(
  feature: string,
  type: string
): PayloadActionCreator<PayloadType> {
  return createAction<PayloadType>(`${feature}/undoable/${type}`);
}

/** Undo action */
export const undo = createAction('undo');

/** Redo action */
export const redo = createAction('redo');

export function createUndoableReducer<
  S extends StateOrSlice,
  A extends Action<string>,
  BackupInterface extends StateBackupInterface<S>
>(
  reducer: Reducer<S, A>,
  undoInterface: BackupInterface,
  historyLimit?: number
): Reducer<UndoableState<S, BackupInterface>, A> {
  // Create wrapper reducer
  return (state, action) => {
    // Cache if this is the initialization call for initial state
    const isInit = !state || Object.keys(state).length === 0;

    // Clip undo data out of the state (present, future, history)
    let clippedState = undefined;
    if (state) {
      clippedState = { ...state } as S;
      delete clippedState.history;
      delete clippedState.future;
      delete clippedState.present;
    }

    // Run base reducer and migrate over our current history and future states
    state = {
      ...reducer(clippedState, action),
      history: state?.history ?? [],
      future: state?.future ?? [],
      present: state?.present ?? undefined,
    };

    // Handle undoable actions by creating save moments
    if (action.type.indexOf('/undoable/') !== -1 || isInit) {
      state = saveMoment(state, undoInterface, historyLimit);
    }

    // Undo and redo actions
    if (action.type === undo.type) {
      state = restoreMoment(state, undoInterface, 1);
    } else if (action.type === redo.type) {
      state = restoreMoment(state, undoInterface, -1);
    }

    return state;
  };
}

function saveMoment<
  S extends StateOrSlice,
  BackupInterface extends StateBackupInterface<S>
>(
  state: UndoableState<S, BackupInterface>,
  undoInterface: BackupInterface,
  historyLimit: number | undefined
): UndoableState<S, BackupInterface> {
  // Create new undo moment (this will be the new "present" moment)
  const present = createBackup(state as S, undoInterface);

  // Create a new history list
  const history = [
    // It begins with the last present moment diffed against the new present moment
    ...(state.present === undefined
      ? []
      : [createHistory(present, state.present)]),

    // And ends with the rest of the history moments existing, capped to the history limit
    ...state.history.slice(0, historyLimit),
  ];

  return { ...state, present, history, future: [] };
}

function restoreMoment<
  S extends StateOrSlice,
  BackupInterface extends StateBackupInterface<S>
>(
  state: UndoableState<S, BackupInterface>,
  undoInterface: BackupInterface,
  distance = 1
): UndoableState<S, BackupInterface> {
  // Trivial case: 0
  if (distance === 0) {
    // TODO: Maybe this should restore to present?
    console.warn('Warning: Restoring moment 0. Does nothing.');
    return state;
  }

  // How did this happen?
  if (state.present === undefined) {
    console.error("Missing present moment. Can't do anything.");
    return state;
  }

  // Get appropriate list
  const list = distance > 0 ? state.history : state.future;

  // Get history moment from list
  const diff =
    distance > 0 ? state.history[distance - 1] : state.future[-distance - 1];

  // Error if no moment exists
  if (diff === undefined) {
    console.error(
      `Could not find moment ${distance}. There are only ${state.history.length} moments in history and ${state.future.length} moments in future.`
    );
    return state;
  }

  // Start from the present moment
  let present = state.present;
  const rewinds = [];

  // Start rewinding
  const abs = Math.abs(distance);
  for (let i = 0; i < abs; i++) {
    // Restore using the diff
    const result = restoreWithRewind(present, list[i]);
    present = result.restored;

    // Add the rewind diff to the rewind list
    rewinds.push(result.diff);
  }

  // We should now be at the correct moment. Load the state from that moment
  state = loadBackup<S, StateBackupInterface<S>>(
    state as S,
    undoInterface,
    present
  ) as UndoableState<S, BackupInterface>;

  // Update history and future arrays
  if (distance > 0) {
    // Slice out all the history moments we consumed
    const history = state.history.slice(abs);

    // Add the rewind diffs to the future array
    const future = [...rewinds.reverse(), ...state.future];
    return { ...state, history, future, present };
  } else {
    // Slice out all the future moments we consumed
    const future = state.future.slice(abs);

    // Add rewinds to history
    const history = [...rewinds.reverse(), ...state.history];
    return { ...state, history, future, present };
  }
}
