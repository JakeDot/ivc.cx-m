## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Async Loading States and Decorative Icons
**Learning:** Found that the primary async submit button ("Send") did not include a visual loading spinner, making the disabled "Sending..." state less apparent. Also, decorative icons inside the button lacked `aria-hidden="true"`, causing screen readers to potentially announce them unnecessarily.
**Action:** Always include a visual loading indicator (like `RefreshCw` with `animate-spin`) for async actions that take time, to provide immediate feedback. Additionally, add `aria-hidden="true"` to any purely decorative icons within buttons so screen readers only read the meaningful text label.
