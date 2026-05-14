const generateDates = (days) => {
  const dates = [];
  const today = new Date("2026-05-10T00:00:00Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}
console.log(generateDates(7));
