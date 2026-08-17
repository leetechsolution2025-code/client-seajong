export const formatDisplayDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${month}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
};

export const formatDisplayDateTime = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${hh}:${mm} ${dd}/${month}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
};

export const getSafeTimestamp = (dateStr?: string): number => {
  if (!dateStr) return 0;
  try {
    if (dateStr.endsWith("Z") || dateStr.includes("+") || (dateStr.includes("-") && dateStr.split("-").length > 3)) {
      return new Date(dateStr).getTime();
    }
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
    }
    return new Date(dateStr).getTime();
  } catch (e) {
    return 0;
  }
};
