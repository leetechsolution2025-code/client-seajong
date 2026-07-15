const http = require('http');

const sessionCookie = "active_industry_code=sanitary; next-auth.session-token=123";

function fetchApi(path, callback) {
  const options = {
    hostname: 'localhost',
    port: 3348, // The actual app port might be 3000, wait, `pm2 list` showed app is on 3348!
    path: path,
    method: 'GET',
    headers: {
        'Cookie': sessionCookie
    }
  };

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      callback(data, res.statusCode);
    });
  });
  req.on('error', console.error);
  req.end();
}

fetchApi('/api/logistics/categories?warehouseId=cmq0s26fg0000goaespwzfn2w', (data, status) => {
    console.log("PRODUCT status:", status);
    console.log("PRODUCT data:", data);
});
