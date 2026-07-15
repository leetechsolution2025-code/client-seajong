const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/logistics/categories?type=PRODUCT',
  method: 'GET',
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("PRODUCT categories:", data);
  });
});
req.on('error', console.error);
req.end();

const options2 = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/logistics/categories?type=MATERIAL',
  method: 'GET',
};
const req2 = http.request(options2, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("MATERIAL categories:", data);
  });
});
req2.on('error', console.error);
req2.end();
