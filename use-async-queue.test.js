import { renderHook, act } from '@testing-library/react-hooks';
import useAsyncQueue from './use-async-queue';

describe('useConcurrentQueue', () => {
  describe('real timers', () => {
    it('should initialize it', () => {
      const { result } = renderHook(() => useAsyncQueue({ concurrency: 1 }));
      expect(typeof result.current.add).toBe('function');
    });

    it('should run one immediate task', async () => {
      const inflight = jest.fn();
      const done = jest.fn();
      const task = {
        id: 0,
        task: () => {
          return Promise.resolve('0 is done');
        },
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 1, inflight, done })
      );

      expect(done).not.toHaveBeenCalled();
      expect(result.current.stats.numInFlight).toBe(0);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(0);
      act(() => result.current.add(task));
      await waitForNextUpdate();
      expect(inflight).toHaveBeenCalledTimes(1);
      expect(inflight.mock.calls[0][0]).toMatchObject({
        id: 0,
        task: expect.any(Function),
      });
      expect(done).toHaveBeenCalledTimes(1);
      expect(done.mock.calls[0][0]).toMatchObject({
        id: 0,
        task: expect.any(Function),
        result: expect.any(Promise),
      });
      expect(done.mock.calls[0][0].result).resolves.toBe('0 is done');
      expect(result.current.stats.numInFlight).toBe(0);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(1);
    });

    it('should run two immediate tasks, both resolve', async () => {
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            return Promise.resolve(`${id} is done`);
          },
        };
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 1, done })
      );

      expect(done).not.toHaveBeenCalled();
      act(() => {
        result.current.add(makeTask(0));
      });
      act(() => {
        result.current.add(makeTask(1));
      });
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(2);
      expect(done.mock.calls[0][0].result).resolves.toBe('0 is done');
      expect(done.mock.calls[1][0].result).resolves.toBe('1 is done');
    });

    it('should run two immediate tasks, one resolves, one rejects', async () => {
      const done = jest.fn();
      const drain = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            if (id === 0) {
              return Promise.resolve(`${id} is done`);
            } else {
              return Promise.reject(`${id} rejected`);
            }
          },
        };
      };
      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ concurrency, done, drain }) =>
          useAsyncQueue({ concurrency, done, drain }),
        { initialProps: { concurrency: 1, done, drain } }
      );

      // TODO: separate drain testing into its own test case.
      expect(done).not.toHaveBeenCalled();
      expect(drain).not.toHaveBeenCalled();
      act(() => {
        result.current.add(makeTask(0));
      });
      act(() => {
        result.current.add(makeTask(1));
      });
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(2);
      expect(done.mock.calls[0][0].result).resolves.toBe('0 is done');
      expect(done.mock.calls[1][0].result).rejects.toBe('1 rejected');
      expect(drain).toHaveBeenCalledTimes(1);
      // Force re-calcuation by changing a prop.
      rerender({ concurrency: 2, done, drain });
      // Ensure drain isn't called again.
      expect(drain).toHaveBeenCalledTimes(1);
    });

    // This test uses a real timeout, but the call to useFakeTimers messes with
    // it.
    it.skip('should run one deferred task', async () => {
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            return new Promise((resolve) =>
              setTimeout(() => resolve(`${id} is done`), 1000 * (id + 1))
            );
          },
        };
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 1, done })
      );

      expect(done).not.toHaveBeenCalled();
      act(() => result.current.add(makeTask(0)));
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(1);
      expect(done.mock.calls[0][0]).toMatchObject({
        id: 0,
        task: expect.any(Function),
        result: expect.any(Promise),
      });
      expect(done.mock.calls[0][0].result).resolves.toBe('0 is done');
    });
  });

  describe('fake timers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should run one deferred task at a time with concurrency 1', async () => {
      const inflight = jest.fn();
      const done = jest.fn();
      const drain = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            return new Promise((resolve) =>
              setTimeout(() => {
                resolve(`${id} is done`);
              }, 1000)
            );
          },
        };
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 1, inflight, done, drain })
      );

      expect(done).not.toHaveBeenCalled();
      expect(inflight).not.toHaveBeenCalled();
      expect(drain).not.toHaveBeenCalled();
      expect(result.current.stats.numInFlight).toBe(0);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(0);

      act(() => result.current.add(makeTask(0)));
      act(() => result.current.add(makeTask(1)));
      expect(result.current.stats.numPending).toBe(1);
      expect(result.current.stats.numInFlight).toBe(1);
      expect(inflight).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(900);
      expect(done).not.toHaveBeenCalled();
      expect(result.current.stats.numInFlight).toBe(1);
      expect(result.current.stats.numPending).toBe(1);
      expect(result.current.stats.numDone).toBe(0);
      jest.advanceTimersByTime(100);
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(1);
      expect(inflight).toHaveBeenCalledTimes(2);
      expect(drain).not.toHaveBeenCalled();
      expect(result.current.stats.numInFlight).toBe(1);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(1);
      jest.advanceTimersByTime(900);
      expect(done).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(100);
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(2);
      expect(result.current.stats.numInFlight).toBe(0);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(2);
      expect(drain).toHaveBeenCalledTimes(1);
    });

    it('should run two deferred tasks at a time with concurrency 2', async () => {
      const inflight = jest.fn();
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            return new Promise((resolve) =>
              setTimeout(() => {
                resolve(`${id} is done`);
              }, 1000)
            );
          },
        };
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 2, inflight, done })
      );

      expect(done).not.toHaveBeenCalled();

      act(() => result.current.add(makeTask(0)));
      act(() => result.current.add(makeTask(1)));
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numInFlight).toBe(2);
      expect(inflight).toHaveBeenCalledTimes(2);
      expect(done).toHaveBeenCalledTimes(0);
      jest.advanceTimersByTime(900);
      expect(done).not.toHaveBeenCalled();
      expect(result.current.stats.numInFlight).toBe(2);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(0);
      jest.advanceTimersByTime(100);
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(2);
      expect(result.current.stats.numInFlight).toBe(0);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(2);
    });
  });
});
