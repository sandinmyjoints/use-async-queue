import React, { useState } from 'react';
import useAsyncQueue from './use-async-queue';

const concurrency = 2;
const urlBase = 'https://reqres.in/api/users?page=';

const App = () => {
  const [itemId, setItemId] = useState(1);
  const [cache, setCache] = useState({});

  const inflight = ({ id }) => {
    setCache((c) => {
      return { ...c, [id]: 'inflight' };
    });
  };

  const done = ({ id, result }) => {
    result
      .then((res) => {
        return res.text();
      })
      .then((body) => {
        setCache((c) => {
          return {
            ...c,
            [id]: body.slice(0, 100) + '...',
          };
        });
      });
  };

  const queue = useAsyncQueue({
    concurrency,
    inflight,
    done,
  });

  // eslint-disable-next-line no-unused-vars
  const { numInFlight, numPending, numDone } = queue;

  const fetchNextItem = () => {
    const task = {
      id: itemId,
      task: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(fetch(`${urlBase}${itemId}`)), 1000);
        }),
    };
    queue.add(task);
    setItemId((n) => n + 1);
  };

  return (
    <>
      <h1>Async queue demo</h1>
      <button onClick={fetchNextItem}>Fetch item {itemId}</button>
      <p>numInFlight will never be greater than concurrency ({concurrency}).</p>
      {['numPending', 'numInFlight', 'numDone'].map((metric) => (
        <span key={metric}>
          {metric}: {eval(metric)}{' '}
        </span>
      ))}
      <table>
        <thead>
          <tr>
            <th>item</th>
            <th>status</th>
          </tr>
        </thead>
        <tbody>
          {'x'
            .repeat(itemId - 1)
            .split('')
            .map((_, idx) => {
              const id = idx + 1;
              return (
                <tr key={'item' + id}>
                  <td>item {id}</td>
                  <td>{cache[id] ? cache[id] : 'pending'}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </>
  );
};

export default App;
