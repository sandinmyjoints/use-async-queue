interface QueueStats {
    numPending: number;
    numInFlight: number;
    numDone: number;
}
interface QueueTaskResult {
    id: any;
    task(): Promise<any>;
    result?: Promise<any>;
    stats?: QueueStats;
}
interface Queue {
    add: (task: QueueTaskResult) => void;
    stats: QueueStats;
}
interface QueueOpts {
    concurrency?: number;
    done?: (result: QueueTaskResult) => void;
    drain?: () => void;
    inflight?: (task: QueueTaskResult) => void;
}
declare function useAsyncQueue(opts: QueueOpts): Queue;
export default useAsyncQueue;
