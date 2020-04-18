import { useState, useRef, useCallback, useEffect } from 'react';

/*
task
{id: string or number, task: function returning promise}
*/
export default function useConcurrentQueue({ concurrency, done }) {
  if (concurrency < 1) concurrency = 1;

  const [numInFlight, setNumInFlight] = useState(0);
  const [numRemaining, setNumRemaining] = useState(0);
  const [numDone, setNumDone] = useState(0);

  const inFlight = useRef([]);
  const remaining = useRef([]);

  useEffect(() => {
    console.log(
      'DEBUG: useEffect called',
      numInFlight,
      inFlight.current.length,
      numRemaining,
      remaining.current.length
    );
    while (
      inFlight.current.length < concurrency &&
      remaining.current.length > 0
    ) {
      const task = remaining.current.pop();
      setNumRemaining((n) => n - 1);
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
  }, [concurrency, done, numRemaining, numInFlight]);

  const add = useCallback(
    (task) => {
      remaining.current.push(task);
      setNumRemaining((n) => n + 1);
    },
    [remaining]
  );

  return { add, numInFlight, numRemaining, numDone };
}
