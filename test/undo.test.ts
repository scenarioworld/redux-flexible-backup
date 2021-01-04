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

    test("Initial state includes only present moment", () => {
        const state = undoReducer(undefined, { type: "action" });
        
        expect(state.history).toHaveLength(0);
        expect(state.future).toHaveLength(0);
        expect(state.present).toEqual(createBackup(initialState, stateBackupInterface));
    });

    test("Undoable reducer doesn't create history for regular actions", () => {
        const state = undoReducer(undefined, { type: "action" });
        const next = undoReducer(state, { type: "action" });

        expect(next.history).toHaveLength(0);
        expect(next.future).toHaveLength(0);
    });

    test("Undoable action creates new history moment", () => {
        const state = undoReducer(undefined, { type: "action" });
        const next = undoReducer(state, { type: "/undoable/action" });

        expect(next.history).toHaveLength(1);
        expect(next.future).toHaveLength(0);
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

    test("Can undo many actions", () => {
        const state = undoReducer(undefined, { type: "action" });
        let next = state;

        const actions = 10;
        for(let i = 0; i < actions; i++) {
            next = undoReducer(next, { type: "/undoable/action" });
        }

        for(let i = 0; i < actions; i++) {
            next = undoReducer(next, undo);
        }

        expect(next.slice).toEqual(state.slice);
    });

    test("Can redo many actions", () => {
        const state = undoReducer(undefined, { type: "action" });
        let next = state;

        const actions = 10;
        for(let i = 0; i < actions; i++) {
            next = undoReducer(next, { type: "/undoable/action" });
        }
        const final = next;

        for(let i = 0; i < actions; i++) {
            next = undoReducer(next, undo);
        }
        for(let i = 0; i < actions; i++) {
            next = undoReducer(next, redo);
        }

        expect(next.slice).toEqual(final.slice);
    });

    test("Can mix between undo and redo", () => {
        const state = undoReducer(undefined, { type: "action" });
        let next = state;

        // Do 10 actions
        for(let i = 0; i < 10; i++) {
            next = undoReducer(next, { type: "/undoable/action" });
        }
        const final = next;

        // Undo 5 actions
        for(let i = 0; i < 5; i++) {
            next = undoReducer(next, undo);
        }

        // Redo 2 actions
        for(let i = 0; i < 2; i++) {
            next = undoReducer(next, redo);
        }

        // Undo 7 actions
        for(let i = 0; i < 7; i++) {
            next = undoReducer(next, undo);
        }
        expect(next.slice).toEqual(state.slice); // we should be at the initial moment here

        // Redo all the way back to the end
        for(let i = 0; i < 10; i++) {
            next = undoReducer(next, redo);
        }
        expect(next.slice).toEqual(final.slice); // we should be back at the final moment
    })
});