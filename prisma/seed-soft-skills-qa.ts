import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const qaData = [
  { order: 1, question: "Sen cây Seajong làm từ những chất liệu gì?", answer: "Thân sen bằng đồng 61A, bên ngoài mạ crom chống oxy hóa; núm sen inox; bát sen & tay sen nhựa kỹ thuật cao cấp; dây sen inox 304 chống gỉ, chịu xoắn." },
  { order: 2, question: "Đồng 61A là gì, có gì hơn sen thường?", answer: "Đồng 61A có tỷ lệ đồng cao, chịu áp tốt, không giòn, ít biến dạng khi dùng lâu, đặc biệt ổn định với nước nóng - lạnh luân phiên." },
  { order: 3, question: "Vì sao thân sen phải dùng đồng, không dùng hợp kim nhẹ?", answer: "Thân sen là bộ phận chịu áp lực nước liên tục. Đồng 61A giữ form tốt, hạn chế rơ, rỉ nước sau nhiều năm sử dụng." },
  { order: 4, question: "Lớp mạ crom trên sen có tác dụng gì?", answer: "Mạ crom giúp chống ăn mòn, hạn chế bám cặn, giữ bề mặt sáng, dễ vệ sinh trong môi trường phòng tắm ẩm." },
  { order: 5, question: "Sen mạ crom có nhanh xỉn màu không?", answer: "Không nếu vệ sinh đúng cách. Lau khô sau khi dùng, tránh hóa chất mạnh thì crom giữ màu rất lâu." },
  { order: 6, question: "Núm sen inox khác gì núm sen nhựa?", answer: "Núm inox chịu nhiệt tốt, không giãn nở, thao tác mượt, không kẹt cứng sau thời gian dài dùng nước nóng." },
  { order: 7, question: "Bát sen và tay sen bằng nhựa có bền không?", answer: "Là nhựa ABS chịu nhiệt - chịu áp lực nước tốt, không giòn, không nứt, dùng ổn định trong môi trường nước nóng." },
  { order: 8, question: "Vì sao Seajong không làm bát sen kim loại?", answer: "Nhựa giúp nhẹ, không gây nóng tay, giảm tải cho thân sen và khớp nối, tăng độ bền tổng thể." },
  { order: 9, question: "Sen cây Seajong có thiết kế tăng áp không?", answer: "Có. Bát sen tối ưu lỗ phun giúp tăng tốc dòng nước, phù hợp nhà áp lực nước yếu." },
  { order: 10, question: "Nhà nước yếu dùng sen này có ổn không?", answer: "Rất ổn. Thiết kế tăng áp giúp tắm vẫn mạnh, không bị rơi tia hay hụt nước." },
  { order: 11, question: "Sen cây có tốn nước không?", answer: "Không. Nước được phân bố đều, cảm giác mạnh nhưng lưu lượng được kiểm soát tốt." },
  { order: 12, question: "Dây sen inox 304 khác gì dây sen thường?", answer: "Inox 304 không gỉ, chịu xoắn, không bong lớp ngoài, hạn chế rò nước tại đầu nối." },
  { order: 13, question: "Dây sen có dễ gãy gập không?", answer: "Không. Dây inox 304 có độ đàn hồi tốt, chịu uốn cong khi dùng hàng ngày." },
  { order: 14, question: "Sen cây Seajong dùng cho bình nóng lạnh được không?", answer: "Dùng tốt cho bình nóng lạnh gia đình và hệ nước nóng trung tâm." },
  { order: 15, question: "Dùng nước nóng nhiều có làm sen nhanh hỏng không?", answer: "Không. Đồng 61A, inox và nhựa kỹ thuật đều chịu nhiệt tốt, ổn định lâu dài." },
  { order: 16, question: "Sen cây có bị nóng tay khi dùng nước nóng không?", answer: "Không đáng kể, đặc biệt ở bát sen và tay sen nhựa không dẫn nhiệt." },
  { order: 17, question: "Sen cây có dễ lắp đặt không?", answer: "Dễ. Lắp nổi, không cần đục tường, chỉ cần đúng khoảng cách nóng lạnh tiêu chuẩn." },
  { order: 18, question: "Khoảng cách nóng lạnh bao nhiêu là chuẩn?", answer: "150mm ± 10mm, phù hợp hầu hết công trình nhà ở tại Việt Nam." },
  { order: 19, question: "Sen cây Seajong có phù hợp phòng tắm nhỏ không?", answer: "Phù hợp. Thiết kế gọn, không chiếm nhiều diện tích, dễ bố trí." },
  { order: 20, question: "Sen cây dùng lâu có bị lỏng tay gạt không?", answer: "Rất hiếm. Thân đồng 61A và núm inox giúp độ bền cơ học cao." },
  { order: 21, question: "Sen cây có gây ồn khi sử dụng không?", answer: "Không. Dòng nước ổn định, không rung hay phát tiếng ồn lớn." },
  { order: 22, question: "Sen cây Seajong có an toàn cho trẻ nhỏ không?", answer: "Có. Tay gạt nhẹ, không nóng tay, dễ kiểm soát nhiệt độ." },
  { order: 23, question: "Người lớn tuổi dùng có tiện không?", answer: "Rất tiện. Điều chỉnh đơn giản, không cần thao tác phức tạp." },
  { order: 24, question: "Sen cây dùng bao lâu thì nên thay?", answer: "Trung bình 7-10 năm, có thể lâu hơn nếu bảo dưỡng đúng cách." },
  { order: 25, question: "Khi hỏng có phải thay cả bộ không?", answer: "Không. Có thể thay linh kiện riêng lẻ, tiết kiệm chi phí." },
  { order: 26, question: "Sen cây Seajong có bảo hành không?", answer: "Có, bảo hành theo chính sách hãng cho thân sen và linh kiện chính." },
  { order: 27, question: "Vì sao giá cao hơn sen trôi nổi?", answer: "Do vật liệu tốt, bền bỉ, an toàn cho sức khỏe, khách hàng có thể sử dụng lâu dài." },
  { order: 28, question: "Sen cây này hợp phong cách phòng tắm nào?", answer: "Hiện đại, tối giản, nhà phố, chung cư." },
  { order: 29, question: "Có nên mua sen cây theo combo không?", answer: "Nên. Đồng bộ thiết kế, dễ bảo hành, tối ưu chi phí." },
  { order: 30, question: "Sen cây Seajong khác điểm nào so với hàng phổ thông?", answer: "Khác ở độ bền, ổn định, tăng áp tốt và cảm giác sử dụng lâu dài." },
  { order: 31, question: "Sen cây có cần bảo dưỡng định kỳ không?", answer: "Chỉ cần vệ sinh đầu phun và lau bề mặt định kỳ, không cần bảo dưỡng phức tạp." },
  { order: 32, question: "Sen cây có phù hợp dùng lâu dài cho gia đình không?", answer: "Rất phù hợp vì thiết kế hướng tới sử dụng bền - ít sửa - ổn định." },
  { order: 33, question: "Điểm mạnh cốt lõi của sen cây Seajong là gì?", answer: "Cấu hình vật liệu hợp lý - tăng áp tốt - dùng lâu không mệt - ít lỗi phát sinh." },
  { order: 34, question: "Sen cây Seajong bảo hành bao lâu?", answer: "Sen cây Seajong được bảo hành chính hãng dài hạn lên tới 5 năm cho các bộ phận quan trọng như thân sen và linh kiện kỹ thuật. Thời gian bảo hành thể hiện cam kết về độ bền vật liệu và chất lượng sử dụng lâu dài." },
  { order: 35, question: "Bảo hành áp dụng cho những phần nào?", answer: "Bảo hành tập trung vào thân sen đồng 61A, củ sen, van điều tiết và các linh kiện kỹ thuật. Những bộ phận hao mòn tự nhiên sẽ được tư vấn thay thế phù hợp." },
  { order: 36, question: "Trong thời gian bảo hành nếu có lỗi thì xử lý thế nào?", answer: "Khách được tiếp nhận bảo hành nhanh, kiểm tra nguyên nhân rõ ràng. Nếu lỗi do kỹ thuật sản xuất, Seajong sửa chữa hoặc thay thế linh kiện đúng tiêu chuẩn, không để khách phải tự xoay sở." },
  { order: 37, question: "Linh kiện sen cây Seajong có sẵn để thay không?", answer: "Có. Seajong chủ động linh kiện thay thế, giúp sửa nhanh - không phải thay cả bộ, tiết kiệm chi phí cho khách." },
  { order: 38, question: "Khi mua sen cây có được kiểm tra hàng không?", answer: "Được kiểm tra đầy đủ trước khi nhận hàng: hình thức, phụ kiện, linh kiện đi kèm. Điều này giúp khách yên tâm tuyệt đối khi mua." },
  { order: 39, question: "Có được mở hộp kiểm tra trước khi thanh toán không?", answer: "Có. Khách được mở hộp, kiểm tra sản phẩm có trầy xước hay thiếu phụ kiện đi kèm hay không." },
  { order: 40, question: "Nếu phát hiện lỗi ngay khi nhận hàng thì xử lý thế nào?", answer: "Seajong đổi mới hoặc xử lý ngay, không để khách phải sử dụng sản phẩm lỗi." },
  { order: 41, question: "Sen cây Seajong có hỗ trợ lắp đặt không?", answer: "Có. Seajong hỗ trợ tư vấn lắp đặt chi tiết và kết nối thợ khi khách có nhu cầu." },
  { order: 42, question: "Nếu khách tự thuê thợ ngoài lắp có ảnh hưởng bảo hành không?", answer: "Không, miễn là lắp đúng kỹ thuật theo hướng dẫn, bảo hành vẫn được áp dụng bình thường." },
  { order: 43, question: "Lắp sai có dễ sửa lại không?", answer: "Dễ. Sen cây truyền thống có cấu trúc đơn giản, dễ tháo lắp, không ảnh hưởng thẩm mỹ." },
  { order: 44, question: "Sen cây có kèm đầy đủ phụ kiện lắp đặt không?", answer: "Có. Bộ sen Seajong đầy đủ phụ kiện tiêu chuẩn, không phát sinh chi phí ngoài." }
];

async function main() {
  console.log('Clearing existing SoftSkillQA data...');
  await prisma.softSkillQA.deleteMany();
  
  console.log('Seeding SoftSkillQA data...');
  for (const item of qaData) {
    await prisma.softSkillQA.create({
      data: item
    });
  }
  
  console.log(`Successfully seeded ${qaData.length} items!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
