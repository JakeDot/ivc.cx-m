## 2025-05-18 - Destructive Actions and Icon Buttons in Scheduled Tasks
**Learning:** Found that icon-only action buttons (like Delete and Pause) on scheduled tasks lacked `aria-label` attributes and keyboard focus indicators (`focus-visible`). Additionally, the destructive "Delete" action executed immediately without a confirmation prompt, which can lead to accidental data loss.
**Action:** When adding or reviewing icon-only buttons, especially in list items or repetitive components, always ensure `aria-label` and `focus-visible` classes are present. For any destructive actions (like delete), ensure a confirmation mechanism (like `window.confirm`) is in place.

## 2024-06-13 - [Channel Chat Accessibility]
**Learning:** Icon-only buttons (like the Send button) in interactive chats often lack screen reader support, leaving visually impaired users unsure of the button's function or its loading state when pressed.
**Action:** Always add descriptive `aria-label`s to icon-only buttons, and update the label and use a spinner during async states.
