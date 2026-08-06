const keys = ['Mã vật tư', 'Tên vật tư', 'Đơn vị tính', 'Tổng số lượng', 'Các định mức sử dụng'];
const skuKey = keys.find(k => k.toLowerCase().includes("mã") || k.toLowerCase().includes("sku"));
const qtyKey = keys.find(k => k.toLowerCase().includes("thực tế") || k.toLowerCase().includes("số lượng"));
console.log({skuKey, qtyKey});
