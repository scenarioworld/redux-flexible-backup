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
  const loaded = backupInterface.load(saved);
  expect(loaded?.num).toBe(4);
});
