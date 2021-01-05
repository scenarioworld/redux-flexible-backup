import { Delta, diff, patch, reverse } from 'jsondiffpatch';
import cloneDeep from 'lodash/cloneDeep';

/** Re-export of jsondiffpatch Delta */
export type StateDelta<_State> = Delta;

/**
 * Creates a history record
 * @param next New moment
 * @param prev Previous moment
 */
export function createHistory<State>(
  next: State,
  prev: State
): StateDelta<State> {
  return diff(next, prev) as StateDelta<State>;
}

/**
 * Restores a previous state from a delta record
 * @param current Current state
 * @param record Record to restore
 */
export function restore<State>(
  current: State,
  record: StateDelta<State>
): State {
  const clone = cloneDeep(current);
  return patch(clone, record);
}

/**
 * Restores a state using a delta record but also returns a new delta to go back in reverse
 * @param current Current state
 * @param record Record to restore
 */
export function restoreWithRewind<State>(
  current: State,
  record: StateDelta<State>
): { restored: State; diff: StateDelta<State> } {
  const clone = cloneDeep(current);
  const next = patch(clone, record);

  // Create a diff to return to that previous state
  const returnDiff = reverse(record) as StateDelta<State>;

  return { restored: next, diff: returnDiff };
}

export interface HistoryIteration<State> {
  [Symbol.iterator](): Iterator<State>;
}

/**
 * Generator that returns restored history states
 * @param current Current state
 * @param history History
 */
export function* historyGenerator<State>(
  current: State | undefined,
  history: StateDelta<State>[]
) {
  // No state. Done.
  if (current === undefined) {
    return;
  }

  // Iterate history
  let state = current;
  for (const delta of history) {
    // Restore from the delta and yield the result
    state = restore(state, delta);
    yield state;
  }
}

/**
 * Creates a history iterator
 * @param current Current state
 * @param history History list
 */
export function historyIterator<State>(
  current: State | undefined,
  history: StateDelta<State>[]
): HistoryIteration<State> {
  return {
    [Symbol.iterator]: () => historyGenerator<State>(current, history),
  };
}
