## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Adding Spinners and ARIA Labels to Async Buttons
**Learning:** Found that the main form submission button ("Send") did not provide clear visual loading feedback (just text) and its icons lacked `aria-hidden="true"`, causing screen readers to redundantly announce decorative icons alongside the text.
**Action:** Use `RefreshCw` from `lucide-react` with Tailwind's `animate-spin` for standard loading spinners on interactive elements. Always add `aria-hidden="true"` to decorative icons (e.g., Lucide icons like `Send` or `RefreshCw` inside buttons) so screen readers only announce the meaningful text.
