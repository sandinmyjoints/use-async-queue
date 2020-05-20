import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for managing a queue with limited concurrency.
 * @param {number} concurrency - Maximum number of tasks to process
 * concurrently. Default 8.
 * @param {Function} inflight - Callback when a task changes from pending to
 * being processed.
 * @param {Function} done - Callback when a task is done being processed.
 * @param {Function} drain - Callback when all tasks are done.
 * @returns {object} Returns an object that exposes `add` and `stats`.
 */
export default function useAsyncQueue({
  concurrency = 8,
  done,
  drain,
  inflight,
}) {
  if (concurrency < 1) concurrency = Infinity;

  const [stats, setStats] = useState({
    numPending: 0,
    numInFlight: 0,
    numDone: 0,
  });

  const inFlight = useRef([]);
  const pending = useRef([]);

  useEffect(() => {
    if (
      stats.numDone > 0 &&
      drain &&
      inFlight.current.length === 0 &&
      pending.current.length === 0
    )
      return drain();

    while (
      inFlight.current.length < concurrency &&
      pending.current.length > 0
    ) {
      const task = pending.current.shift();
      inFlight.current.push(task);
      setStats((stats) => {
        return {
          ...stats,
          numPending: stats.numPending - 1,
          numInFlight: stats.numInFlight + 1,
        };
      });
      inflight && inflight({ ...task, stats });
      const result = task.task();
      result
        .then(() => {
          inFlight.current.pop(task);
          setStats((stats) => {
            return {
              ...stats,
              numInFlight: stats.numInFlight - 1,
              numDone: stats.numDone + 1,
            };
          });
          done && done({ ...task, result, stats });
        })
        .catch(() => {
          inFlight.current.pop(task);
          setStats((stats) => {
            return {
              ...stats,
              numInFlight: stats.numInFlight - 1,
              numDone: stats.numDone + 1,
            };
          });
          done && done({ ...task, result, stats });
        });
    }
  }, [concurrency, done, drain, inflight, stats]);

  const add = useCallback((task) => {
    pending.current.push(task);
    setStats((stats) => {
      return {
        ...stats,
        numPending: stats.numPending + 1,
      };
    });
  }, []);

  return { add, stats };
}
