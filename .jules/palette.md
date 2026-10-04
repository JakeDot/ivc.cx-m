## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2024-10-04 - Adding ARIA labels to Icon-Only Buttons
**Learning:** Icon-only buttons (like the `Send` button in `ChannelLandingPage.tsx`) using SVGs (e.g., from `lucide-react`) are invisible to screen readers without an `aria-label`. Redundant readout of the SVG element itself is prevented by adding `aria-hidden="true"` to the icon component.
**Action:** Always add an `aria-label` to buttons without text content, and pair it with `aria-hidden="true"` on the enclosed decorative icons to ensure a clean, understandable screen reader experience.
