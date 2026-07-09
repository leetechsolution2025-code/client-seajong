const req = await fetch('http://localhost:3000/api/marketing/leads/webhook/facebook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: "Test",
    campaignExternalId: "test_camp_id",
    campaignName: "Test Campaign"
  })
});
const res = await req.json();
console.log(res);
