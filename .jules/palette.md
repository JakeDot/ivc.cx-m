## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2024-05-18 - [Add aria-label to UserRegistryModal action buttons]
**Learning:** Testing frontend accessibility using Playwright might require bypassing complex authentication by mocking the API calls (like `/+users`) rather than changing source code, which preserves the `needsAuth` state without affecting tests logic.
**Action:** Mock responses using `page.route` in playwright to render UI components without having to handle Firebase logic.
