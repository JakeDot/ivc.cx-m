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
    
    if (channel && channel.endsWith('+d')) {
      dataMode = true;
      channel = channel.slice(0, -2);
    }
    
    if (!channel) {
       channel = 'ivc';
       channelType = 'standard';
    }
    
    const action = paths.length > 0 ? paths[0].toLowerCase() : undefined;
    const target = paths.length > 1 ? paths.slice(1).join('/') : undefined;
    
    const params = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return { host, channel, channelType, dataMode, action, target, params };
  } catch (e) {
    return { error: e.message };
  }
}

console.log(parseIvcUri("ivc://jakedot.net/#channel"));
console.log(parseIvcUri("ivc://jakedot.net/@user"));
console.log(parseIvcUri("ivc://jakedot.net/§channel"));
console.log(parseIvcUri("ivc://jakedot.net/#channel+d"));
console.log(parseIvcUri("ivc://@user"));
console.log(parseIvcUri("ivc://#channel"));
console.log(parseIvcUri("ivc://§channel"));
console.log(parseIvcUri("ivc://jakedot.net/notify/user@pm.me?subject=Hi"));
console.log(parseIvcUri("ivc://jakedot.net/notify/@user?subject=Hi"));
console.log(parseIvcUri("ivc://jakedot.net/notify/§channel?subject=Hi"));
