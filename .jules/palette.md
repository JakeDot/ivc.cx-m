## 2024-10-22 - Found optimization
**Learning:** Found chat performance issue
**Action:** Used memo on react component

## 2024-10-22 - Missing dynamic aria-labels on state toggles
**Learning:** Cryptic state-toggling buttons like `+o` or `-o` lack contextual accessibility labels, making their purpose and active state unclear to screen reader users.
**Action:** Implement a static `aria-label` along with a dynamic `aria-pressed` attribute based on their active state. Do not use dynamically changing aria-label on a toggle button.
