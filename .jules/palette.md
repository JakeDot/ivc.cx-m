## 2024-10-15 - Add ARIA Labels and Spinners to Buttons
**Learning:** Found multiple icon-only buttons missing `aria-label` or missing `type="button"`, as well as a submit button missing a loading spinner. Added a `RefreshCw` with `animate-spin` to async actions, and added `disabled` state with `opacity-50 cursor-not-allowed` to loading buttons.
**Action:** Always add `aria-label` to buttons without text. Add a `RefreshCw` with `animate-spin` to async actions, and add `disabled` state with `opacity-50 cursor-not-allowed` to loading buttons.
