import { Action, createAction, PayloadActionCreator, Reducer } from "@reduxjs/toolkit"
import { createBackup, loadBackup, StateBackupInterface, StateOrSlice, StoredState } from "./backup";

type UndoMoment<S, BackupInterface extends StateBackupInterface<S>> = StoredState<S, BackupInterface>;
type UndoableState<S extends Record<string, unknown>, BackupInterface extends StateBackupInterface<S>> = S & { 
    history: UndoMoment<S, BackupInterface>[],
    future: UndoMoment<S, BackupInterface>[],
}

/**
 * Creates an action with the appropriate name format to be "undoable"
 * @param feature Feature name
 * @param type Action type name
 */
export function createUndoableAction<PayloadType = void>(feature: string, type: string): PayloadActionCreator<PayloadType> {
    return createAction<PayloadType>(`${feature}/undoable/${type}`);
}

/** Undo action */
export const undo = createAction("undo");

/** Redo action */
export const redo = createAction("redo");

export function createUndoableReducer<S extends StateOrSlice, A extends Action<string>, BackupInterface extends StateBackupInterface<S>>
    (reducer: Reducer<S, A>, undoInterface: BackupInterface, historyLimit?: number)
    : Reducer<UndoableState<S, BackupInterface>, A>
{
    // Create wrapper reducer
    return (state, action) => {
        // Cache if this is the initialization call for initial state
        const isInit = !state || Object.keys(state).length === 0;

        // Clip incoming of history and future lists
        let clippedState = undefined;
        if(state) {
            clippedState = {...state} as S;
            delete clippedState.history;
            delete clippedState.future;
        }

        // Run base reducer and migrate over our current history and future states
        state = {...reducer(clippedState, action), history: state?.history ?? [], future: state?.future ?? []};
        
        // Handle undoable actions by creating save moments
        if(action.type.indexOf('/undoable/') !== -1 || isInit) {
            state = saveMoment(state, undoInterface, historyLimit);
        }

        // Undo and redo actions
        if(action.type == undo.type) {
            state = restoreMoment(state, undoInterface, 1);
        } else if(action.type == redo.type) {
            state = restoreMoment(state, undoInterface, -1);
        }

        return state;
    }
}

function saveMoment<S extends StateOrSlice, BackupInterface extends StateBackupInterface<S>>(state: UndoableState<S, BackupInterface>, undoInterface: BackupInterface, historyLimit: number|undefined): UndoableState<S, BackupInterface> {
    // Create new undo moment
    const moment = createBackup(state as S, undoInterface);

    // Append to history and destroy future
    return {...state, history: [moment, ...state.history.slice(0, historyLimit)], future: []};
}

function restoreMoment<S extends StateOrSlice, BackupInterface extends StateBackupInterface<S>>(state: UndoableState<S, BackupInterface>, undoInterface: BackupInterface, distance = 1): UndoableState<S, BackupInterface> {
    // Trivial case: 0
    if(distance === 0) {
        console.warn("Warning: Restoring moment 0. Does nothing.");
        return state;
    }

    // Get history moment
    const moment = distance > 0
        ? state.history[distance]
        : state.future[-distance - 1];

    // Error if no moment exists
    if(moment === undefined) {
        console.error(`Could not find moment ${distance}. There are only ${state.history.length} moments in history and ${state.future.length} moments in future.`);
        return state;
    }

    // Process state
    state = loadBackup<S, StateBackupInterface<S>>(state as S, undoInterface, moment) as UndoableState<S, BackupInterface>;

    // Update history and future arrays
    if(distance > 0)
    {
        // Splice moments out of history and insert them in reverse order into the future array
        const history = [...state.history];
        const moments = history.splice(0, distance).reverse();
        const future = [...moments, ...state.future];
        return {...state, history, future};
    }
    else
    {
        // Splice the moments out of the future and insert them in reverse order into the history array
        const future = [...state.future];
        const moments = future.splice(0, -distance).reverse();
        const history = [...moments, ...state.history];
        return {...state, history, future};
    }
}