import nacl from 'tweetnacl';

// Helper to convert Uint8Array to base64 in the browser
function toBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(arr)));
}

// Helper to convert base64 to Uint8Array in the browser
function fromBase64(str: string): Uint8Array {
  const binString = atob(str);
  return new Uint8Array(Array.from(binString).map((char) => char.charCodeAt(0)));
}

export class IVCIdentity {
  public publicKey: Uint8Array;
  public privateKey: Uint8Array;
  public username: string;

  constructor() {
    this.username = localStorage.getItem('ivc_username') || 'guest_' + Math.floor(Math.random() * 10000);
    
    const storedPriv = localStorage.getItem('ivc_priv_key');
    const storedPub = localStorage.getItem('ivc_pub_key');

    if (storedPriv && storedPub) {
      this.privateKey = fromBase64(storedPriv);
      this.publicKey = fromBase64(storedPub);
    } else {
      // Generate new Ed25519 Keypair
      const keyPair = nacl.sign.keyPair();
      this.privateKey = keyPair.secretKey;
      this.publicKey = keyPair.publicKey;
      
      localStorage.setItem('ivc_priv_key', toBase64(this.privateKey));
      localStorage.setItem('ivc_pub_key', toBase64(this.publicKey));
      localStorage.setItem('ivc_username', this.username);
    }
  }

  public setUsername(name: string) {
    this.username = name.replace('@', '');
    localStorage.setItem('ivc_username', this.username);
  }

  public getPublicKeyBase64(): string {
    return toBase64(this.publicKey);
  }

  public signRequest(method: string, path: string, body?: any): { signature: string, timestamp: string } {
    const timestamp = Date.now().toString();
    const bodyStr = body && Object.keys(body).length > 0 ? JSON.stringify(body) : '';
    const message = `${timestamp}:${method}:${path}:${bodyStr}`;
    
    const msgUint8 = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(msgUint8, this.privateKey);
    
    return {
      signature: toBase64(signature),
      timestamp: timestamp
    };
  }

  public getAuthHeaders(method: string, path: string, body?: any): HeadersInit {
    const { signature, timestamp } = this.signRequest(method, path, body);
    return {
      'X-IVC-User': `@${this.username}`, // The server will append the real modes securely
      'X-IVC-PubKey': this.getPublicKeyBase64(),
      'X-IVC-Signature': signature,
      'X-IVC-Timestamp': timestamp
    };
  }
}

export const ivcIdentity = new IVCIdentity();
