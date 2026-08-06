const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const keys = ['Mã sản phẩm', 'Mã hàng', 'Số lượng thực tế', 'Tồn kho'];
console.log(keys.map(normalize));
