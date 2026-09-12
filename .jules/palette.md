## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Interactive Elements and Semantic HTML
**Learning:** Found interactive elements (like the navigation items for IVC Network, Users, and Manage Modes) that were implemented using `<div>` tags with `onClick` handlers. These lacked implicit keyboard navigation (tabbing) and standard focus management, breaking accessibility.
**Action:** When creating or reviewing interactive elements that perform actions without navigating away from the page, always convert `<div onClick={...}>` to semantic `<button type="button">` tags. Remove unnecessary `cursor-pointer` classes, and ensure standard Tailwind focus rings (e.g. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1`) are applied.
