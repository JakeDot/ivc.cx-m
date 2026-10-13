## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2023-10-24 - Async Action Buttons and Accessibility
**Learning:** Found that async action buttons (like the submit button in the ChannelLandingPage chat form) lacked clear accessible labels, aria-hidden for icons, and an accessible spinning indicator during network requests.
**Action:** When creating or modifying async action buttons (like submit buttons that trigger API requests), ensure they have a loading state to prevent double submission. Add `aria-label` to icon-only action buttons. Add `aria-hidden="true"` to decorative icons (like `Send` or `RefreshCw`) so screen readers don't announce redundant icon names.
