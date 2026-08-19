import { IvcConfig, getIvcConfig } from './config';

/**
 * IVC WebRTC Connector
 * 
 * Connects directly to the IVC network's WebRTC signaling server.
 * Handles Server-Sent Events (SSE) for signaling, establishes RTCPeerConnections, 
 * and manages RTCDataChannels for real-time peer-to-peer event transmission.
 */

export class IvcWebRtcConnector {
  private config: IvcConfig;
  public clientId: string;
  
  private sse: EventSource | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  // Callbacks
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onPeerConnect?: (peerId: string) => void;
  public onPeerDisconnect?: (peerId: string) => void;
  public onMessage?: (from: string, message: any) => void;

  constructor(config?: Partial<IvcConfig>, clientId?: string) {
    this.config = getIvcConfig(config?.host, config?.channel, config?.secure);
    this.clientId = clientId || `notify-node-${Math.random().toString(36).substring(2, 9)}`;
  }

  private get baseUrl() {
    return `${this.config.secure ? 'https' : 'http'}://${this.config.host}`;
  }

  /**
   * Connect to the IVC Signaling Server via SSE
   */
  public connect() {
    console.log(`[IVC WebRTC] Connecting to room '#${this.config.channel}' at ${this.baseUrl} as ${this.clientId}`);
    
    const sseUrl = `${this.baseUrl}/api/signal.php?room=${this.config.channel}&client=${this.clientId}&mode=sse`;
    this.sse = new EventSource(sseUrl);

    this.sse.onopen = () => {
      console.log('[IVC WebRTC] SSE Signaling Connected.');
      if (this.onConnect) this.onConnect();
      this.sendSignal('join');
    };

    this.sse.onmessage = (event) => {
      try {
        const signal = JSON.parse(event.data);
        this.handleSignal(signal);
      } catch (e) {
        console.error('[IVC WebRTC] Failed to parse signaling message', e);
      }
    };

    this.sse.onerror = () => {
      console.error('[IVC WebRTC] SSE Signaling Error.');
      this.disconnect();
    };
  }

  /**
   * Disconnect and cleanup all peer connections
   */
  public disconnect() {
    this.sendSignal('leave');
    
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.dataChannels.clear();
    
    if (this.onDisconnect) this.onDisconnect();
    console.log('[IVC WebRTC] Disconnected.');
  }

  /**
   * Broadcast a message to all connected peers via DataChannels
   */
  public broadcast(message: any) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    this.dataChannels.forEach(channel => {
      if (channel.readyState === 'open') {
        channel.send(payload);
      }
    });
  }

  // ==========================================
  // WebRTC Signaling Logic
  // ==========================================

  private async handleSignal(signal: any) {
    const { from, type, sdp, candidate } = signal;
    
    // Ignore our own signals
    if (!from || from === this.clientId) return;

    let pc = this.peers.get(from);

    try {
      if (type === 'join' || type === 'peer-joined') {
        if (!pc) {
          pc = this.createPeerConnection(from);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.sendSignal('offer', { sdp: pc.localDescription });
        }
      } 
      else if (type === 'offer' && sdp) {
        if (!pc) {
          pc = this.createPeerConnection(from);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal('answer', { sdp: pc.localDescription });
      } 
      else if (type === 'answer' && sdp) {
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      } 
      else if (type === 'candidate' && candidate) {
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } 
      else if (type === 'leave') {
        if (pc) {
          pc.close();
          this.peers.delete(from);
          this.dataChannels.delete(from);
          if (this.onPeerDisconnect) this.onPeerDisconnect(from);
        }
      }
    } catch (err) {
      console.error(`[IVC WebRTC] Error handling signal '${type}' from ${from}:`, err);
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    console.log(`[IVC WebRTC] Creating PeerConnection for ${peerId}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('candidate', { candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        console.log(`[IVC WebRTC] Peer ${peerId} connected directly.`);
        if (this.onPeerConnect) this.onPeerConnect(peerId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log(`[IVC WebRTC] Peer ${peerId} disconnected.`);
        this.peers.delete(peerId);
        this.dataChannels.delete(peerId);
        if (this.onPeerDisconnect) this.onPeerDisconnect(peerId);
      }
    };

    const dataChannel = pc.createDataChannel('ivc-events');
    this.setupDataChannel(dataChannel, peerId);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string) {
    channel.onopen = () => {
      this.dataChannels.set(peerId, channel);
    };

    channel.onmessage = (event) => {
      if (this.onMessage) {
        try {
          const msg = JSON.parse(event.data);
          this.onMessage(peerId, msg);
        } catch {
          this.onMessage(peerId, event.data);
        }
      }
    };

    channel.onclose = () => {
      this.dataChannels.delete(peerId);
    };
  }

  private async sendSignal(type: string, payload: any = {}) {
    const body = {
      room: this.config.channel,
      client: this.clientId,
      type,
      ...payload
    };

    try {
      await fetch(`${this.baseUrl}/api/signal.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error(`[IVC WebRTC] Failed to send signal '${type}'`, e);
    }
  }
}
