## 2024-05-18 - Replacing onClick divs with accessible buttons
**Learning:** Found multiple instances where `div` tags were used with `onClick` handlers for important header navigation actions ("IVC Network", "Users", "Manage Modes"). This is an accessibility anti-pattern that breaks keyboard navigation and hides interactive elements from screen readers.
**Action:** Replaced `div` elements acting as buttons with `<button type="button">`. Added `focus-visible` classes to ensure visible focus indicators for keyboard users while retaining normal styling for pointer interactions.
