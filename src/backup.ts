/**
 * Converts a state into a save object or undefined (no save)
 */
export type BackupSaveFunction<S, Stored> = (state: S) => Stored | undefined;

/**
 * Converts a saved object back into its corresponding game state, or undefined (if load failed)
 */
export type BackupLoadFunction<S, Stored, Parent = unknown> = (
  state: Stored | undefined,
  dependencyLoader: DependencyLoader<Parent>
) => S | undefined;

/**
 * An interface to save and load a slice from a blackup
 */
export type SliceBackupInterface<S, Stored, Parent = unknown> = {
  /** Saves the slice to a stored backup */
  save: BackupSaveFunction<S, Stored>;

  /** Loads the slice from a stored backup */
  load: BackupLoadFunction<S, Stored, Parent>;
};

/**
 * Interface to save and load a state.
 * Define one SliceBackupInterface or StateBackupInterface for each key you want to support save/load
 */
export type StateBackupInterface<S> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof S]?: SliceBackupInterface<S[K], any> | StateBackupInterface<S[K]>;
};

// If BackupInterface[K] is undefined, this resolves to undefined.
// If BackupInterface[K] is a slice backup interface, resolve to the return value of its save method
// If BackupInterface[K] is a state backup interface, resolve to the result of calling createBackup using it
type TypeOfStoredKey<
  S,
  BackupInterface extends StateBackupInterface<S>,
  K extends keyof BackupInterface & keyof S
> = BackupInterface[K] extends undefined
  ? undefined
  : BackupInterface[K] extends { save: (...args: any) => any }
  ? ReturnType<BackupInterface[K]['save']>
  : StoredState<S[K], BackupInterface[K]>;

/**
 * Type created by calling createBackup on a store with a given config and storage interface
 */
export type StoredState<S, BackupInterface extends StateBackupInterface<S>> = {
  [K in keyof (BackupInterface | S)]: TypeOfStoredKey<S, BackupInterface, K>;
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

    // If there is a save function, this is a slice loader
    if ('save' in loader && typeof loader.save === 'function') {
      // Run a save operation
      stored[key] = loader.save(state[key]);
    } else {
      // Otherwise, this is a state interface embedded in a state interface. Use createBackup recursively
      // @ts-ignore
      stored[key] = createBackup(state[key], loader);
    }
  }

  // Return the storage
  return stored as StoredState<S, BackupInterface>;
}

type UpdateType<T> = Partial<T>;

export interface DependencyLoader<S> {
  needs: <K extends keyof S & string>(key: K) => S[K];
  update: <K extends keyof S & string>(
    key: K,
    update: UpdateType<S[K]>
  ) => void;
}

function LoadKey<
  S extends StateOrSlice,
  BackupInterface extends StateBackupInterface<S>
>(
  state: Partial<S>,
  backupInterface: BackupInterface,
  store: StoredState<S, BackupInterface>,
  key: keyof S & string,
  loaded: StateOrSlice,
  dependencyLoader: DependencyLoader<S>,
  loadedKeys: Set<string>,
  loadQueue: Set<string>
): void {
  // Mark as loaded
  if (loadedKeys.has(key)) {
    throw new Error(`Somehow we loaded the same key ${key} twice...`);
  }
  loadedKeys.add(key);

  // Get the loader
  const loader = backupInterface[key];
  if (!loader) {
    return;
  }

  // Make sure we haven't already loaded this
  if (loaded[key] !== undefined) {
    return;
  }

  // Make sure we're not in a circular dependency
  if (loadQueue.has(key)) {
    const circle = Array.from(loadQueue.values());
    circle.push(key);
    throw new Error(`Circular dependency in loadBackup: ${circle}.`);
  }

  // Push to load queue
  loadQueue.add(key);

  // If there is a save function, this is a slice loader
  if ('load' in loader && typeof loader.load === 'function') {
    // Run a save operation
    loaded[key] = loader.load(store[key], dependencyLoader);
  } else {
    // Otherwise, this is a state interface embedded in a state interface. Use loadBackup recursively
    // @ts-ignore
    loaded[key] = loadBackup(state[key] ?? {}, loader, store[key]);
  }

  // Remove from load queue
  loadQueue.delete(key);
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

  // Create load queue
  const loadQueue: Set<string> = new Set();
  const loadedKeys: Set<string> = new Set();

  // Create dependency loader
  const dependencyLoader: DependencyLoader<S> = {
    needs(innerKey) {
      // If we haven't loaded that slice, load it
      if (!loadedKeys.has(innerKey)) {
        LoadKey(
          state,
          backupInterface,
          store,
          innerKey,
          loaded,
          dependencyLoader,
          loadedKeys,
          loadQueue
        );
      }

      // Then return
      return loaded[innerKey] as S[typeof innerKey];
    },

    update(innerKey, update) {
      // Make sure that slice is loaded
      if (!loadedKeys.has(innerKey)) {
        LoadKey(
          state,
          backupInterface,
          store,
          innerKey,
          loaded,
          dependencyLoader,
          loadedKeys,
          loadQueue
        );
      }

      // If it's a non-object type
      if (
        typeof update === 'number' ||
        typeof update === 'string' ||
        Array.isArray(update)
      ) {
        // Just do a set
        loaded[innerKey] = update;
      } else {
        // Otherwise, do a partial update
        const prev = loaded[innerKey] as {};
        loaded[innerKey] = { ...prev, ...update };
      }
    },
  };

  // Iterate keys in the storage interface
  for (const key in backupInterface) {
    // Ignore if we already loaded this key
    if (loadedKeys.has(key)) {
      continue;
    }

    LoadKey(
      state,
      backupInterface,
      store,
      key,
      loaded,
      dependencyLoader,
      loadedKeys,
      loadQueue
    );
  }

  // Combine with existing state
  return { ...state, ...loaded };
}
