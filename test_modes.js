function parseIvcUri(uri) {
  const protocolMatch = uri.match(/^(?:web\+)?ivc:\/\/(.*)/i);
  if (!protocolMatch || !protocolMatch[1]) return null;

  let urlStr = protocolMatch[1];
  if (/^[#@§]/.test(urlStr)) {
    urlStr = 'default.ivc.local/' + urlStr;
  }

  try {
    const url = new URL(`http://${urlStr}`);
    
    let host = url.host;
    if (host === 'default.ivc.local') host = '';

    let channel = '';
    let channelType = undefined;
    let dataMode = false;
    let modes = undefined;

    if (url.hash) {
      channel = url.hash.substring(1);
      channelType = 'standard';
    }

    const pathname = decodeURIComponent(url.pathname);
    const paths = pathname.replace(/^\//, '').split('/').filter(Boolean);
    
    if (!channel && paths.length > 0) {
       const lastPath = paths[paths.length - 1];
       if (lastPath.startsWith('@')) {
         channelType = 'user';
         channel = lastPath.substring(1);
         paths.pop();
       } else if (lastPath.startsWith('§')) {
         channelType = 'metadata';
         channel = lastPath.substring(1);
         paths.pop();
       }
    }
    
    // Handle modes e.g. +xyz-abc
    if (channel && channel.includes('+')) {
      const plusIdx = channel.indexOf('+');
      modes = channel.substring(plusIdx);
      
      const addedModes = modes.split('-')[0];
      if (addedModes.includes('d')) {
        dataMode = true;
      }
      
      channel = channel.substring(0, plusIdx);
    }
    
    if (!channel) {
       channel = 'ivc';
       channelType = 'standard';
    }
    
    const action = paths.length > 0 ? paths[0].toLowerCase() : undefined;
    const target = paths.length > 1 ? paths.slice(1).join('/') : undefined;
    
    return { host, channel, channelType, modes, dataMode, action, target };
  } catch (e) {
    return { error: e.message };
  }
}

console.log(parseIvcUri("ivc://jakedot.net/#channel+xyz-abc"));
console.log(parseIvcUri("ivc://jakedot.net/#channel+d-v"));
console.log(parseIvcUri("ivc://jakedot.net/#channel+abc-d"));
console.log(parseIvcUri("ivc://jakedot.net/§metadata+xyz"));
