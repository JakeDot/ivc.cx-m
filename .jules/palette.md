## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - State-Toggling Mode Buttons Accessibility
**Learning:** Found that cryptic state-toggling buttons (like '+o' and '-o' modes) in the `UserRegistryModal` lacked proper accessibility attributes. Because these buttons both display current state and toggle it, users relying on screen readers or keyboard navigation might not understand their purpose or current status.
**Action:** Always implement dynamic `aria-label`, `aria-pressed`, and `title` attributes based on their active state, and ensure proper `focus-visible` classes are applied so they are accessible and intuitive for all users.
