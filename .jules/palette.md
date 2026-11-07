## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Loading State Feedback on Async Action Buttons
**Learning:** Found that the primary "Send" button changed its text to "Sending..." during submission, but lacked a visual loading spinner, making the async state less obvious, and the decorative icon was still read by screen readers.
**Action:** When adding async button states, include an animated spinner (like `RefreshCw` with `animate-spin` class) for better visual feedback, and always ensure decorative icons have `aria-hidden="true"` so screen readers ignore them.
