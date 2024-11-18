import "@testing-library/jest-dom";
import { renderHook, waitFor, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { act } from "react";
import useAsyncQueue from "./dist/use-async-queue";
import { Component } from "./component";

describe("useAsyncQueue", () => {
  describe("real timers", () => {
    it("should initialize it", () => {
      const { result } = renderHook(() => useAsyncQueue({ concurrency: 1 }), {
        wrapper: StrictMode,
      });
      expect(typeof result.current.add).toBe("function");
    });

    it("should not add a task with the same id as an existing task", async () => {
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            return Promise.resolve(`${id} is done`);
          },
        };
      };
      const { result } = renderHook(
        () => useAsyncQueue({ concurrency: 1, done }),
        { wrapper: StrictMode }
      );

      expect(done).not.toHaveBeenCalled();
      act(() => {
        result.current.add(makeTask(0));
      });
      act(() => {
        result.current.add(makeTask(0));
      });
      await waitFor(() => {
        expect(done).toHaveBeenCalledTimes(1);
        expect(done.mock.calls[0][0].result).resolves.toBe("0 is done");
      });
    });

    it("should run one immediate task", async () => {
      const inflight = jest.fn();
      const done = jest.fn();
      const task = {
        id: 0,
        task: () => {
          return Promise.resolve("0 is done");
        },
      };
      const { result } = renderHook(
        () => useAsyncQueue({ concurrency: 1, inflight, done }),
        { wrapper: StrictMode }
      );

      expect(done).not.toHaveBeenCalled();
      expect(result.current.stats.numInFlight).toBe(0);
      expect(result.current.stats.numPending).toBe(0);
      expect(result.current.stats.numDone).toBe(0);
      act(() => result.current.add(task));

      await waitFor(() => {
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
        expect(done.mock.calls[0][0].result).resolves.toBe("0 is done");
        expect(result.current.stats.numInFlight).toBe(0);
        expect(result.current.stats.numPending).toBe(0);
        expect(result.current.stats.numDone).toBe(1);
      });
    });

    it("should run two immediate tasks, both resolve", async () => {
      const done = jest.fn();
      const makeTask = (id) => {
        return {
          id,
          task: () => {
            return Promise.resolve(`${id} is done`);
          },
        };
      };
      const { result } = renderHook(
        () => useAsyncQueue({ concurrency: 1, done }),
        { wrapper: StrictMode }
      );

      expect(done).not.toHaveBeenCalled();
      await act(async () => {
        result.current.add(makeTask(0));
      });
      await act(async () => {
        result.current.add(makeTask(1));
        expect(done).toHaveBeenCalledTimes(1);
        expect(done.mock.calls[0][0].result).resolves.toBe("0 is done");
      });
      await waitFor(() => {
        expect(done).toHaveBeenCalledTimes(2);
        expect(done.mock.calls[1][0].result).resolves.toBe("1 is done");
      });
    });

    it("should run two immediate tasks, one resolves, one rejects", async () => {
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
      const { result } = renderHook(
        ({ concurrency, done, drain }) =>
          useAsyncQueue({ concurrency, done, drain }),
        { initialProps: { concurrency: 1, done, drain }, wrapper: StrictMode }
      );

      // TODO: separate drain testing into its own test case.
      expect(done).not.toHaveBeenCalled();
      expect(drain).not.toHaveBeenCalled();
      await act(async () => {
        result.current.add(makeTask(0));
      });
      await act(async () => {
        expect(done).toHaveBeenCalledTimes(1);
        expect(drain).toHaveBeenCalledTimes(1);
        expect(done.mock.calls[0][0].result).resolves.toBe("0 is done");
        result.current.add(makeTask(1));
      });

      await waitFor(() => {
        expect(done).toHaveBeenCalledTimes(2);
        expect(done.mock.calls[1][0].result).rejects.toBe("1 rejected");
        expect(drain).toHaveBeenCalledTimes(2);
      });
    });

    // This test uses a real timeout, but the call to useFakeTimers messes with
    // it.
    it.skip("should run one deferred task", async () => {
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
      const { result, waitForNextUpdate } = renderHook(
        () => useAsyncQueue({ concurrency: 1, done }),
        { wrapper: StrictMode }
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
      expect(done.mock.calls[0][0].result).resolves.toBe("0 is done");
    });
  });

  describe("fake timers", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("should run one deferred task at a time with concurrency 1", async () => {
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
      const { result } = renderHook(
        () => useAsyncQueue({ concurrency: 1, inflight, done, drain }),
        { wrapper: StrictMode }
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

      await act(async () => {
        expect(result.current.stats.numInFlight).toBe(1);
        expect(result.current.stats.numPending).toBe(1);
        expect(result.current.stats.numDone).toBe(0);
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        expect(done).toHaveBeenCalledTimes(1);
        expect(inflight).toHaveBeenCalledTimes(2);
        expect(drain).not.toHaveBeenCalled();
        expect(result.current.stats.numInFlight).toBe(1);
        expect(result.current.stats.numPending).toBe(0);
        expect(result.current.stats.numDone).toBe(1);
        jest.advanceTimersByTime(900);
        expect(done).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(done).toHaveBeenCalledTimes(2);
        expect(result.current.stats.numInFlight).toBe(0);
        expect(result.current.stats.numPending).toBe(0);
        expect(result.current.stats.numDone).toBe(2);
        expect(drain).toHaveBeenCalledTimes(1);
      });
    });

    it("should run two deferred tasks at a time with concurrency 2", async () => {
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
      const { result } = renderHook(
        () => useAsyncQueue({ concurrency: 2, inflight, done }),
        { wrapper: StrictMode }
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
      await waitFor(() => {
        expect(done).toHaveBeenCalledTimes(2);
        expect(result.current.stats.numInFlight).toBe(0);
        expect(result.current.stats.numPending).toBe(0);
        expect(result.current.stats.numDone).toBe(2);
      });
    });
  });

  describe("on mount", () => {
    it("should execute each task once", async () => {
      render(<Component />, {
        wrapper: StrictMode,
      });

      expect(screen.getByText("total: 3"));
      await waitFor(() => {
        expect(screen.queryAllByText(/item done/)).toHaveLength(1);
      });
      await waitFor(() => {
        expect(screen.queryAllByText(/item done/)).toHaveLength(2);
      });
      await waitFor(() => {
        expect(screen.queryAllByText(/item done/)).toHaveLength(3);
      });
      expect(screen.queryAllByText(/item done/)).not.toHaveLength(4);
      expect(screen.getByText("total: 3"));
    });
  });
});
