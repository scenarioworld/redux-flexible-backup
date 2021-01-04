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

/**
 * Iterator that moves through a delta history list
 */
class DiffIterator<State> implements Iterator<State> {
  private index = 0;

  constructor(
    /** History list to iterate over (first entry is latest, last is oldest) */
    private readonly history: StateDelta<State>[],

    /** Current state */
    private state: State
  ) {}

  /** Moves to the next element in the history list */
  next(): IteratorResult<State> {
    // If we're at the end of the history list, we're done
    if (this.index >= this.history.length) {
      return {
        done: true,
        value: null,
      };
    }

    // Restore the state using the current state and the next diff
    this.state = restore(this.state, this.history[this.index++]);

    // Return
    return {
      done: false,
      value: this.state,
    };
  }
}

interface HistoryIteration<State> {
  [Symbol.iterator](): DiffIterator<State>;
}

/**
 * Creates a history iterator
 * @param current Current state
 * @param history History list
 */
export function iterateHistory<State>(
  current: State,
  history: StateDelta<State>[]
): HistoryIteration<State> {
  return {
    [Symbol.iterator]: () => new DiffIterator(history, current),
  };
}
