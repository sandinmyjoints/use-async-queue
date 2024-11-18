import useAsyncQueue from "./dist/use-async-queue";
import { useState, useEffect } from "react";

const makeTask = (id, delay) => {
  return {
    id,
    task: () => {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(`${id} is done`);
        }, delay)
      );
    },
  };
};

export const Component = () => {
  const [doneItems, setDoneItems] = useState([]);

  const done = (d) => {
    setDoneItems((items) => [...items, d]);
  };

  const { add, stats } = useAsyncQueue({ concurrency: 2, done });

  useEffect(() => {
    add(makeTask(1, 100));
    add(makeTask(2, 200));
    add(makeTask(3, 300));
  }, [add]);
  const { numPending, numInFlight, numDone } = stats;

  return (
    <>
      <span>pending: {numPending}</span>
      <span>inFlight: {numInFlight}</span>
      <span>done: {numDone}</span>
      <span>total: {numPending + numInFlight + numDone}</span>
      {doneItems.map((item) => (
        <li key={item.id}>item done - {item.id}</li>
      ))}
    </>
  );
};
