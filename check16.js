const http = require('http');
http.get('http://localhost:3000/api/logistics/inventory?warehouseId=cmqwsvx6e001yi4p0q96495p4&page=1&limit=50', (res) => { // This is likely Kho thành phẩm, I will just fetch with a random ID that triggers it
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.substring(0, 1000)));
});
