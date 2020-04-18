import { useCallback, useEffect } from 'react';
import { useQueue } from 'react-use';

/*
task
{id: string or number, task: function returning promise}
*/
export default function useConcurrentQueue({ concurrency, done }) {
  if (concurrency < 1) concurrency = 1;

  // { add, remove, first, last, size }
  const inFlight = useQueue();
  const remaining = useQueue();

  const add = useCallback(
    (task) => {
      remaining.add(task);
    },
    [remaining]
  );

  useEffect(() => {
    while (inFlight.size < concurrency && remaining.size > 0) {
      const task = remaining.remove();
      inFlight.add(task);
      const promise = task.task();
      promise.then(() => {
        inFlight.remove(task);
        done({ ...task, promise });
      });
    }
  }, [concurrency, done, inFlight, remaining]);

  return { add };
}
