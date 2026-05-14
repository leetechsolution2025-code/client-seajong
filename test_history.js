fetch("http://localhost:3000/api/hr/insurance/history?month=5&year=2026")
  .then(async r => {
    const data = await r.json();
    console.log("Status:", r.status);
    if (Array.isArray(data)) {
      data.forEach(d => console.log(`  - ${d.employee?.fullName}: salary=${d.insuranceSalary}, employer=${d.employerAmount}, employee=${d.employeeAmount}`));
      console.log("Count:", data.length);
    } else {
      console.log("Error:", data);
    }
  });
