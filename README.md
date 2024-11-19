# use-async-queue

A React Hook implementing a queue for sync or async tasks, with optional
concurrency limit.

Inspired by
[@caolan/async.queue](http://caolan.github.io/async/docs.html#queue).

## Usage

- Create a queue with some concurrency. Default concurrency is 8. Set to
  `Infinity` or less than 1 for no concurrency limit.
- Register for notifications as tasks are processed and finished.
- Add tasks to it. A task is an object with an `id` (some unique primitive
  value that makes sense for your use case -- a number, a url, etc.) and a
  `task` (a function that returns a Promise).
  - If `add` is called with a task that has an `id` equal to the `id` of a
    pending or in-flight tasks, it will not be added to the queue.
- **Demo: https://codesandbox.io/s/use-async-queue-demo-53y89**

```javascript
import useAsyncQueue from 'use-async-queue';

// Example shows a task fetching a url, but a task can be any operation.
const url = 'some url';

const inflight = task => {
  console.log(`starting ${task.id}`);
  console.dir(stats); // { numPending: 0, numInFlight: 1, numDone: 0}
};

const done = async task => {
  const result = await task.result;
  console.log(`finished ${task.id}: ${result}`);
  console.dir(stats); // { numPending: 0, numInFlight: 0, numDone: 1}
};

const drain = () => {
  console.log('all done');
  console.dir(stats); // { numPending: 0, numInFlight: 0, numDone: 1}
};

const { add, stats } = useAsyncQueue({
  concurrency: 1,
  inflight,
  done,
  drain,
});

add({
  id: url,
  task: () => {
    return fetch(url).then(res => res.text());
  },
});
console.dir(stats); // { numPending: 1, numInFlight: 0, numDone: 0}
```

## TODO

- [x] return numInFlight, numRemaining, numDone
- [x] catch
- [x] pending/inflight
- [x] inflight callback
- [x] drain callback
- [ ] timeouts
- [ ] start, stop methods
- [ ] use events instead of/in addition to callbacks
