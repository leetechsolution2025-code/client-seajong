const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/plan-finance/sales/cmrc8t9r4010pgrn5uwov1n7l',
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', error => console.error(error));
req.end();
