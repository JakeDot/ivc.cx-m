## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Dynamic ARIA Labels for State-Toggling Buttons
**Learning:** Found that cryptic state-toggling buttons (like "+o", "+a", "+v" mode buttons) were lacking dynamically updated `aria-label` and `title` attributes, making their exact state or outcome ambiguous to screen readers or users hovering over them. We should not use `aria-pressed` in these cases according to WAI-ARIA guidelines since the label changes dynamically.
**Action:** When creating state-toggling buttons where the label changes dynamically, always set an explicit dynamic `aria-label` and `title` based on the active state (e.g. "Add Admin Mode" vs "Remove Admin Mode") and ensure `focus-visible` outline styles are applied.
