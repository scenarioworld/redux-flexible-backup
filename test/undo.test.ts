import { createBackup, SliceBackupInterface, StateBackupInterface } from "../src/backup";
import { createUndoableReducer, redo, undo } from "../src/undo"

describe("A simple undoable state", () => {
    type Slice = { a: string, b: string };
    type State = { slice: Slice };

    const initialState: State = { slice: { a: "a", b: "b" } };

    // backup for slice
    const sliceBackupInterface: SliceBackupInterface<Slice, string> = {
        save: (slice: Slice) => slice.a + "," + slice.b,
        load: (stored: string|undefined) => stored === undefined ? undefined : ({ a: stored.split(',')[0], b: stored.split(',')[1] })
    }
    
    // backup for state
    const stateBackupInterface: StateBackupInterface<State> = {
        slice: sliceBackupInterface
    }

    // Reducer just appends a's and b's to the slice
    const reducer = (state: State|undefined): State => {
        if(!state) { return initialState; }

        else { 
            return {slice: { a: state.slice.a + 'a', b: state.slice.b + 'b'} };
        }
    };

    // Wrap it in an undoable reducer
    const undoReducer = createUndoableReducer(reducer, stateBackupInterface);

    // Just make sure the reducer is actually changing the state when called
    test("Controlled reducer test", () => {
        // Make sure the reducer actually makes an initial state
        const state = reducer(undefined);
        expect(state).toBeDefined();
        expect(state).toEqual(initialState);

        // Make sure the next call creates a new state
        const next = reducer(state);
        expect(next).not.toEqual(state);
    });

    test("Undoable reducer can create intitial state", () => {
        const state = undoReducer(undefined, { type: "action" });
        expect(state).toMatchObject(initialState);
    });

    test("Initial state includes initial history moment", () => {
        const state = undoReducer(undefined, { type: "action" });
        
        expect(state.history).toHaveLength(1);
        expect(state.future).toHaveLength(0);
        expect(state.history[0]).toEqual(createBackup(initialState, stateBackupInterface));
    });

    test("Undoable reducer doesn't create history for regular actions", () => {
        const state = undoReducer(undefined, { type: "action" });
        const next = undoReducer(state, { type: "action" });

        expect(next.history).toHaveLength(1);
        expect(next.future).toHaveLength(0);
    });

    test("Undoable action creates new history moment", () => {
        const state = undoReducer(undefined, { type: "action" });
        const next = undoReducer(state, { type: "/undoable/action" });

        expect(next.history).toHaveLength(2);
        expect(next.future).toHaveLength(0);
        expect(createBackup(next, stateBackupInterface)).toMatchObject(next.history[0]);
    });

    test("Can undo action", () => {
        const state = undoReducer(undefined, { type: "action" });
        const next = undoReducer(state, { type: "/undoable/action" });

        // undo
        const undone = undoReducer(next, undo);

        // Should match state
        expect(undone.slice).toEqual(state.slice);
    });

    test("Can redo action", () => {
        const state = undoReducer(undefined, { type: "action" });
        const next = undoReducer(state, { type: "/undoable/action" });

        // undo
        const undone = undoReducer(next, undo);

        // redo
        const redone = undoReducer(undone, redo);

        // Should match state
        expect(redone.slice).toEqual(next.slice);
    });
});