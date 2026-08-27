## 2024-05-20 - Expensive operations inside render/filter loops
**Learning:** Found multiple instances where invariant expensive operations (like `toLowerCase()`, `startOfDay(parseISO())`) were being run inside `.filter()` callbacks or un-memoized during every render, leading to O(n) redundant work.
**Action:** Always extract invariant calculations outside of loops and use `useMemo` for array filtering operations based on state.

## 2025-05-24 - Expensive string parsing inside sort comparator loops
**Learning:** Sorting data using `.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())` with string formats like 'MMM dd' is highly inefficient because it re-runs `new Date(string)` multiple times during the sort process (O(N log N)). It can also cause unexpected timezone/year issues when only parsing a month and day.
**Action:** Cache the deterministic numeric timestamp during the O(N) map/reduce aggregation loop and use those cached numeric values in the `Array.prototype.sort()` comparator (O(1) subtraction operation instead of string parsing).

## 2024-05-25 - Redundant serialization in event broadcasting
**Learning:** Found an $O(n)$ performance bottleneck where `JSON.stringify` was being called inside an `sseClients.forEach` loop during Server-Sent Events (SSE) broadcasting. This resulted in the same exact payload being stringified redundantly for every single connected client, causing unnecessary CPU cycles and memory allocations that scale linearly with active connections.
**Action:** Extract expensive and invariant data transformations (like `JSON.stringify`) out of loops that iterate over connection pools. Pre-compute the serialized payload once, store it in a variable, and write the static string to all clients.
## 2024-05-15 - Unnecessary Uint8Array wrapping of Node.js Buffers
**Learning:** `tweetnacl` operations expect `Uint8Array`s. However, in Node.js, `Buffer` objects are inherently instances of `Uint8Array`. Using `new Uint8Array(Buffer.from(..., 'base64'))` creates an unnecessary copy and wastes CPU cycles, especially since this verification occurs repeatedly on authenticated endpoints in `server.ts`. Also, using `new TextEncoder().encode()` creates avoidable allocations when `Buffer.from(str, 'utf8')` achieves the same `Uint8Array`-compatible result faster.
**Action:** Always pass `Buffer.from(...)` directly to APIs that require `Uint8Array` in Node.js instead of explicitly allocating a new `Uint8Array`. Avoid instantiating new `TextEncoder` objects for string conversions if `Buffer` is available.
