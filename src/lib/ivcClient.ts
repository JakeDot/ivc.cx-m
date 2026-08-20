export type IvcMessage = {
  type: string;
  sender?: string;
  command?: string;
  payload?: any;
  channel?: string;
  modes?: string;
  target?: string;
  action?: 'add' | 'remove' | string;
};

type Listener = (msg: IvcMessage) => void;

export class IvcNetworkClient {
  private sse: EventSource | null = null;
  public isConnected: boolean = false;
  
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  
  private listeners: Set<Listener> = new Set();

  public addListener(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Backwards compatibility for single listener assignments
  set onMessage(listener: Listener | undefined) {
    if (listener) {
      this.listeners.add(listener);
    }
  }

  connect() {
    if (this.sse) return; // Prevent multiple connections
    
    console.log(`[IVC Client] Connecting to local SSE bridge...`);
    this.sse = new EventSource('/api/ivc/stream');
    
    this.sse.onopen = () => {
      console.log(`[IVC Client] SSE Connected.`);
      this.isConnected = true;
      if (this.onConnect) this.onConnect();
    };

    this.sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach(listener => listener(data));
      } catch (err) {
        console.error('[IVC Client] Failed to parse message', err);
      }
    };

    this.sse.onerror = () => {
      console.log(`[IVC Client] SSE Error / Disconnected.`);
      this.isConnected = false;
      if (this.onDisconnect) this.onDisconnect();
    };
  }

  disconnect() {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    this.isConnected = false;
    if (this.onDisconnect) this.onDisconnect();
  }

  send(message: IvcMessage) {
    console.log(`[IVC Client] Outbound message (Not sent to network yet):`, message);
  }
}

export const ivcClient = new IvcNetworkClient();
