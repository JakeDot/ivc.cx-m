## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Accessibility for Async Icon Buttons
**Learning:** Icon-only buttons used for async actions (like submitting messages) often lack proper accessibility indicators. Users need visual feedback (loading spinners), keyboard accessibility (focus rings), and screen reader support (ARIA labels) when waiting for operations to complete.
**Action:** When creating or modifying icon-only async action buttons, ensure they have an `aria-label`, standard `focus-visible` styles, and implement a loading state using standard conventions (e.g., `<RefreshCw className="animate-spin" />`).
