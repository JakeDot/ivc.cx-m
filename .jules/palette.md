## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Loading Spinners and ARIA Hidden for Submit Buttons
**Learning:** Async submit buttons without loading indicators (like spinners) provide poor feedback, leaving users wondering if their action succeeded. Decorative icons on these buttons can also be read out unnecessarily by screen readers if they lack `aria-hidden`.
**Action:** Use `lucide-react`'s `RefreshCw` with Tailwind's `animate-spin` class for loading states on submit buttons to provide clear feedback. For any decorative icons inside buttons (including loading spinners), ensure `aria-hidden="true"` is added so screen readers only announce the meaningful text.
