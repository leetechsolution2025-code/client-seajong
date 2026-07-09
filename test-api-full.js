const { GET } = require('./.next/server/app/api/board/finance-accounting/route.js');
async function test() {
  try {
    const res = await GET(new Request("http://localhost/api/board/finance-accounting"));
    const data = await res.json();
    console.log(Object.keys(data));
    console.log("Valuations:", data.inventoryValuations);
    console.log("Alerts:", data.inventoryAlerts?.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
