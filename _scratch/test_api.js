async function testAPI() {
  try {
    const res = await fetch("http://localhost:3000/api/marketing/dashboard");
    const data = await res.json();
    console.log("API Response Length:", data.campaigns ? data.campaigns.length : "No campaigns field");
    if (data.campaigns && data.campaigns.length > 0) {
      console.log("First Campaign:", JSON.stringify(data.campaigns[0], null, 2));
    } else {
      console.log("Full response:", data);
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }
}
testAPI();
