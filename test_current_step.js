const currentStep = 1;

const isStep2TransitionAllowed = () => true;
const selectedPartner = { step: 4, detailSpecialRequestPending: false, detailSpecialRequestStatus: "NONE" };
const isSalesManager = false;

let html = "";
if (Number(currentStep) >= 4) {
    html += "Shows Ký biên bản forms\n";
}
if (Number(currentStep) < 4) {
    html += "Shows Chuyển bước button\n";
}

console.log(html);
