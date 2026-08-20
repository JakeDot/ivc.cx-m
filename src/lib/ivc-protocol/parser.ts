export interface IvcUriDetails {
  host: string;
  networkId?: string;
  channel: string;
  channelType?: 'standard' | 'user' | 'metadata' | 'oper';
  modes?: string;
  dataMode?: boolean;
  action?: string;
  target?: string;
  subobject?: string;
  event?: string;
  property?: string;
  serverContext?: string;
  params: Record<string, string>;
  isSecure: boolean;
}

/**
 * Parses IVC protocol URIs
 * Supports formats: 
 * - ivc://[host|service/]#channel (standard)
 * - ivc://[host/]@user (user)
 * - ivc://[host/]§channel (metadata)
 * - ivc://[host/]$[channel] (operator channels)
 * - ivc://[host/][#|@|§|$]channel[+xyz-abc] (modes)
 */
export function parseIvcUri(uri: string): IvcUriDetails | null {
  // Strip the protocol prefix (supports native 'ivc://' and browser 'web+ivc://')
  const protocolMatch = uri.match(/^(?:web\+)?ivc:\/\/(.*)/i);
  
  if (!protocolMatch || !protocolMatch[1]) {
    return null;
  }

  let urlStr = protocolMatch[1];
  let networkId: string | undefined;
  
  try {
    // Handle £id schema which prefixes the host: £cluster$server
    // Use regex to safely extract just the networkId without decoding the entire urlStr
    const networkIdMatch = urlStr.match(/^(?:%C2%A3|£)([^/#@§]*)/);
    if (networkIdMatch) {
      networkId = decodeURIComponent(networkIdMatch[0]);
      urlStr = urlStr.substring(networkIdMatch[0].length);
    }

    // If it starts with #, @, §, or $, or starts with a / followed by them, it means host is omitted
    if (/^\/?[#@§$]/.test(urlStr) || !urlStr || urlStr === '/') {
      urlStr = 'default.ivc.local/' + urlStr.replace(/^\//, '');
    }

    const url = new URL(`http://${urlStr}`);
    
    let host = url.host;
    if (host === 'default.ivc.local') host = '';

    let channel = '';
    let channelType: 'standard' | 'user' | 'metadata' | 'oper' | undefined;
    let modes: string | undefined;
    let dataMode = false;
    let subobject: string | undefined;
    let event: string | undefined;
    let property: string | undefined;
    let serverContext: string | undefined;

    const pathname = decodeURIComponent(url.pathname);
    const paths = pathname.replace(/^\//, '').split('/').filter(Boolean);

    // Handle hash channels (ivc://host/#channel or ivc://host/#channel+xyz-abc)
    // NOTE: URL parsing treats anything after the first # as the hash.
    // So ivc://host/#channel/#line or ivc://host/#channel/£id gets lumped into url.hash
    // Or if the URL is ivc://host/@user/#line, url.hash is '#line' and channel is empty right now.
    if (url.hash) {
      // Decode hash to support £ (which URL encodes as %C2%A3) and split by /
      const decodedHash = decodeURIComponent(url.hash.substring(1));
      const hashParts = decodedHash.split('/');

      if (!channel && !paths.length && !decodedHash.startsWith('line')) {
         channel = hashParts[0];
         channelType = 'standard';
      }

      if (decodedHash.startsWith('line')) {
         subobject = '#' + hashParts[0];
      }

      // If there are subobjects appended after the channel in the hash string
      if (hashParts.length > 1) {
        for (let i = 1; i < hashParts.length; i++) {
          const part = hashParts[i];
          if (part.startsWith('#line') || part.startsWith('£id')) {
            subobject = part;
          } else if (part.startsWith('∆')) {
            // Handle property appended to event, e.g. ∆id§created
            if (part.includes('§')) {
              const split = part.split('§');
              event = split[0];
              property = '§' + split[1];
            } else {
              event = part;
            }
          } else if (part.startsWith('§')) {
            property = part;
          } else if (part.startsWith('$')) {
            serverContext = part;
          }
        }
      } else if (channel && hashParts.length === 1 && (hashParts[0].startsWith('#line') || hashParts[0].startsWith('£id'))) {
         // This block handles cases where channel was parsed from path, but hash exists (e.g. @user/#line)
         if (!subobject && (hashParts[0].startsWith('#line') || hashParts[0].startsWith('£id'))) {
           subobject = hashParts[0];
         }
      }
    }

    // Check if the last path segment is a channel definition (e.g. @user, §channel, $channel)
    if (!channel && paths.length > 0) {
       const lastPath = paths[paths.length - 1];
       if (lastPath.startsWith('@')) {
         channelType = 'user';
         channel = lastPath.substring(1);
         paths.pop(); // Remove it from paths so action/target parsing is clean
       } else if (lastPath.startsWith('§')) {
         channelType = 'metadata';
         channel = lastPath.substring(1);
         paths.pop();
       } else if (lastPath.startsWith('$')) {
         channelType = 'oper';
         channel = lastPath.substring(1); // strip '$' prefix
         paths.pop();
       }
    }

    // Extract subobjects and events from standard paths if they exist
    for (let i = paths.length - 1; i >= 0; i--) {
      const part = paths[i];
      if (part.startsWith('#line') || part.startsWith('£id')) {
        subobject = part;
        paths.splice(i, 1);
      } else if (part.startsWith('∆')) {
        if (part.includes('§')) {
          const split = part.split('§');
          event = split[0];
          property = '§' + split[1];
        } else {
          event = part;
        }
        paths.splice(i, 1);
      } else if (part.startsWith('§')) {
        property = part;
        paths.splice(i, 1);
      } else if (part.startsWith('$')) {
        serverContext = part;
        paths.splice(i, 1);
      }
    }
    
    // Sanitize modes from channel string (+xyz-abc)
    if (channel && channel.includes('+')) {
      const plusIdx = channel.indexOf('+');
      modes = channel.substring(plusIdx); // e.g. +xyz-abc
      
      const addedModes = modes.split('-')[0];
      if (addedModes.includes('d')) {
        dataMode = true;
      }
      
      // Strip modes from the actual channel name
      channel = channel.substring(0, plusIdx);
    }
    
    // Fallback if no channel found from above, maintain backwards compatibility
    if (!channel) {
       channel = 'ivc';
       channelType = 'standard';
    }
    
    // Extract optional Action/Target logic (e.g. for notifications)
    const action = paths.length > 0 ? paths[0].toLowerCase() : undefined;
    const target = paths.length > 1 ? paths.slice(1).join('/') : undefined;
    
    // Extract Query Params
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return { 
      host, 
      networkId,
      channel,
      channelType,
      modes,
      dataMode,
      action, 
      target,
      subobject,
      event,
      property,
      serverContext,
      params, 
      isSecure: true // Default to WSS/HTTPS
    };
  } catch (err) {
    console.error('[IVC Protocol] Failed to parse URI:', uri, err);
    return null;
  }
}

/**
 * Registers the browser protocol handler.
 * Note: Browsers strictly require the 'web+' prefix for custom protocols.
 */
export function registerProtocolHandler() {
  if ('registerProtocolHandler' in navigator) {
    try {
      const targetUrl = `${window.location.origin}/?uri=%s`;
      navigator.registerProtocolHandler('web+ivc', targetUrl);
      console.log('[IVC Protocol] Handler registered for web+ivc://');
      return true;
    } catch (err) {
      console.error('[IVC Protocol] Registration failed:', err);
      return false;
    }
  } else {
    console.warn('[IVC Protocol] registerProtocolHandler not supported in this browser.');
    return false;
  }
}
