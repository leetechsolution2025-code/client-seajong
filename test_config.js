fetch("http://localhost:3000/api/hr/insurance/config", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    employerBhxh: 17.5,
    employerBhyt: 3,
    employerBhtn: 1,
    employeeBhxh: 8,
    employeeBhyt: 1.5,
    employeeBhtn: 1,
    baseReferenceWage: 2340000,
    sickLeaveDays: 30, sickLeaveHeavyDays: 40, sickLeaveRate: 75,
    maternityDays: 180, paternityDays: 5, maternityRate: 100, maternityAllowance: 2,
    recoveryDays: 5, recoveryRate: 30,
    funeralAllowance: 10
  })
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Text:", await r.text());
});
