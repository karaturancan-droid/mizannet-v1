## 2026-09-21 - [Parallelizing Independent Async Calls]
**Learning:** Found a classic "waterfall" bottleneck in useAyarlar.ts where the app was sequentially awaiting IPC calls in a or...of loop to load settings on initial startup. Because pp-shell.tsx blocks on this load to verify setup completion, this serial fetching severely degrades the perceived startup time.
**Action:** Replace sequential waits inside or...of loops with Promise.all(array.map(async () => ...)) whenever the operations are independent (like fetching different settings keys) to execute them concurrently and massively reduce total wait time.

