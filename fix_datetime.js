const fs = require('fs');

const offcanvasFile = 'src/app/(dashboard)/finance/debts/DebtPaymentOffcanvas.tsx';
let offcanvasContent = fs.readFileSync(offcanvasFile, 'utf8');

// 1. Change initialization: setPayDate(new Date().toISOString().split("T")[0]);
// to local datetime string format YYYY-MM-DDTHH:mm
offcanvasContent = offcanvasContent.replace(
    'setPayDate(new Date().toISOString().split("T")[0]);',
    'const now = new Date();\n      const tzoffset = now.getTimezoneOffset() * 60000;\n      const localISOTime = new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);\n      setPayDate(localISOTime);'
);

// 2. Change input type="date" to type="datetime-local"
offcanvasContent = offcanvasContent.replace(
    'type="date"',
    'type="datetime-local"'
);

fs.writeFileSync(offcanvasFile, offcanvasContent, 'utf8');


const modalFile = 'src/app/(dashboard)/finance/debts/DebtReconciliationModal.tsx';
let modalContent = fs.readFileSync(modalFile, 'utf8');

// 3. Fix date parsing in DebtReconciliationModal
const oldDateLogic = `        // Giả sử p.date là YYYY-MM-DD, chuyển về cuối ngày để thanh toán thường sau lúc tạo đơn
        const pDate = new Date(p.date);
        if (pDate.getHours() === 0) {
           pDate.setHours(23, 59, 59);
        }`;

const newDateLogic = `        let pDate;
        if (p.date && p.date.length === 10) {
           const [y, m, d] = p.date.split("-");
           pDate = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59);
        } else {
           pDate = new Date(p.date);
        }`;

modalContent = modalContent.replace(oldDateLogic, newDateLogic);

fs.writeFileSync(modalFile, modalContent, 'utf8');
console.log("Done");
