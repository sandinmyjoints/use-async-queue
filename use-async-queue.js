import { useState, useRef, useCallback, useEffect } from 'react';

/*
task
{id: string or number, task: function returning promise}
*/
export default function useAsyncQueue({ concurrency = 8, done }) {
  if (concurrency < 1) concurrency = Infinity;

  const [numInFlight, setNumInFlight] = useState(0);
  const [numPending, setNumPending] = useState(0);
  const [numDone, setNumDone] = useState(0);

  const inFlight = useRef([]);
  const pending = useRef([]);

  useEffect(() => {
    console.log(
      'DEBUG: useEffect called',
      numInFlight,
      inFlight.current.length,
      numPending,
      pending.current.length
    );
    while (
      inFlight.current.length < concurrency &&
      pending.current.length > 0
    ) {
      const task = pending.current.pop();
      setNumPending((n) => n - 1);
      inFlight.current.push(task);
      setNumInFlight((n) => n + 1);
      const result = task.task();
      result
        .then(() => {
          console.log('DEBUG: task resolved, calling done');
          inFlight.current.pop(task);
          setNumInFlight((n) => n - 1);
          setNumDone((n) => n + 1);
          done({ ...task, result });
        })
        .catch(() => {
          console.log('DEBUG: task rejected, calling done');
          inFlight.current.pop(task);
          setNumInFlight((n) => n - 1);
          setNumDone((n) => n + 1);
          done({ ...task, result });
        });
    }
  }, [concurrency, done, numPending, numInFlight]);

  const add = useCallback(
    (task) => {
      pending.current.push(task);
      setNumPending((n) => n + 1);
    },
    [pending]
  );

  return { add, numInFlight, numPending, numDone };
}
