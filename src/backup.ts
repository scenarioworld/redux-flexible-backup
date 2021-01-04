/**
 * Converts a state into a save object or undefined (no save)
 */
export type BackupSaveFunction<S, Stored> = (state: S) => Stored | undefined;

/**
 * Converts a saved object back into its corresponding game state, or undefined (if load failed)
 */
export type BackupLoadFunction<S, Stored> = (
  state: Stored | undefined
) => S | undefined;

/**
 * An interface to save and load a slice from a blackup
 */
export type SliceBackupInterface<S, Stored> = {
  /** Saves the slice to a stored backup */
  save: BackupSaveFunction<S, Stored>;

  /** Loads the slice from a stored backup */
  load: BackupLoadFunction<S, Stored>;
};

/**
 * Interface to save and load a state.
 * Define one SliceBackupInterface for each key you want to support save/load
 */
export type StateBackupInterface<S> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof S]?: SliceBackupInterface<S[K], any>;
};

// Resolves either to M or, if M is undefined, an object that has a save function which returns undefined
//  This solves a problem in the StoredState definition below where BackupInterface[K] might be a function,
//  or it might be undefined. I needed a way to translate that into either the function's return type OR undefined
type UndefinedSaveGuard<M> = M extends undefined
  ? { save: () => undefined }
  : M;

/**
 * Type created by calling createBackup on a store with a given config and storage interface
 */
export type StoredState<S, BackupInterface extends StateBackupInterface<S>> = {
  [K in keyof BackupInterface]: ReturnType<
    UndefinedSaveGuard<BackupInterface[K]>['save']
  >;
};

/**
 * Underlying type for a state or slice used by the save backup system
 */
export type StateOrSlice = Record<string, unknown>;

/**
 * Creates a new backup from the state
 * @param state State to backup
 * @param backupInterface Backup creation interface
 */
export function createBackup<
  S extends StateOrSlice,
  BackupInterface extends StateBackupInterface<S>
>(state: S, backupInterface: BackupInterface): StoredState<S, BackupInterface> {
  // We'll be storing all our data in here
  const stored: Record<string, unknown> = {};

  // Iterate keys in the storage interface
  for (const key in backupInterface) {
    // Get the loader
    const loader = backupInterface[key];
    if (!loader) {
      continue;
    }

    // Run a save operation
    stored[key] = loader.save(state[key]);
  }

  // Return the storage
  return stored as StoredState<S, BackupInterface>;
}

/**
 * Loads a backup into the state
 * @param state Current state
 * @param backupInterface Backup creation interface
 * @param store Backup to load
 */
export function loadBackup<
  S extends StateOrSlice,
  BackupInterface extends StateBackupInterface<S>
>(
  state: Partial<S>,
  backupInterface: BackupInterface,
  store: StoredState<S, BackupInterface>
): Partial<S> {
  // We'll be loading all the state into here
  const loaded: StateOrSlice = {};

  // Iterate keys in the storage interface
  for (const key in backupInterface) {
    // Get the loader
    const loader = backupInterface[key];
    if (!loader) {
      continue;
    }

    // Run a save operation
    loaded[key] = loader.load(store[key]);
  }

  // Combine with existing state
  return { ...state, ...loaded };
}
