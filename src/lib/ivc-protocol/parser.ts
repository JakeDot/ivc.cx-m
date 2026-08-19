export interface IvcUriDetails {
  host: string;
  channel: string;
  channelType?: 'standard' | 'user' | 'metadata' | 'oper';
  modes?: string;
  dataMode?: boolean;
  action?: string;
  target?: string;
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
  
  // If it starts with #, @, §, or $, it means host is omitted
  if (/^[#@§$]/.test(urlStr)) {
    urlStr = 'default.ivc.local/' + urlStr;
  }
  
  try {
    const url = new URL(`http://${urlStr}`);
    
    let host = url.host;
    if (host === 'default.ivc.local') host = '';

    let channel = '';
    let channelType: 'standard' | 'user' | 'metadata' | 'oper' | undefined;
    let modes: string | undefined;
    let dataMode = false;

    // Handle hash channels (ivc://host/#channel or ivc://host/#channel+xyz-abc)
    if (url.hash) {
      channel = url.hash.substring(1);
      channelType = 'standard';
    }

    const pathname = decodeURIComponent(url.pathname);
    const paths = pathname.replace(/^\//, '').split('/').filter(Boolean);
    
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
      channel,
      channelType,
      modes,
      dataMode,
      action, 
      target, 
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
