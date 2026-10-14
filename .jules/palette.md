## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2023-10-27 - Icon-only Submit Buttons Missing Loading States and A11y Labels
**Learning:** Found that icon-only submit buttons (like the Send button in the chat interface) lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the button lacked visual feedback (like a spinning icon) when in a loading state, relying only on disabling the button, which isn't clear to the user.
**Action:** When adding or reviewing icon-only buttons, especially for asynchronous actions (like submitting messages), always ensure `aria-label` and `focus-visible` classes are present. Use a spinning icon (like `RefreshCw` with `animate-spin`) to provide clear visual feedback during loading states.
