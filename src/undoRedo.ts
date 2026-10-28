import { createContext, useCallback, useRef, useState } from "react";

export type UndoCallback = () => Promise<void>;
export type DoCallback = () => Promise<UndoCallback>;
type History = { undo: Array<[DoCallback, UndoCallback]>; redo: DoCallback[] };

export function useUndoRedo(): [
  (dc: DoCallback) => Promise<void>,
  () => Promise<void>,
  () => Promise<void>,
  boolean,
  boolean,
  () => void
] {
  const [locked, setLocked] = useState(false);
  const [history, setHistory] = useState<History>({ undo: [], redo: [] });
  const current = useRef(history);
  const generation = useRef(0);
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);

  const enqueue = useCallback((operation: (history: History) => Promise<History>) => {
    const version = generation.current;
    pending.current++;
    setLocked(true);
    const result = queue.current.then(async () => {
      if (version !== generation.current) {
        throw new Error("Operation cancelled because the session changed");
      }
      try {
        const next = await operation(current.current);
        if (version === generation.current) {
          current.current = next;
          setHistory(() => next);
        }
      } finally {
        if (version === generation.current) {
          pending.current--;
          setLocked(pending.current > 0);
        }
      }
    });
    queue.current = result.catch(() => {});
    return result;
  }, []);

  const doIt = useCallback((doCb: DoCallback) => enqueue(async (history) => {
    const undoCb = await doCb();
    return { undo: [[doCb, undoCb], ...history.undo], redo: [] };
  }), [enqueue]);

  const undo = useCallback(() => enqueue(async (history) => {
    const entry = history.undo[0];
    if (!entry) throw new Error("No operations to undo");
    const [doCb, undoCb] = entry;
    await undoCb();
    return { undo: history.undo.slice(1), redo: [doCb, ...history.redo] };
  }), [enqueue]);

  const redo = useCallback(() => enqueue(async (history) => {
    const doCb = history.redo[0];
    if (!doCb) throw new Error("No operations to redo");
    const undoCb = await doCb();
    return { undo: [[doCb, undoCb], ...history.undo], redo: history.redo.slice(1) };
  }), [enqueue]);

  const reset = useCallback(() => {
    generation.current++;
    queue.current = Promise.resolve();
    pending.current = 0;
    current.current = { undo: [], redo: [] };
    setHistory(current.current);
    setLocked(false);
  }, []);

  return [doIt, undo, redo, !locked && history.undo.length > 0,
    !locked && history.redo.length > 0, reset];
}

export const UndoRedoContext = createContext<
  ((dc: DoCallback) => Promise<void>) | null
>(null);
