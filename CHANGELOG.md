# Changelog

## [3.0.0] - 2024-11-21

### Changed

- **Breaking:** Duplication prevention: when `add` is called with a task that
  has an `id` equal to the `id` of a pending or in-flight tasks, the task will
  not be added to the queue.
  - Equality is checked with `===`, so `id`s should be primitives.
  - This implies that only one task with undefined `id` can be in the queue at
    a time, essentially making `id` a required field.
