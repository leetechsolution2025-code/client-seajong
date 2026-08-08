fetch("http://localhost:3000/api/finance/debts-v2?type=RECEIVABLE")
  .then(r => r.json())
  .then(data => {
    console.log(data.debts.map(d => ({ id: d.id, ref: d.referenceId })));
  })
  .catch(console.error);
