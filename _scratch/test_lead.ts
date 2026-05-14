async function testWebhook() {
  console.log("🚀 Đang giả lập Make.com gửi Lead về Dashboard...");
  
  const sampleLead = {
    fullName: "Nguyễn Văn Test (Giả lập)",
    email: "test@example.com",
    phone: "0987654321",
    campaignExternalId: "12345", // Mã chiến dịch giả
    externalId: "lead_test_" + Date.now(),
    source: "simulation_test",
    formValues: JSON.stringify({
      city: "Hà Nội",
      job: "Chủ doanh nghiệp",
      interest: "Máy lọc nước Seajong"
    })
  };

  try {
    const response = await fetch("http://localhost:3000/api/marketing/leads/webhook/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleLead)
    });

    const result = await response.json();
    if (result.success) {
      console.log("✅ THÀNH CÔNG! Đã gửi 1 lead giả lập về Dashboard.");
      console.log("👉 Bây giờ bạn hãy vào trang [Phân phối Lead] nhấn Làm mới nhé!");
    } else {
      console.error("❌ Thất bại:", result);
    }
  } catch (error: any) {
    console.error("❌ Lỗi kết nối:", error.message);
  }
}

testWebhook();
