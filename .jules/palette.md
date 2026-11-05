## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Loading Spinners and Screen Reader Accessibility
**Learning:** Found that the primary "Send" button in the Compose Notification form displayed raw text "Sending..." without visual feedback for the async operation, and its icon was announced by screen readers redundantly.
**Action:** When implementing async buttons, always include an animated loading spinner (like `RefreshCw` with `animate-spin` in Tailwind) and hide decorative icons using `aria-hidden="true"` to prevent redundant screen reader announcements.
