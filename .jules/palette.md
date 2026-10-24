## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Cryptic State-Toggling Buttons Accessibility
**Learning:** Found that cryptic state-toggling buttons (like '+o' or '-o' for modes) lacked dynamic `aria-label`, `aria-pressed`, and `title` attributes based on their active state. Also missing proper `focus-visible` classes, making it difficult for screen readers and keyboard users to clearly understand their purpose and current status.
**Action:** Always implement dynamic `aria-label`, `aria-pressed`, and `title` attributes for cryptic state-toggling buttons based on their active state, and ensure proper `focus-visible` classes are applied to ensure keyboard accessibility.
