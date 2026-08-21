import express from "express";
import path from "path";
import fs from "fs/promises";
import dns from "dns/promises";
import ipaddr from "ipaddr.js";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nacl from "tweetnacl";

// Persistence configuration
const STATE_FILE = path.join(process.cwd(), 'ivc-state.json');

async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed;
  } catch (err) {
    return { globalServerModes: [], targetModes: {}, userRegistry: {}, userModesRegistry: {} };
  }
}

async function saveState(
  globalModes: Set<string>, 
  targetModesMap: Map<string, Set<string>>,
  userRegistry: Map<string, string>,
  userModesRegistry: Map<string, Set<string>>
) {
  const targetModesObj: Record<string, string[]> = {};
  for (const [target, modes] of targetModesMap.entries()) {
    targetModesObj[target] = Array.from(modes);
  }
  
  const userRegistryObj: Record<string, string> = {};
  for (const [user, key] of userRegistry.entries()) {
    userRegistryObj[user] = key;
  }
  
  const userModesObj: Record<string, string[]> = {};
  for (const [user, modes] of userModesRegistry.entries()) {
    userModesObj[user] = Array.from(modes);
  }

  const state = {
    globalServerModes: Array.from(globalModes),
    targetModes: targetModesObj,
    userRegistry: userRegistryObj,
    userModesRegistry: userModesObj
  };
  
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[IVC Persistence] Failed to save state', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Load persistence
  const initialState = await loadState();
  const globalServerModes = new Set<string>(initialState.globalServerModes || []);
  const targetModesState = new Map<string, Set<string>>();
  const userRegistry = new Map<string, string>();
  const userModesRegistry = new Map<string, Set<string>>();
  
  if (initialState.targetModes) {
    for (const [target, modes] of Object.entries(initialState.targetModes)) {
      targetModesState.set(target, new Set(modes as string[]));
    }
  }
  if (initialState.userRegistry) {
    for (const [user, key] of Object.entries(initialState.userRegistry)) {
      userRegistry.set(user, key as string);
    }
  }
  if (initialState.userModesRegistry) {
    for (const [user, modes] of Object.entries(initialState.userModesRegistry)) {
      userModesRegistry.set(user, new Set(modes as string[]));
    }
  }

  // Middleware to parse JSON payloads
  app.use(express.json());

  // ==========================================
  // Global IVC Perceived Location Header Middleware
  // ==========================================
  app.use((req, res, next) => {
    // Determine the host (use APP_URL domain if available, else request host)
    let host = req.get('host') || 'server.ivc.local';
    if (process.env.APP_URL) {
      try {
        host = new URL(process.env.APP_URL).host;
      } catch (e) {
        // Fallback to request host
      }
    }
      
    // Get the user from X-IVC-User header, fallback to anonymous
    let user = req.headers['x-ivc-user'] as string || 'anonymous';
    // Clean up the user if it's a full URI (e.g. ivc://@jakedot)
    if (user.startsWith('ivc://@')) {
      user = user.substring(7);
    } else if (user.startsWith('@')) {
      user = user.substring(1);
    }
    
    // Determine the channels (from path if it's a channel post)
    let channels = '';
    const pathDecoded = decodeURIComponent(req.path);
    if (!pathDecoded.startsWith('/api/') && pathDecoded.length > 1) {
      const channelRaw = pathDecoded.substring(1);
      // Only include it if it's a recognized channel type (starts with #, @, $, §, ∆, ~)
      if (/^[#@$§∆~]/.test(channelRaw)) {
        channels = `/${channelRaw}`;
      } else if (channelRaw.startsWith('+') || channelRaw.startsWith('-')) {
        // Target mode modifications e.g. /+xyz/#channel
        const parts = channelRaw.split('/');
        if (parts.length > 1 && /^[#@$§∆~]/.test(parts[1])) {
          channels = `/${parts[1]}`;
        }
      }
    }
    
    // Construct the Location header
    // e.g. Location: user@remote#server.ivc.cx/#c1,c2
    const userRemote = user.includes('@') ? user : `${user}@${req.ip || 'remote'}`;
    
    // Ensure the Location header does not contain invalid characters (e.g. ∆)
    const locationHeader = `${userRemote}#${host}${channels}`;
    res.setHeader('Location', encodeURI(locationHeader));
    next();
  });

  // ==========================================
  // Zero-Trust Cryptographic Identity Engine
  // ==========================================
  app.use((req, res, next) => {
    // Only apply cryptographic checks to IVC protocol routes (skip vite/assets/api)
    let fullyDecodedPath = req.path;
    try {
      while (fullyDecodedPath !== decodeURIComponent(fullyDecodedPath)) {
        fullyDecodedPath = decodeURIComponent(fullyDecodedPath);
      }
    } catch (e) {
      // Ignore malformed URIs
    }

    if (
      !fullyDecodedPath.startsWith('/+') &&
      !fullyDecodedPath.startsWith('/-') &&
      !fullyDecodedPath.startsWith('/#') &&
      !fullyDecodedPath.startsWith('/@') &&
      !fullyDecodedPath.startsWith('/$') &&
      !fullyDecodedPath.startsWith('/§') &&
      !fullyDecodedPath.startsWith('/∆') &&
      !fullyDecodedPath.startsWith('/~')
    ) {
      return next();
    }

    const ivcUserHeader = req.headers['x-ivc-user'] as string;
    const pubKeyBase64 = req.headers['x-ivc-pubkey'] as string;
    const signatureBase64 = req.headers['x-ivc-signature'] as string;
    const timestamp = req.headers['x-ivc-timestamp'] as string;

    if (!ivcUserHeader || !pubKeyBase64 || !signatureBase64 || !timestamp) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing Cryptographic Identity headers.' });
    }

    // 1. Replay Protection (5 minute window)
    if (Math.abs(Date.now() - parseInt(timestamp)) > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Payload timestamp expired.' });
    }

    // Parse base username (strip out any modes they try to spoof in the header)
    const baseUser = ivcUserHeader.split('+')[0].replace('@', '');

    // 2. Cryptographic Signature Verification
    // message format: timestamp:method:path:body
    const message = `${timestamp}:${req.method}:${req.path}:${req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : ''}`;
    
    try {
      const msgUint8 = new TextEncoder().encode(message);
      const sigUint8 = new Uint8Array(Buffer.from(signatureBase64, 'base64'));
      const pubKeyUint8 = new Uint8Array(Buffer.from(pubKeyBase64, 'base64'));

      const isValid = nacl.sign.detached.verify(msgUint8, sigUint8, pubKeyUint8);
      if (!isValid) throw new Error('Invalid Ed25519 signature');
    } catch (e: any) {
      console.error('[IVC Crypto] Signature failure:', e.message);
      return res.status(401).json({ error: 'Unauthorized', message: 'Cryptographic signature verification failed.' });
    }

    // 3. Trust-On-First-Use (TOFU) Identity Registry
    if (!userRegistry.has(baseUser)) {
      userRegistry.set(baseUser, pubKeyBase64);
      
      // The very first user to register on the node becomes the superadmin (+oa)
      if (userRegistry.size === 1) {
        userModesRegistry.set(baseUser, new Set(['o', 'a']));
        console.log(`[IVC Security] First user registered: @${baseUser}. Granted superadmin (+oa).`);
      } else {
        userModesRegistry.set(baseUser, new Set());
      }
      saveState(globalServerModes, targetModesState, userRegistry, userModesRegistry);
    } else if (userRegistry.get(baseUser) !== pubKeyBase64) {
      console.warn(`[IVC Security] Identity theft attempt blocked for @${baseUser}`);
      return res.status(403).json({ error: 'Forbidden', message: 'Identity theft detected: Public key mismatch.' });
    }

    // 4. Mode Enforcement injection
    // We completely overwrite the X-IVC-User header with the server's truth of their modes,
    // so downstream handlers can't be spoofed by the client appending '+oa'
    const actualModes = userModesRegistry.get(baseUser) || new Set();
    const modesStr = actualModes.size > 0 ? `+${Array.from(actualModes).join('')}` : '';
    req.headers['x-ivc-user'] = `@${baseUser}${modesStr}`;

    next();
  });

  // ==========================================
  // Gemini AI Chat API
  // ==========================================
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, systemInstruction, model } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // Default to 3.7-flash if not provided or valid
      const selectedModel = model || 'gemini-3.7-flash';
      
      // Convert standard chat message format to Gemini format
      // Note: First message must be 'user'. Alternating user/model.
      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const config: any = {
        systemInstruction,
      };

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config
      });

      res.json({ text: response.text, model: selectedModel });
    } catch (err) {
      console.error("[Gemini Error]", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================
  // IVC Network API Integration (Foreign Service)
  // ==========================================
  
  // SSE Clients
  let sseClients: express.Response[] = [];

  // Frontend connects here to receive real-time commands from the IVC Network
  app.get("/api/ivc/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseClients.push(res);
    console.log(`[SSE] Client connected. Total: ${sseClients.length}`);

    req.on("close", () => {
      sseClients = sseClients.filter(c => c !== res);
      console.log(`[SSE] Client disconnected. Total: ${sseClients.length}`);
    });
  });

  app.get("/api/ivc/status", (req, res) => {
    res.json({ 
      service: "NOTIFYBOT", 
      status: "online",
      clients_connected: sseClients.length
    });
  });

  // Main webhook for the IVC network to dispatch Foreign Service commands
  // e.g. { "action": "execute", "service_name": "NOTIFYBOT", "sender": "CyberFox", "command": "NOTIFY jakeuse@pm.me Hello | World" }
  app.post("/api/ivc/execute", (req, res) => {
    const { action, service_name, sender, command } = req.body;
    
    if (action === "execute") {
      console.log(`[IVC API] Received command from ${sender}: ${command}`);
      
      // Bridge the command to the React frontend via Server-Sent Events (SSE)
      // The frontend holds the Gmail OAuth token and will execute the send with user confirmation.
      sseClients.forEach(c => c.write(`data: ${JSON.stringify({ type: 'ivc_command', sender, command })}\n\n`));
      
      res.json({ 
        status: "dispatched", 
        message: "Command sent to active frontend clients for processing."
      });
    } else {
      res.status(400).json({ status: "ignored", message: "Unsupported action" });
    }
  });

  // Helper endpoint to register this service with an external IVC host
  app.post("/api/ivc/register", async (req, res) => {
    let { ivc_host } = req.body; // e.g. "https://chat.yourdomain.com"

    // SSRF Protection: Validate the provided host URL
    let originalHostname = "";
    try {
      const parsedUrl = new URL(ivc_host);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: "Invalid protocol" });
      }

      let targetHostname = parsedUrl.hostname;
      originalHostname = targetHostname;

      // Allow specific alias for localhost testing per requirements
      if (targetHostname === '$me') {
        parsedUrl.hostname = 'localhost';
        originalHostname = 'localhost';
        ivc_host = parsedUrl.toString();
        // Skip DNS resolution check for explicit $me alias
      } else {
        // Resolve DNS to get actual IP to prevent bypasses like 127.1 or octal/hex encodings
        const { address } = await dns.lookup(targetHostname);

        let parsedIp;
        try {
          parsedIp = ipaddr.process(address);
        } catch (e) {
          return res.status(400).json({ error: "Invalid IP resolved" });
        }

        const range = parsedIp.range();
        // Block private, loopback, and reserved IPs
        if (
          range === 'loopback' ||
          range === 'private' ||
          range === 'unspecified' ||
          range === 'linkLocal' ||
          range === 'uniqueLocal' ||
          range === 'broadcast' ||
          range === 'multicast'
        ) {
          return res.status(403).json({ error: "Forbidden host" });
        }

        // Prevent DNS rebinding by using the resolved IP in the URL
        if (address.includes(':')) {
          parsedUrl.hostname = `[${address}]`;
        } else {
          parsedUrl.hostname = address;
        }
        ivc_host = parsedUrl.toString();
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid or unresolvable URL" });
    }

    const myEndpoint = process.env.APP_URL ? `${process.env.APP_URL}/api/ivc/execute` : `http://localhost:${PORT}/api/ivc/execute`;
    
    try {
      const response = await fetch(`${ivc_host}/api/services.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Host": originalHostname
        },
        body: JSON.stringify({
          action: "register",
          service_name: "NOTIFYBOT",
          host: process.env.APP_URL || "localhost",
          api_endpoint: myEndpoint,
          metadata: "IVC Email Notification Service"
        })
      });
      const text = await response.text();
      res.json({ status: "registered", response: text });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================
  // User Registry API (GET /+users)
  // ==========================================
  app.get(/^\/\+users$/, (req, res) => {
    const ivcUser = req.headers['x-ivc-user'] as string || '';
    
    // Check if the user string contains +a (Admin)
    if (!ivcUser.includes('+') || !ivcUser.split('+')[1].includes('a')) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'This endpoint requires Admin (+a) privileges. Supply X-IVC-User header.' 
      });
    }

    const usersList: any[] = [];
    for (const [user, pubkey] of userRegistry.entries()) {
      const modesSet = userModesRegistry.get(user);
      usersList.push({
        username: user,
        pubkey: pubkey,
        modes: modesSet ? Array.from(modesSet).join('') : ''
      });
    }

    res.json({
      users: usersList,
      requested_by: ivcUser,
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // Server Admin Stats API (GET /+)
  // ==========================================
  app.get(/^\/\+$/, (req, res) => {
    // Requires Admin (+a) privilege
    const ivcUser = req.headers['x-ivc-user'] as string || '';
    
    // Check if the user string contains +a (e.g. @jake+a)
    if (!ivcUser.includes('+') || !ivcUser.split('+')[1].includes('a')) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'This endpoint requires Admin (+a) privileges. Supply X-IVC-User header.' 
      });
    }

    res.json({
      server_modes: {
        active_modes: Array.from(globalServerModes),
        max_users_limit: 100,
        slowmode_delay: 5,
        network_status: 'stable',
        connected_clients: sseClients.length
      },
      requested_by: ivcUser,
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // Global Server Mode Modification API (PUT /+modes, PUT /-modes, DELETE /+modes)
  // ==========================================
  const handleServerModeChange = (req: any, res: any, action: 'add' | 'remove') => {
    const ivcUser = req.headers['x-ivc-user'] as string || '';
    
    // Require +a (Admin) to change global server modes
    if (!ivcUser.includes('+') || !ivcUser.split('+')[1].includes('a')) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'This endpoint requires Admin (+a) privileges to change global server modes. Supply X-IVC-User header.' 
      });
    }

    const modes = req.params[0];
    
    // Update internal state
    for (const char of modes) {
      if (action === 'add') {
        globalServerModes.add(char);
      } else {
        globalServerModes.delete(char);
      }
    }
    
    const activeModesStr = Array.from(globalServerModes).join('');
    console.log(`[IVC API] Global Server Mode Update: ${action === 'add' ? '+' : '-'}${modes} by ${ivcUser}. Current: +${activeModesStr}`);
    
    saveState(globalServerModes, targetModesState, userRegistry, userModesRegistry);

    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ 
      type: 'ivc_server_mode', 
      action: action,
      modes: modes, 
      active_modes: activeModesStr,
      sender: ivcUser
    })}\n\n`));

    res.json({ 
      status: "global_modes_updated", 
      modes: `${action === 'add' ? '+' : '-'}${modes}`,
      active_modes: `+${activeModesStr}`,
      action: action
    });
  };

  app.put(/^\/\+([a-zA-Z]+)$/, (req, res) => handleServerModeChange(req, res, 'add'));
  app.put(/^\/-([a-zA-Z]+)$/, (req, res) => handleServerModeChange(req, res, 'remove'));
  app.delete(/^\/\+([a-zA-Z]+)$/, (req, res) => handleServerModeChange(req, res, 'remove'));

  // ==========================================
  // Target Mode Modification API (PUT /+modes/target, PUT /-modes/target, DELETE /+modes/target)
  // ==========================================
  const handleTargetModeChange = (req: any, res: any, action: 'add' | 'remove') => {
    const ivcUser = req.headers['x-ivc-user'] as string || '';
    
    // Require +o (Operator) or +a (Admin) to change modes
    if (!ivcUser.includes('+') || (!ivcUser.split('+')[1].includes('o') && !ivcUser.split('+')[1].includes('a'))) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'This endpoint requires Operator (+o) or Admin (+a) privileges. Supply X-IVC-User header.' 
      });
    }

    const modes = req.params[0];
    const target = decodeURIComponent(req.params[1]);
    
    if (!targetModesState.has(target)) {
      targetModesState.set(target, new Set());
    }
    const currentModes = targetModesState.get(target)!;

    for (const char of modes) {
      if (action === 'add') {
        currentModes.add(char);
      } else {
        currentModes.delete(char);
      }
    }

    const activeModesStr = Array.from(currentModes).join('');
    console.log(`[IVC API] Mode Update: ${action === 'add' ? '+' : '-'}${modes} on ${target} by ${ivcUser}. Current: +${activeModesStr}`);
    
    saveState(globalServerModes, targetModesState, userRegistry, userModesRegistry);

    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ 
      type: 'ivc_mode_update', 
      action: action,
      modes: modes, 
      active_modes: activeModesStr,
      target: target,
      sender: ivcUser
    })}\n\n`));

    res.json({ 
      status: "modes_updated", 
      target: target, 
      modes: `${action === 'add' ? '+' : '-'}${modes}`,
      active_modes: `+${activeModesStr}`,
      action: action
    });
  };

  app.put(/^\/\+([a-zA-Z]+)\/(.+)$/, (req, res) => handleTargetModeChange(req, res, 'add'));
  app.put(/^\/-([a-zA-Z]+)\/(.+)$/, (req, res) => handleTargetModeChange(req, res, 'remove'));
  app.delete(/^\/\+([a-zA-Z]+)\/(.+)$/, (req, res) => handleTargetModeChange(req, res, 'remove'));

  // ==========================================
  // Direct Channel Posting API
  // ==========================================
  app.post("/*", (req, res, next) => {
    // Ignore internal API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Capture the channel from the path, e.g. /%23c -> #c, /c -> c, /+xyz -> +xyz
    const channelRaw = decodeURIComponent(req.path.substring(1)); // remove leading slash
    if (!channelRaw) {
      return next();
    }

    if (channelRaw.startsWith('/')) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Posting to reserved channels prefixed with '/' is not allowed."
      });
    }
    
    const payload = req.body;
    const ivcUser = req.headers['x-ivc-user'] as string || 'anonymous';
    const userModes = ivcUser.includes('+') ? ivcUser.split('+')[1] : '';

    if (channelRaw.startsWith('+')) {
      const modes = channelRaw.substring(1); // e.g. 'xyz'
      console.log(`[IVC API] Direct POST to apply server modes: +${modes}`, payload);

      // Broadcast as a server mode update
      sseClients.forEach(c => c.write(`data: ${JSON.stringify({ 
        type: 'ivc_server_mode', 
        modes: modes, 
        payload: payload 
      })}\n\n`));

      return res.json({ status: "server_modes_applied", modes: modes, applied_payload: payload });
    }

    // --- MODE ENFORCEMENT ENGINE ---
    const channelModes = targetModesState.get(channelRaw);
    if (channelModes && channelModes.has('m')) {
      // Channel is +m (Moderated). Check if sender has +v (Voice), +o (Operator), or +a (Admin).
      if (!userModes.includes('v') && !userModes.includes('o') && !userModes.includes('a')) {
        console.log(`[IVC API] Blocked post to ${channelRaw} by ${ivcUser} due to +m mode.`);
        return res.status(403).json({
          error: "Moderated Channel",
          message: `Cannot post to ${channelRaw}. Channel is +m (Moderated) and you lack +v (Voice) or +o (Operator).`
        });
      }
    }
    // --------------------------------

    console.log(`[IVC API] Direct POST to channel: ${channelRaw} by ${ivcUser}`, payload);

    // Broadcast the post to all connected SSE clients
    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ 
      type: 'ivc_post', 
      channel: channelRaw, 
      payload: payload,
      sender: ivcUser
    })}\n\n`));

    res.json({ status: "posted", channel: channelRaw, received: payload });
  });

  // ==========================================
  // Vite Middleware for Frontend
  // ==========================================
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
