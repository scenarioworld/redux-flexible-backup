import {
  createBackup,
  loadBackup,
  StateBackupInterface,
  StoredState,
} from './backup';

/**
 * Saves a state to storage using a backup interface
 * @param storage Storage to save to (localStorage or sessionStorage)
 * @param key Key to save it into
 * @param state Redux state
 * @param backupInterface Backup interface to use when saving
 */
export function saveToStorage<S extends Record<string, unknown>>(
  storage: Storage,
  key: string,
  state: S,
  backupInterface: StateBackupInterface<S>
): void {
  // Create save data
  const saveData = createBackup(state, backupInterface);

  // Store it
  storage.setItem(key, JSON.stringify(saveData));
}

/**
 * Loads a state saved via @see saveToStorage
 * @param state Existing state
 * @param storage Storage to load from (localStorage or sessionStorage)
 * @param key Storage key
 * @param backupInterface Backup interface to use
 */
export function loadFromStorage<S extends Record<string, unknown>>(
  state: Partial<S>,
  storage: Storage,
  key: string,
  backupInterface: StateBackupInterface<S>
): Partial<S> {
  // Can throw exceptions for storage I guess
  try {
    // Try to load from storage
    const storedStateJSON = storage.getItem(key);
    if (storedStateJSON) {
      // Parse
      const loadedData = JSON.parse(storedStateJSON) as
        | StoredState<S, typeof backupInterface>
        | undefined;

      // Process
      if (loadedData) {
        return loadBackup(state, backupInterface, loadedData);
      }
    }
  } catch (error) {
    console.error(`Error loading state from storage key ${key}: ${error}`);
  }

  // Return original state
  return state;
}
