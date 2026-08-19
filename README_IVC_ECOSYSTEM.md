# JakeDot/ivc-* Ecosystem Overview

This repository acts as the central reference node and implementation hub for the **IVC (Inter-Virtual-Channel)** protocol ecosystem. 

Below is a meta-overview of the namespace components implemented within this project and how they map to the broader `JakeDot/ivc-*` architecture.

## 1. `JakeDot/ivc-server` (The Node.js Reference Implementation)
**Location in this project:** Root Directory (`/server.ts`, `/src/*`)
* **Role:** The primary, reference implementation of an IVC Fortress Node.
* **Architecture:** Full-stack TypeScript (Express.js backend, React frontend via Vite).
* **Key Capabilities:**
  * Zero-Trust Cryptographic Engine (Ed25519 signature verification).
  * Global Server Mode state tracking (`+o`, `+a`, `+x`).
  * Target Channel Mode enforcement (`#general+m`).
  * Live Server-Sent-Event (SSE) bridging for real-time network broadcasting.
  * Trust-On-First-Use (TOFU) User Registry for mapping Public Keys.
  * File-based persistence engine (`ivc-state.json`).

## 2. `JakeDot/ivc-protocol` (The Specification)
**Location in this project:** `/IVC_PROTOCOL.md`
* **Role:** The living document and formal specification defining how IVC nodes and clients communicate.
* **Key Specs Implemented:**
  * URI and Channel Symbol definitions (`#`, `@`, `$`, `§`, `∆`, `~`, `+`).
  * Mode modifier semantics (`+`, `-`).
  * Ed25519 Cryptographic Header requirements (`X-IVC-User`, `X-IVC-PubKey`, `X-IVC-Signature`, `X-IVC-Timestamp`).
  * HTTP API contracts (`GET /+`, `PUT /+[modes]`, `POST /[target]`).

## 3. `JakeDot/ivc-client` (The Reference Clients)

This project contains two distinct reference client implementations to demonstrate connecting to the network securely.

### A. The Web/React Client (`@jakedot/ivc-client-web`)
**Location in this project:** `/src/lib/ivcClient.ts`, `/src/lib/ivcIdentity.ts`
* **Role:** The native browser implementation integrated directly into the admin dashboard.
* **Architecture:** TypeScript, `tweetnacl` (for crypto), `EventSource` (for SSE).
* **Usage:** Powers the web-based `ChannelLandingPage` chat interface and the `UserRegistryModal` admin tooling.

### B. The Java 25 Native Client (`@jakedot/ivc-client-java`)
**Location in this project:** `/ivc-client/` (Maven Submodule)
* **Role:** A cross-platform (Linux/Windows/Android) native implementation.
* **Architecture:** Java 25, BouncyCastle (for crypto), `java.net.http.HttpClient` (for async SSE).
* **Capabilities:** 
  * Identical cryptographic signature engine to the web client.
  * Non-blocking SSE stream ingestion.
  * Fully instrumented via JUnit 5 and OkHttp3 MockWebServer (see `/ivc-client/src/test/`).
  * Includes a reference Terminal CLI (`ExampleTerminalApp.java`).
