function parseIvcUri(uri) {
  const protocolMatch = uri.match(/^(?:web\+)?ivc:\/\/(.*)/i);
  if (!protocolMatch || !protocolMatch[1]) return null;

  let urlStr = protocolMatch[1];
  if (/^[#@§$]/.test(urlStr)) {
    urlStr = 'default.ivc.local/' + urlStr;
  }

  try {
    const url = new URL(`http://${urlStr}`);
    
    let host = url.host;
    if (host === 'default.ivc.local') host = '';

    let channel = '';
    let channelType = undefined;
    
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
       } else if (lastPath.startsWith('$oper')) {
         channelType = 'oper';
         channel = lastPath.substring(5); // strip $oper
         paths.pop();
       }
    }
    
    return { host, channel, channelType };
  } catch (e) {
    return { error: e.message };
  }
}

console.log(parseIvcUri("ivc://jakedot.net/$opersecret"));
console.log(parseIvcUri("ivc://$opersecret"));
