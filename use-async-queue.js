import { useState, useRef, useCallback, useEffect } from 'react';

/*
task
{id: string or number, task: function returning promise}
*/
export default function useAsyncQueue({
  concurrency = 8,
  done = () => {},
  inflight = () => {},
}) {
  if (concurrency < 1) concurrency = Infinity;

  const [numInFlight, setNumInFlight] = useState(0);
  const [numPending, setNumPending] = useState(0);
  const [numDone, setNumDone] = useState(0);

  const inFlight = useRef([]);
  const pending = useRef([]);

  useEffect(() => {
    while (
      inFlight.current.length < concurrency &&
      pending.current.length > 0
    ) {
      const task = pending.current.pop();
      setNumPending((n) => n - 1);
      inFlight.current.push(task);
      setNumInFlight((n) => n + 1);
      inflight(task);
      const result = task.task();
      result
        .then(() => {
          inFlight.current.pop(task);
          setNumInFlight((n) => n - 1);
          setNumDone((n) => n + 1);
          done({ ...task, result });
        })
        .catch(() => {
          inFlight.current.pop(task);
          setNumInFlight((n) => n - 1);
          setNumDone((n) => n + 1);
          done({ ...task, result });
        });
    }
  }, [concurrency, done, inflight, numPending, numInFlight]);

  const add = useCallback(
    (task) => {
      pending.current.push(task);
      setNumPending((n) => n + 1);
    },
    [pending]
  );

  return { add, numInFlight, numPending, numDone };
}
