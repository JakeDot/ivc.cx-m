## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.
## 2023-10-24 - Form Control Association
**Learning:** Some forms use visual labels without semantic HTML linking, causing screen readers to miss context. Static `id`s in modals are okay if only rendered once.
**Action:** Use `htmlFor` and `id` pairs or `aria-label` for form fields that lack visual `<label>` elements.
