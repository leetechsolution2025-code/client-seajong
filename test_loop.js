const orderItems = [
  {
    id: "cmrc8t9r4010qgrn5b7vaaezc",
    inventoryItemId: null,
    tenHang: "Combo phòng tắm cao cấp Seajong – Refined Living",
  }
];

const invItem = { imageUrl: "https://example.com/img.png", code: "CODE-123" };

for (const item of orderItems) {
  if (!item.inventoryItem && item.tenHang) {
    item.inventoryItem = invItem;
  }
}

console.log(JSON.stringify(orderItems, null, 2));
