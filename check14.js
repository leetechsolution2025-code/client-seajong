const http = require('http');

http.get('http://localhost:3000/api/logistics/categories?warehouseId=cmqwsvx68001oi4p05iug5n13', (res) => { // ID of Kho hàng hoá maybe? Let's just fetch without warehouseId
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});
