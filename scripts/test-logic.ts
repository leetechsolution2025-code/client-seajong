// Test logic for grouping
const items = [
  { type: "logistics-ticket", ticketType: "MATERIAL_ALLOCATION", trangThai: "COMPLETED" },
  { type: "logistics-ticket", ticketType: "BATCH_PACKING", trangThai: "PACKED" }
];

let hasMaterialCompleted = false;
let hasPackingCompleted = false;
let hasPackingPacked = false;
let allExported = true;
let totalTickets = items.length;
let completedCount = 0;

items.forEach(it => {
  const tStatus = (it.trangThai || '').toLowerCase();
  
  // Check if fully exported
  if (tStatus === 'completed' || tStatus === 'done' || tStatus === 'delivered') {
    completedCount++;
    if (it.ticketType === 'MATERIAL_ALLOCATION' || it.type === 'material-export') hasMaterialCompleted = true;
    if (it.ticketType === 'BATCH_PACKING') hasPackingCompleted = true;
  } else {
    allExported = false;
    if (tStatus === 'packed' && it.ticketType === 'BATCH_PACKING') {
      hasPackingPacked = true;
    }
  }
});

let groupStatusText = "Chưa xuất kho";
if (totalTickets > 0) {
  if (allExported) {
    groupStatusText = "Đã xuất kho";
  } else if (hasMaterialCompleted && hasPackingPacked) {
    groupStatusText = "Đã xuất VT & Gom đủ hàng";
  } else if (hasMaterialCompleted) {
    groupStatusText = "Đã xuất vật tư";
  } else if (hasPackingPacked) {
    groupStatusText = "Đã gom đủ hàng";
  } else if (completedCount > 0) {
    groupStatusText = "Đã xuất một phần";
  }
}
console.log(groupStatusText);
