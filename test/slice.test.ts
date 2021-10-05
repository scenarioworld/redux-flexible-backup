import { createBackupSlice } from '../src/slice';

const initialState = { num: 4 };

test('Can create backup interface from a slice definition', () => {
  // Use augmented createSlice function from redux toolkit
  const slice = createBackupSlice({
    name: 'myslice',
    initialState,
    reducers: {},
  });

  // Create a new backup interface
  const backupInterface = slice.createBackupInterface(
    state => state.num + 'dd',
    stored =>
      stored === undefined
        ? undefined
        : { num: parseInt(stored.substr(0, stored.length - 2)) }
  );

  // Test it
  const saved = backupInterface.save(initialState);
  expect(saved).toBe('4dd');
  const loaded = backupInterface.load(saved, {
    needs: () => 0,
    update: () => {},
  });
  expect(loaded?.num).toBe(4);
});

test('Undoable actions are processed properly', () => {
  const slice = createBackupSlice({
    name: 'myslice',
    initialState,
    reducers: {
      basicAction: state => {
        state.num += 2;
      },
    },
    undoableReducers: {
      undoableAction: state => {
        state.num += 4;
      },
    },
  });

  // Make sure type names are correct
  expect(slice.actions.undoableAction.type.indexOf('/undoable/')).not.toBe(-1);
  expect(slice.actions.basicAction.type.indexOf('/undoable/')).toBe(-1);

  // Make sure we actually handle the reducer actions
  const nextState = slice.reducer(initialState, slice.actions.basicAction);
  expect(nextState.num).toBe(initialState.num + 2);

  const nextUndoState = slice.reducer(
    initialState,
    slice.actions.undoableAction
  );
  expect(nextUndoState.num).toBe(initialState.num + 4);
});
