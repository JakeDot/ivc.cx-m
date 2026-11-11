## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Cryptic State-Toggling Buttons Accessibility
**Learning:** Found that cryptic state-toggling buttons (like '+o' and '-o') in the user registry lacked clear, descriptive labels and keyboard focus states. The static `title` wasn't enough context.
**Action:** Implemented dynamic `aria-label` and `title` attributes that accurately describe the action based on the current state (e.g., 'Remove operator mode' vs 'Add operator mode'). Added `focus-visible` classes to ensure they are fully navigable via keyboard. Always avoid `aria-pressed` when the label/text itself changes based on state, as it confuses screen readers.
