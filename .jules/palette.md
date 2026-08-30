## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2023-10-27 - Privilege Toggle Confirmations
**Learning:** Destructive actions related to user privileges (e.g., removing Admin or Operator rights) lacked a confirmation step, risking accidental privilege revocation. Additionally, icon-only buttons for toggling these modes lacked proper `aria-label`s and `focus-visible` styles.
**Action:** When working with sensitive mode toggles, always implement a `window.confirm` check for destructive un-assignments. Ensure all icon buttons in tables have `aria-label`s and visible focus indicators for keyboard users.
