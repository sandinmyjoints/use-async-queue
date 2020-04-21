import { renderHook, act } from '@testing-library/react-hooks';
import useAsyncQueue from './use-async-queue';

describe('useConcurrentQueue', () => {
  describe('real timers', () => {
    it('should initialize it', () => {
      const { result } = renderHook(() => useAsyncQueue({ concurrency: 1 }));
      expect(typeof result.current.add).toBe('function');
    });

    it('should run one immediate task', async () => {
      const done = jest.fn();
      const task = {
        id: 0,
        task: () => {
          console.log('DEBUG: task started');
          return Promise.resolve('0 is done');
        },
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 1, done })
      );

      expect(done).not.toHaveBeenCalled();
      expect(result.current.numInFlight).toBe(0);
      expect(result.current.numPending).toBe(0);
      expect(result.current.numDone).toBe(0);
      act(() => result.current.add(task));
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(1);
      expect(done.mock.calls[0][0]).toMatchObject({
        id: 0,
        task: expect.any(Function),
        result: expect.any(Promise),
      });
      expect(done.mock.calls[0][0].result).resolves.toBe('0 is done');
      expect(result.current.numInFlight).toBe(0);
      expect(result.current.numPending).toBe(0);
      expect(result.current.numDone).toBe(1);
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
      expect(done.mock.calls[1][0].result).rejects.toBe('1 rejected');
    });

    // This test uses a real timeout, but the call to useFakeTimers messes with
    // it.
    it.skip('should run one deferred task', async () => {
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            console.log('DEBUG: task started');
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
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            console.log(`DEBUG: task ${id} started`);
            return new Promise((resolve) =>
              setTimeout(() => {
                console.log(`${id} is done`);
                resolve(`${id} is done`);
              }, 1000)
            );
          },
        };
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 1, done })
      );

      expect(done).not.toHaveBeenCalled();
      expect(result.current.numInFlight).toBe(0);
      expect(result.current.numPending).toBe(0);
      expect(result.current.numDone).toBe(0);

      act(() => result.current.add(makeTask(0)));
      act(() => result.current.add(makeTask(1)));
      jest.advanceTimersByTime(900);
      expect(done).not.toHaveBeenCalled();
      expect(result.current.numInFlight).toBe(1);
      expect(result.current.numPending).toBe(1);
      expect(result.current.numDone).toBe(0);
      jest.advanceTimersByTime(100);
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(1);
      expect(result.current.numInFlight).toBe(1);
      expect(result.current.numPending).toBe(0);
      expect(result.current.numDone).toBe(1);
      jest.advanceTimersByTime(900);
      expect(done).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(100);
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(2);
      expect(result.current.numInFlight).toBe(0);
      expect(result.current.numPending).toBe(0);
      expect(result.current.numDone).toBe(2);
    });

    it('should run two deferred tasks at a time with concurrency 2', async () => {
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            console.log(`DEBUG: task ${id} started`);
            return new Promise((resolve) =>
              setTimeout(() => {
                console.log(`${id} is done`);
                resolve(`${id} is done`);
              }, 1000)
            );
          },
        };
      };
      const { result, waitForNextUpdate } = renderHook(() =>
        useAsyncQueue({ concurrency: 2, done })
      );

      expect(done).not.toHaveBeenCalled();

      act(() => result.current.add(makeTask(0)));
      act(() => result.current.add(makeTask(1)));
      jest.advanceTimersByTime(900);
      expect(done).not.toHaveBeenCalled();
      expect(result.current.numInFlight).toBe(2);
      expect(result.current.numPending).toBe(0);
      expect(result.current.numDone).toBe(0);
      jest.advanceTimersByTime(100);
      await waitForNextUpdate();
      expect(done).toHaveBeenCalledTimes(2);
      expect(result.current.numInFlight).toBe(0);
      expect(result.current.numPending).toBe(0);
      expect(result.current.numDone).toBe(2);
    });
  });
});
