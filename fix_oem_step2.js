const fs = require('fs');

let code = fs.readFileSync('src/components/sales/plan/OemPlanTab.tsx', 'utf8');

const startStr = '{currentStep === 2 && (';
const startIndex = code.indexOf(startStr);
if (startIndex !== -1) {
  let openBraces = 0;
  let i = startIndex + startStr.length;
  // wait, it starts with {currentStep === 2 && (
  // So there's one open brace '{' and one open paren '('
  // I need to find the matching ')}'
  
  // Let's just find the next `{currentStep === 3 && (`
  const nextStepStr = '{currentStep === 3 && (';
  const nextStepIndex = code.indexOf(nextStepStr);
  
  if (nextStepIndex !== -1) {
    const originalBlock = code.substring(startIndex, nextStepIndex);
    
    // Replace with a placeholder
    const newBlock = `{currentStep === 2 && (
            <div className="d-flex align-items-center justify-content-center flex-column" style={{ minHeight: "450px", gap: "16px" }}>
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 80, height: 80, backgroundColor: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
                <i className="bi bi-tools" style={{ fontSize: 36 }}></i>
              </div>
              <h5 className="text-muted fw-bold">Nội dung đang được thiết kế lại</h5>
              <p className="text-secondary text-center" style={{ maxWidth: 400 }}>
                Kế hoạch tháng của OEM đang trong quá trình thiết kế chi tiết lại theo cấu trúc chuẩn mới. Vui lòng quay lại sau.
              </p>
            </div>
          )}

          {/* STEP 3: DỮ LIỆU */}
          `;
          
    code = code.substring(0, startIndex) + newBlock + code.substring(nextStepIndex);
    fs.writeFileSync('src/components/sales/plan/OemPlanTab.tsx', code);
    console.log("Successfully replaced step 2");
  } else {
    console.log("Could not find step 3");
  }
} else {
  console.log("Could not find step 2");
}
