# IVC Notification Server & Dashboard

A comprehensive full-stack application operating as an Inter-Virtual-Channel (IVC) Node. It provides a real-time event-driven network, desktop notifications, server mode management, and an automated email dispatch engine integrated with Gmail.

## Features

- **IVC Protocol Implementation:** Deep integration of the custom `ivc://` protocol supporting Channels (`#`), Users (`@`), Operators (`$`), Metadata (`§`), Stats (`∆`), and Usage Profiles (`~`).
- **Live SSE Network:** Real-time bi-directional streaming via Server-Sent Events (SSE). Broadcasts message posts, command triggers, and mode updates directly to connected clients.
- **Desktop Notifications:** Hooks into native OS notifications to alert users of specific events or when Operator/Admin actions occur.
- **Dynamic Mode Management:** Assign privileges (`+o`, `+a`) and contextual modifiers (`+m`, `+i`) on a global, per-user, or per-channel basis.
- **Gmail Automation Engine:** Dispatch alerts, command-based messages, and scheduled tasks directly using Google Workspace OAuth.

## Architecture

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, Recharts (for telemetry/stats).
- **Backend:** Express.js + Node.js (running in a unified `server.ts` entrypoint).
- **Authentication:** Firebase Authentication for UI logins + Google API (`gmail.send` scope).
- **Security:** Strict header-based privilege enforcement (`X-IVC-User`).
