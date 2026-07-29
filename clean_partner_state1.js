const fs = require('fs');

const pageFile = 'src/app/(dashboard)/sales/partners/page.tsx';
let pageContent = fs.readFileSync(pageFile, 'utf-8');

const varsToRemove = [
  "const [khdContractNo, setKhdContractNo] = useState(\"\");",
  "const [khdContractValue, setKhdContractValue] = useState<number>(0);",
  "const [khdMonthlyContractValue, setKhdMonthlyContractValue] = useState<number>(0);",
  "const [khdSignDate, setKhdSignDate] = useState(\"\");",
  "const [khdContractStatus, setKhdContractStatus] = useState(\"Đã ký hợp đồng\");",
  "const [khdCreditLimit, setKhdCreditLimit] = useState<number>(0);",
  "const [khdContractPdf, setKhdContractPdf] = useState(\"\");",
  "const [uploadingPdf, setUploadingPdf] = useState(false);",
  "const [savingKyHopDong, setSavingKyHopDong] = useState(false);"
];

for (const v of varsToRemove) {
  pageContent = pageContent.replace(v + "\\n", "");
}

// Remove handleKhdPdfUpload function
pageContent = pageContent.replace(/const handleKhdPdfUpload = async \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?\} finally \{\s*setUploadingPdf\(false\);\s*\}\s*\};\s*/, "");

// Remove handleSaveKyHopDong function
pageContent = pageContent.replace(/const handleSaveKyHopDong = async \(\) => \{[\s\S]*?\} finally \{\s*setSavingKyHopDong\(false\);\s*\}\s*\};\s*/, "");

// Remove the assignments in handleOpenKyHopDongModal
const openModalFuncOld = `  const handleOpenKyHopDongModal = (partner: PartnerProcessItem) => {
    setSelectedPartner(partner);
    setKhdContractNo(partner.contractNo || "");
    const annualVal = typeof partner.hdAnnualRevenue === 'string' ? parseInt(partner.hdAnnualRevenue.replace(/\\D/g, '')) : (partner.contractValue || 0);
    setKhdContractValue(isNaN(annualVal) ? 0 : annualVal);
    
    const monthlyVal = typeof partner.hdMonthlyRevenue === 'string' ? parseInt(partner.hdMonthlyRevenue.replace(/\\D/g, '')) : 0;
    setKhdMonthlyContractValue(isNaN(monthlyVal) ? 0 : monthlyVal);
    
    setKhdSignDate(partner.signDate || "");
    setKhdContractStatus(partner.contractStatus || "Đã ký hợp đồng");
    setKhdCreditLimit(partner.creditLimit || 0);
    setKhdContractPdf(partner.contractPdf || "");
    setShowKyHopDongModal(true);
  };`;

const openModalFuncNew = `  const handleOpenKyHopDongModal = (partner: PartnerProcessItem) => {
    setSelectedPartner(partner);
    setShowKyHopDongModal(true);
  };`;

pageContent = pageContent.replace(openModalFuncOld, openModalFuncNew);

fs.writeFileSync(pageFile, pageContent);
console.log("Cleaned KyHopDong state");
