## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-19 - Async Submit Feedback on Icon-Only Buttons
**Learning:** Icon-only submit buttons (like 'Send' in chat or messaging forms) often lacked visual feedback during asynchronous submission phases (e.g. `isSending` or `isLoading`). This causes uncertainty and can lead to duplicate submissions even if the button is technically disabled.
**Action:** Consistently replace the static icon with a `RefreshCw` icon featuring the `animate-spin` class when in a loading state. Ensure the button itself receives `disabled:cursor-not-allowed`, and always mark these decorative icons with `aria-hidden="true"` so screen readers only announce the `aria-label`.
