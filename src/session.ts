import { Middleware } from 'redux';
import { StateBackupInterface } from './backup';
import { saveToStorage, loadFromStorage } from './storage';

/**
 * Loads the initial state from storage
 * @param initialState Initial state
 * @param config Backup Configuration
 * @param backupInterface Backup interface
 * @param sessionKey Session key to load from
 */
export function loadInitialStateFromSession<S extends Record<string, unknown>>(
  initialState: Partial<S>,
  backupInterface: StateBackupInterface<S>,
  sessionKey: string
): Partial<S> {
  return loadFromStorage(
    initialState,
    sessionStorage,
    sessionKey,
    backupInterface
  );
}

/**
 * Creates a middleware to save the game state to the session after every action
 * @param config Backup Configuration
 * @param backupInterface Backup interface
 * @param sessionKey Session key to save to
 */
export function createSessionMiddleware<S extends Record<string, unknown>>(
  backupInterface: StateBackupInterface<S>,
  sessionKey: string
): Middleware<unknown, S> {
  return store => next => action => {
    // Run dispatch first
    const result = next(action);

    // Save to session storage
    saveToStorage(
      sessionStorage,
      sessionKey,
      store.getState(),
      backupInterface
    );

    // Return result
    return result;
  };
}
