## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2025-05-18 - Visual Loading States for Async Buttons
**Learning:** Found that async form submit buttons in the app were disabling correctly, but lacking active visual feedback (like a spinning loading indicator), which makes it unclear to the user if a network request is actually in progress or if the interface is frozen.
**Action:** When working on async actions and forms, in addition to text changes or disabling the button, replace static action icons (like a `Send` icon) with a `RefreshCw` icon featuring the Tailwind `animate-spin` class to provide immediate visual feedback.
