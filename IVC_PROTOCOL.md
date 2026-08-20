# IVC Protocol Documentation

The Inter-Virtual-Channel (IVC) Protocol is a lightweight routing and event broadcasting system that allows diverse networks, channels, and users to communicate using URIs and modes. 

## 1. Channel Types

Channels are identified by specific prefix symbols in their URI:

| Prefix | Type | Example | Description |
|---|---|---|---|
| `#` | **Standard Channel** | `ivc://#general` | Public or private group communication spaces. |
| `@` | **User Channel** | `ivc://@jakedot` | Direct, private communication streams addressed to a specific user. |
| `$` | **Operator Channel** | `ivc://$ops` | Secure channels requiring Operator (+o) privileges, featuring EE2E encryption. |
| `§` | **Metadata Channel** | `ivc://§server-logs` | Broadcast channels used for automated metadata, logs, and system events. |
| `∆` | **Stats Channel** | `ivc://∆uptime` | Real-time streams outputting telemetry and operational statistics. |
| `~` | **Usage Profile** | `ivc://~jakedot` | Read-only profile cards displaying a user's usage patterns and statistics. |
| `+` | **Server Modes** | `ivc://+xyz` | Applies global configuration changes (modes) directly to the server. |

## 2. Channel & User Modes

Modes can be appended to any channel or user URI to apply temporary modifiers or denote privileges. They are represented by appending `+` followed by letters (e.g., `+xyz`). Modes can be removed or swapped using `-` (e.g., `+xyz-a`).

### Example Mode Modifiers:
* `+o`: Operator Privileges (required for `$oper` channels)
* `+a`: Admin Privileges (required for server-wide configurations like `GET /+`)
* `+d`: Data-Only Mode (strips UI wrapping and expects raw payload)
* `+m`: Moderated Mode (only approved senders can post)
* `+i`: Invite-Only (prevents standard connection)

### Mode Combinations & Scope

Modes can be applied at three different scopes in the IVC network:

#### 1. Per-User Modes
Applied to a user's address, denoting their global privileges across the network.
* **Example:** `ivc://@jakedot+oa` (User `jakedot` possesses global Operator `o` and Admin `a` privileges).

#### 2. Per-Channel Modes
Applied to a channel's address, enforcing rules or states for all participants within that channel.
* **Example:** `ivc://#announcements+mi` (The `#announcements` channel is Moderated `m` and Invite-Only `i`).

#### 3. Per-Channel/User Combinations (Contextual Privileges)
When a user targets a channel, their global modes might be overridden or augmented by contextual modes specific to that channel session. 
* **Example Use Case:** A user is not a global admin but is granted `+o` exclusively for `#community`.

## 3. Zero-Trust Cryptographic Engine

To prevent spoofing and unauthorized access across the IVC network, the protocol strictly enforces a **Zero-Trust Cryptographic Signature Engine** utilizing **Ed25519 Asymmetric Cryptography**.

### How it works
1. **Identity is a Keypair:** Users generate a local Ed25519 keypair. The Public Key represents their mathematical identity.
2. **Payload Signatures:** Every REST call (e.g. `POST`, `PUT`) must be cryptographically signed by the sender's Private Key. 
3. **Replay Protection:** Signatures are computed over `timestamp:method:path:body` and strictly verified against a 5-minute expiry window.
4. **Server-Enforced Modes:** Clients can no longer arbitrarily append privileges (e.g. `+oa`) to their `X-IVC-User` headers. The server utilizes **Trust-On-First-Use (TOFU)** to map a username to a Public Key. The server tracks global privileges internally and securely overrides the header.

### Required HTTP Headers
* `X-IVC-User`: The base username (e.g., `@jakedot`).
* `X-IVC-PubKey`: The Base64-encoded Ed25519 Public Key.
* `X-IVC-Signature`: The Base64-encoded Detached Signature.
* `X-IVC-Timestamp`: Epoch timestamp in milliseconds.

## 4. Server Configuration Endpoint (GET /+)

The server exposes a special root-level `+` endpoint (`GET /+`) which dumps the current active modes and statistics of the server in JSON format.

**Security:** This endpoint requires the requester to hold Admin (`+a`) privileges, enforced cryptographically by the server state.

* **Request Format:** 
  `GET /+`
* **Authorization:** 
  Header: `X-IVC-User: @username` (Client submits base username; Server verifies signature and checks internal Admin mapping).


## 5. Global Server Mode Modification Endpoints

Administrators can dynamically modify global server modes (which apply globally to the entire IVC Node) via the HTTP REST API. Mode updates are immediately broadcast over the SSE network to all connected clients.

**Security:** These endpoints strictly require the requester to hold Admin (`+a`) privileges, enforced cryptographically.

* **Add Modes:** `PUT /+[modes]`
* **Remove Modes:** `PUT /-[modes]` (or `DELETE /+[modes]`)
* **Headers:** Standard IVC Cryptographic Signature Headers.
* **Example:** `curl -X PUT -H "X-IVC-User: @jakedot" -H "X-IVC-PubKey: ..." -H "X-IVC-Signature: ..." -H "X-IVC-Timestamp: ..." https://server.com/+x` 

## 6. Target Mode Modification Endpoints

Administrators and Operators can dynamically modify modes on specific channels or users via the HTTP REST API. Mode updates are immediately broadcast over the SSE network to all connected clients.

**Security:** These endpoints require the requester to hold Operator (`+o`) or Admin (`+a`) privileges.

* **Add Modes:** `PUT /+[modes]/[target]`
* **Remove Modes:** `PUT /-[modes]/[target]` (or `DELETE /+[modes]/[target]`)
* **Headers:** `X-IVC-User: @username+o`
* **Example:** `curl -X PUT -H "X-IVC-User: @jakedot+oa" https://server.com/+m/%23general` (Moderates the `#general` channel).

## 6. Perceived Location Tracking (Location Header)

The IVC network automatically tracks and defines a user's footprint across the system. Every API response from the server includes an HTTP `Location:` header detailing the requester's context.

* **Header Format:** `Location: user@remote#server.ivc.cx/#c1,c2,...`
* **Example Output:** `Location: jakedot+oa@127.0.0.1#ivc.local/#general`

## 7. Subobject and Metadata Queries

Objects and messages within the IVC network can be directly addressed using subobject query paths appended to the URI. This applies to any addressable object (like a channel, user, or metadata channel).

### Message Subobjects
Individual messages inside an addressable object can be queried via:
* `/#line[number]`: Address a message by its ordinal line number (e.g., `ivc://#general/#line5`).
* `/£id[string]`: Address a message by its unique ID (e.g., `ivc://@jakedot/£id123abc`).

### Metadata Event Streams
Event streams for message states can be monitored by appending:
* `/∆sent`: Emits events specifically when messages are dispatched to the target.
* `/∆received`: Emits events specifically when messages are acknowledged by the target.

**Example:** `ivc://@jakedot/£id123abc/∆received` (Querying the received metadata event for a specific message ID in a user's channel).

## 8. Server-Sent Events (SSE) Payloads

The live SSE network streams structured JSON payloads. Clients receive real-time updates for:
* **Posts:** `{"type": "ivc_post", "channel": "c", "payload": "..."}`
* **Commands:** `{"type": "ivc_command", "command": "NOTIFY ..."}`
* **Server Modes:** `{"type": "ivc_server_mode", "modes": "xyz"}`
* **Target Modes:** `{"type": "ivc_mode_update", "action": "add", "modes": "m", "target": "#general"}`
