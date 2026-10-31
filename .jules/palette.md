## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Dynamic ARIA Labels for State-Toggling Buttons
**Learning:** Found that cryptic state-toggling buttons (like '+o' or '-o' for modes) lacked dynamic `aria-label` and `title` attributes, making it difficult for screen readers and users to understand the current state and action. Additionally, they lacked `focus-visible` classes.
**Action:** Implemented dynamic `aria-label` and `title` attributes based on the button's active state (e.g., "Add Operator Mode" vs "Remove Operator Mode"). Avoided `aria-pressed` as it conflicts with dynamically changing labels. Also added proper `focus-visible` classes for keyboard navigation.
