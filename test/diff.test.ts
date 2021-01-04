import { Delta } from 'jsondiffpatch';
import {
  createHistory,
  historyIterator,
  restore,
  restoreWithRewind,
} from '../src/diff';
import sizeof from 'object-sizeof';

type State = number[];

function deterministicReducer(state: State | undefined): State {
  if (!state) {
    return [1];
  }

  return [...state, state[state.length - 1] + 1];
}

test('Ensure diff history is smaller than classic history', () => {
  const records = [];
  const history = [];
  let state = deterministicReducer(undefined);
  records.push(state);
  for (let i = 0; i < 1000; i++) {
    const next = deterministicReducer(state);
    records.push(next);
    history.push(createHistory(next, state));
    state = next;
  }

  // Make sure we're aligned
  expect(records.pop()).toStrictEqual(state);

  const historySize = sizeof(history);
  const recordSize = sizeof(records);

  console.log('History size: ', historySize);
  console.log('Record size: ', recordSize);
  expect(historySize).toBeLessThan(recordSize);

  // Rewind all the way back
  const future: Delta[] = [];
  while (records.length > 0 && history.length > 0) {
    const old = records.pop();
    const result = restoreWithRewind(state, history.pop() as Delta);
    const restored = result.restored;
    const diff = result.diff;
    future.push(diff);
    expect(old).toStrictEqual(restored);
    state = restored;
  }

  // Fast forward all the way forward
  state = deterministicReducer(undefined);
  while (future.length > 0) {
    const record = future.pop() as Delta;
    const restoredFuture = restore(state, record);
    const expectedFuture = deterministicReducer(state);
    expect(expectedFuture).toStrictEqual(restoredFuture);
    state = expectedFuture;
  }
});

test('Ensure history list can be iterated', () => {
  const records = [];
  const history: Delta[] = [];
  let state = deterministicReducer(undefined);
  records.push(state);
  for (let i = 0; i < 1000; i++) {
    const next = deterministicReducer(state);
    records.push(next);
    history.splice(0, 0, createHistory(next, state));
    state = next;
  }

  // Make sure we're aligned
  expect(records.pop()).toStrictEqual(state);

  for (const restored of historyIterator(state, history)) {
    const old = records.pop();
    expect(old).toStrictEqual(restored);
  }
});
