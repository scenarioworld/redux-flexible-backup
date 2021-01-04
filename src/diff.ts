import { Delta, diff, patch, reverse } from "jsondiffpatch";
import cloneDeep from "lodash/cloneDeep";

/**
 * Creates a history record
 * @param next New moment
 * @param prev Previous moment
 */
export function createHistory<State>(next: State, prev: State): Delta {
    return diff(next, prev) as Delta;
}

/**
 * Restores a previous state from a delta record
 * @param current Current state
 * @param record Record to restore
 */
export function restore<State>(current: State, record: Delta): State {
    const clone = cloneDeep(current)
    return patch(clone, record);
}

/**
 * Restores a state using a delta record but also returns a new delta to go back in reverse
 * @param current Current state
 * @param record Record to restore
 */
export function restoreWithRewind<State>(current: State, record: Delta): [State, Delta] {
    const clone = cloneDeep(current)
    const next = patch(clone, record);

    // Create a diff to return to that previous state
    const returnDiff = reverse(record) as Delta;

    return [next, returnDiff];
}

/**
 * Iterator that moves through a delta history list
 */
class DiffIterator<State> implements Iterator<State>
{
    private index = 0;

    constructor(
        /** History list to iterate over (first entry is latest, last is oldest) */
        private readonly history: Delta[], 

        /** Current state */
        private state: State) 
    { }

    /** Moves to the next element in the history list */
    next(): IteratorResult<State> {
        // If we're at the end of the history list, we're done
        if(this.index >= this.history.length) {
            return {
                done: true,
                value: null
            };
        }

        // Restore the state using the current state and the next diff
        this.state = restore(this.state, this.history[this.index++]);

        // Return
        return {
            done: false,
            value: this.state
        };
    }
}

interface HistoryIteration<State>
{
    [Symbol.iterator](): DiffIterator<State>
}

/**
 * Creates a history iterator
 * @param current Current state
 * @param history History list
 */
export function iterateHistory<State>(current: State, history: Delta[]): HistoryIteration<State> {
    return {
        [Symbol.iterator]: () => new DiffIterator(history, current)
    }
}