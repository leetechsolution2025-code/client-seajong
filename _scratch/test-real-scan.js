async function testScan() {
  const requestId = "cmokap4m70003i4nrkack50m7";
  console.log("Testing real scan for request:", requestId);
  
  const res = await fetch("http://localhost:3000/api/hr/recruitment/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId })
  });
  
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

testScan().catch(console.error);
