## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Semantic HTML for Clickable Header Status Indicators
**Learning:** Found several top-level status/action indicators (like Network Status, Users, Manage Modes) implemented as clickable `<div>` elements with `cursor-pointer`. This pattern breaks keyboard accessibility since `div` elements aren't inherently focusable or actionable via space/enter keys.
**Action:** When implementing any interactive UI element that triggers an action or opens a modal, always use semantic `<button type="button">` tags. Avoid `cursor-pointer` on divs, and ensure proper `focus-visible` styling is added to support keyboard navigation explicitly.
