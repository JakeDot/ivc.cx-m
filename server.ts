import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    
    res.setHeader('Location', `${userRemote}#${host}${channels}`);
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
    const { ivc_host } = req.body; // e.g. "https://chat.yourdomain.com"
    const myEndpoint = process.env.APP_URL ? `${process.env.APP_URL}/api/ivc/execute` : `http://localhost:${PORT}/api/ivc/execute`;
    
    try {
      const response = await fetch(`${ivc_host}/api/services.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  // Server Admin Stats API (GET /+)
  // ==========================================
  const globalServerModes = new Set<string>();

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
    
    console.log(`[IVC API] Mode Update: ${action === 'add' ? '+' : '-'}${modes} on ${target} by ${ivcUser}`);

    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ 
      type: 'ivc_mode_update', 
      action: action,
      modes: modes, 
      target: target,
      sender: ivcUser
    })}\n\n`));

    res.json({ 
      status: "modes_updated", 
      target: target, 
      modes: `${action === 'add' ? '+' : '-'}${modes}`,
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
    
    const payload = req.body;

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

    console.log(`[IVC API] Direct POST to channel: ${channelRaw}`, payload);

    // Broadcast the post to all connected SSE clients
    sseClients.forEach(c => c.write(`data: ${JSON.stringify({ 
      type: 'ivc_post', 
      channel: channelRaw, 
      payload: payload 
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
