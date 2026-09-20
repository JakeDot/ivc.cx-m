## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Loading State Feedback on Async Action Buttons
**Learning:** Found that async action buttons (like the main Send button, Bulk Send, and list item Send buttons) lacked proper visual feedback (loading spinners) when disabled during their asynchronous execution (`isSending`), relying only on text changes or opacity. This can leave users unsure if the action is actively processing.
**Action:** When working on interactive components that trigger asynchronous operations, always provide clear visual feedback by including a loading spinner. The convention in this codebase is to use `RefreshCw` from `lucide-react` with Tailwind's `animate-spin` class on the icon.
