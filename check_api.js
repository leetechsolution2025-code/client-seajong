const http = require('http');
http.get('http://localhost:3348/api/logistics/inventory?search=Thân%20sen%2010&limit=20&includeManufactured=true', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});
