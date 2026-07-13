const http = require('http');
http.get('http://localhost:3000/api/production/orders/DHBL-20260713-01', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
