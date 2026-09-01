## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2026-09-01 - Chat Input Submit Button A11y
**Learning:** Found that the primary chat input submit button in `ChannelLandingPage.tsx` was an icon-only button lacking an `aria-label`, focus indicators (`focus-visible`), and a loading state (`Loader2` spinner), making it inaccessible for screen readers and keyboard users, and providing poor feedback during async network requests.
**Action:** When adding or reviewing icon-only submit buttons in chat interfaces or forms, always ensure `aria-label` and `focus-visible:outline-none focus-visible:ring-2` classes are present, and swap the icon to a spinner during `isSending`/loading states.
