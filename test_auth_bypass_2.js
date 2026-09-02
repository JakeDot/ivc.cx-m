const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/foo',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-IVC-User': '@spoofed+oa' // Trying to spoof
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.write(JSON.stringify({ msg: 'hello' }));
req.end();
