import { createBackup, loadBackup } from '../src/backup';

describe('A Simple State', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface State {
    a: string;
    b: Record<string, number>;
    [i: string]: any;
  }

  const aBackupInterface = {
    save: (state: string) => state.length,
    load: (data: number) => 'datadatadata'.substr(0, data),
  };

  const bBackupInterface = {
    save: (state: Record<string, number>) => Object.values(state),
    load: (data: number[]) => {
      if (!data) {
        return {};
      }
      const result: Record<string, number> = {};
      for (const n of data) {
        result[n.toString()] = n;
      }
      return result;
    },
  };

  const backupInterface = {
    a: aBackupInterface,
    b: bBackupInterface,
  };

  test('Basic save and restore', () => {
    const state: State = { a: 'data', b: { '4': 4, '5': 5 } };
    const backup = createBackup(state, backupInterface);
    expect(backup.a).toBe(4);
    expect(backup.b).toHaveLength(2);

    const newState = loadBackup({}, backupInterface, backup);
    expect(newState).toBeDefined();
    expect(newState).toEqual(state);
  });
});

describe('A state in a state', () => {
  interface SubState {
    a: string;
    b: string;
  }
  interface State extends Record<string, unknown> {
    a: string;
    b: SubState;
  }

  // Simple string backup
  const stringBackup = {
    save: (data: string) => [...data],
    load: (stored: string[] | undefined) =>
      stored ? stored.join('') : undefined,
  };

  // save interface for substate
  const substateBackup = {
    a: stringBackup,
    b: stringBackup,
  };

  // save interface for state: uses a sub state saver
  const stateBackup = {
    a: stringBackup,
    b: substateBackup,
  };

  test('Backup recursively calles createBackup', () => {
    const state: State = {
      a: 'abc',
      b: {
        a: 'xyz',
        b: 'qwerty',
      },
    };

    const backup = createBackup(state, stateBackup);
    expect(backup.a).toEqual([...state.a]);
    expect(backup.b).toBeDefined();
    expect(backup.b.a).toEqual([...state.b.a]);
    expect(backup.b.b).toEqual([...state.b.b]);
  });

  test('Load recursively calls loadBackup', () => {
    const state: State = {
      a: 'abc',
      b: {
        a: 'xyz',
        b: 'qwerty',
      },
    };

    const backup = createBackup(state, stateBackup);
    const restored = loadBackup({}, stateBackup, backup);

    expect(restored).toEqual(state);
  });
});
