function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function getVal(row, keys) {
  for (const key of Object.keys(row)) {
    const normalizedKey = removeAccents(key.toLowerCase()).replace(/[^a-z0-9]/g, '');
    const normalizedKeys = keys.map(k => removeAccents(k.toLowerCase()).replace(/[^a-z0-9]/g, ''));
    if (normalizedKeys.includes(normalizedKey) || normalizedKeys.some(nk => normalizedKey.includes(nk))) {
      return row[key];
    }
  }
  return undefined;
}

const COL_MATHAYTHES= ["mã thay thế"];

// Precomposed (NFC)
console.log("NFC:", getVal({"Mã thay thế": "123"}, COL_MATHAYTHES));

// Decomposed (NFD) - typed on macOS often
const nfdKey = "Ma\u0303 thay the\u0301";
console.log("NFD:", getVal({[nfdKey]: "456"}, COL_MATHAYTHES));
