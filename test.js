const row = { "Mã thay thế": "nsp-voi-01", " MÃ NHÓM PM ": "nsp-elzn" };
const COL_MATHAYTHES = ["mã thay thế"];
const COL_CATS = ["danh mục", "mã nhóm pm", "mã nhóm"];

function getVal(row, keys) {
  for (const key of Object.keys(row)) {
    if (keys.includes(key.toLowerCase().trim())) {
      return row[key];
    }
  }
  return undefined;
}
console.log("maThayThe:", getVal(row, COL_MATHAYTHES));
console.log("category:", getVal(row, COL_CATS));
