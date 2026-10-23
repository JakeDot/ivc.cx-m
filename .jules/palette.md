## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.
## 2024-10-23 - Dynamic attributes for state-toggling buttons
**Learning:** Cryptic state-toggling buttons (like '+o' or '-o' for user modes) lack sufficient context for screen readers and keyboard users when they only have static titles.
**Action:** Always implement dynamic `aria-label`, `aria-pressed`, and `title` attributes based on the button's active state. Ensure proper `focus-visible` classes are applied for keyboard accessibility.
