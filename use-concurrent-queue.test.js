import { renderHook, act } from '@testing-library/react-hooks';
import useConcurrentQueue from './use-concurrent-queue';

beforeEach(() => {
  jest.useFakeTimers();
});

it('should initialize it', () => {
  const { result } = renderHook(() => useConcurrentQueue({ concurrency: 1 }));
  expect(typeof result.current.add).toBe('function');
});

it('should use it', () => {
  const done = jest.fn();
  const task = {
    id: 1,
    task: () => Promise.resolve('1 is done'),
  };
  const { result } = renderHook(() =>
    useConcurrentQueue({ concurrency: 1, done })
  );
  expect(done).not.toHaveBeenCalled();
  act(() => result.current.add(task));
  expect(done).toHaveBeenCalledTimes(1);
});
