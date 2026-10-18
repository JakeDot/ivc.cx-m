## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Async Submit Button UX
**Learning:** Found that async submit buttons lacking loading spinners and `aria-label`s fail to provide clear feedback and accessibility for screen reader users during network operations.
**Action:** When creating or reviewing async action buttons, especially icon-only buttons like "Send", always add `aria-label`, ensure a loading spinner (e.g., `RefreshCw` with `animate-spin`) is displayed when pending, include `focus-visible` styling for keyboard navigation, and hide decorative icons from screen readers using `aria-hidden="true"`.
