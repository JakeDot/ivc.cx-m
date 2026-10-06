## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.
## 2024-05-14 - Add loading spinner to async submit button
**Learning:** `RefreshCw` from `lucide-react` combined with Tailwind's `animate-spin` class is the standard convention for rendering loading spinners on interactive elements like submit buttons.
**Action:** Always use `RefreshCw` with `animate-spin` for loading states on submit buttons to maintain consistency across the app. Add `aria-hidden="true"` to decorative icons. Use disabled states.
