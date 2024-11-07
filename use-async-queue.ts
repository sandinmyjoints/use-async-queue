import { useState, useRef, useCallback, useEffect } from "react";
import nextTick from "next-tick";

interface QueueStats {
  numPending: number;
  numInFlight: number;
  numDone: number;
}

interface QueueTaskResult {
  id: unknown;
  task(): Promise<unknown>;
  result?: Promise<unknown>;
  stats?: QueueStats;
}

interface Queue {
  add: (task: QueueTaskResult) => void;
  stats: QueueStats;
}

interface QueueOpts {
  concurrency?: number;
  done?: (result: QueueTaskResult) => void;
  drain?: () => void;
  inflight?: (task: QueueTaskResult) => void;
}

function useAsyncQueue(opts: QueueOpts): Queue {
  const { done, drain, inflight } = opts;
  let { concurrency } = opts;
  concurrency = concurrency || Infinity;
  if (concurrency < 1) concurrency = Infinity;

  const [stats, setStats] = useState({
    numPending: 0,
    numInFlight: 0,
    numDone: 0,
  });

  const drained = useRef(true);
  const inFlight = useRef([] as QueueTaskResult[]);
  const pending = useRef([] as QueueTaskResult[]);

  useEffect(() => {
    if (
      stats.numDone > 0 &&
      drain &&
      inFlight.current.length === 0 &&
      pending.current.length === 0 &&
      !drained.current
    ) {
      drained.current = true;
      return nextTick(drain);
    }

    while (
      inFlight.current.length < concurrency! &&
      pending.current.length > 0
    ) {
      drained.current = false;
      const task = pending.current.shift();
      if (task) {
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
            inFlight.current.pop();
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
            inFlight.current.pop();
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
    }
  }, [concurrency, done, drain, inflight, stats]);

  const add = useCallback((task: QueueTaskResult) => {
    if (
      !pending.current.find((t) => {
        return t.id === task.id;
      }) &&
      !inFlight.current.find((t) => {
        return t.id === task.id;
      })
    ) {
      pending.current.push(task);
      setStats((stats) => {
        return {
          ...stats,
          numPending: stats.numPending + 1,
        };
      });
    }
  }, []);

  return { add, stats };
}

export default useAsyncQueue;
