## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.
## 2024-05-09 - Accessible Icon Buttons in Forms
**Learning:** Icon-only buttons used for primary actions (like submitting forms) frequently lack `aria-label`s, rendering them opaque to screen readers. Adding Tailwind `focus-visible` states concurrently ensures keyboard navigability remains consistent.
**Action:** Always add an `aria-label` to icon-only buttons, and ensure they have `focus-visible` styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`).
