# use-async-queue

A React Hook implementing a queue for sync or async tasks with optional
concurrency limit. Default concurrency is 8. Set to `Infinity` or less than 1
for no concurrency limit.

Inspired by
[@caolan/async.queue](http://caolan.github.io/async/docs.html#queue).

## Usage

- Create a queue with some concurrency. Register for notifications as tasks
  are processed and finished.
- Add tasks to it. A task is an object with an `id` (some unique value that
  makes sense for your use case -- a number, a url, etc.) and a `task` (a
  function that returns a Promise).
- **Demo: https://codesandbox.io/s/use-async-queue-demo-53y89**


``` javascript
import useAsyncQueue from 'use-async-queue';

const done = (task) => {
  console.log(`fetched ${task.id}: ${task.result}`)
}

const queue = useAsyncQueue({
  concurrency,
  inflight,
  done,
});

const { numInFlight, numPending, numDone } = queue;

queue.add({id: url, task: () => fetch(url).then((res) => res.text()) })
```

## TODO

- [X] return numInFlight, numRemaining, numDone
- [X] catch
- [X] pending/inflight
- [X] inflight callback
- [ ] timeouts
- [ ] start, stop methods
- [ ] drain callback
- [ ] use events instead of/in addition to callbacks
