import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const accounts = [
  // LOẠI 1 - TÀI SẢN NGẮN HẠN
  { code: "111", name: "Tiền mặt", level: 1, type: "ASSET", children: [
    { code: "1111", name: "Tiền Việt Nam", level: 2, type: "ASSET" },
    { code: "1112", name: "Ngoại tệ", level: 2, type: "ASSET" },
    { code: "1113", name: "Vàng tiền tệ", level: 2, type: "ASSET" }
  ]},
  { code: "112", name: "Tiền gửi Ngân hàng", level: 1, type: "ASSET", children: [
    { code: "1121", name: "Tiền Việt Nam", level: 2, type: "ASSET" },
    { code: "1122", name: "Ngoại tệ", level: 2, type: "ASSET" },
    { code: "1123", name: "Vàng tiền tệ", level: 2, type: "ASSET" }
  ]},
  { code: "113", name: "Tiền đang chuyển", level: 1, type: "ASSET", children: [
    { code: "1131", name: "Tiền Việt Nam", level: 2, type: "ASSET" },
    { code: "1132", name: "Ngoại tệ", level: 2, type: "ASSET" }
  ]},
  { code: "121", name: "Chứng khoán kinh doanh", level: 1, type: "ASSET", children: [
    { code: "1211", name: "Cổ phiếu", level: 2, type: "ASSET" },
    { code: "1212", name: "Trái phiếu", level: 2, type: "ASSET" },
    { code: "1218", name: "Chứng khoán và công cụ tài chính khác", level: 2, type: "ASSET" }
  ]},
  { code: "128", name: "Đầu tư nắm giữ đến ngày đáo hạn", level: 1, type: "ASSET", children: [
    { code: "1281", name: "Tiền gửi có kỳ hạn", level: 2, type: "ASSET" },
    { code: "1282", name: "Trái phiếu", level: 2, type: "ASSET" },
    { code: "1288", name: "Các khoản đầu tư khác", level: 2, type: "ASSET" }
  ]},
  { code: "131", name: "Phải thu của khách hàng", level: 1, type: "ASSET" },
  { code: "133", name: "Thuế GTGT được khấu trừ", level: 1, type: "ASSET", children: [
    { code: "1331", name: "Thuế GTGT được khấu trừ của hàng hóa, dịch vụ", level: 2, type: "ASSET" },
    { code: "1332", name: "Thuế GTGT được khấu trừ của tài sản cố định", level: 2, type: "ASSET" }
  ]},
  { code: "136", name: "Phải thu nội bộ", level: 1, type: "ASSET", children: [
    { code: "1361", name: "Vốn kinh doanh ở các đơn vị trực thuộc", level: 2, type: "ASSET" },
    { code: "1368", name: "Phải thu nội bộ khác", level: 2, type: "ASSET" }
  ]},
  { code: "138", name: "Phải thu khác", level: 1, type: "ASSET", children: [
    { code: "1381", name: "Tài sản thiếu chờ xử lý", level: 2, type: "ASSET" },
    { code: "1385", name: "Phải thu về cổ phần hóa", level: 2, type: "ASSET" },
    { code: "1388", name: "Phải thu khác", level: 2, type: "ASSET" }
  ]},
  { code: "141", name: "Tạm ứng", level: 1, type: "ASSET" },
  { code: "151", name: "Hàng mua đang đi đường", level: 1, type: "ASSET" },
  { code: "152", name: "Nguyên liệu, vật liệu", level: 1, type: "ASSET" },
  { code: "153", name: "Công cụ, dụng cụ", level: 1, type: "ASSET", children: [
    { code: "1531", name: "Công cụ, dụng cụ", level: 2, type: "ASSET" },
    { code: "1532", name: "Bao bì luân chuyển", level: 2, type: "ASSET" },
    { code: "1533", name: "Đồ dùng cho thuê", level: 2, type: "ASSET" },
    { code: "1534", name: "Thiết bị, phụ tùng thay thế", level: 2, type: "ASSET" }
  ]},
  { code: "154", name: "Chi phí sản xuất, kinh doanh dở dang", level: 1, type: "ASSET" },
  { code: "155", name: "Thành phẩm", level: 1, type: "ASSET", children: [
    { code: "1551", name: "Thành phẩm nhập kho", level: 2, type: "ASSET" },
    { code: "1557", name: "Thành phẩm bất động sản", level: 2, type: "ASSET" }
  ]},
  { code: "156", name: "Hàng hóa", level: 1, type: "ASSET", children: [
    { code: "1561", name: "Giá mua hàng hóa", level: 2, type: "ASSET" },
    { code: "1562", name: "Chi phí thu mua hàng hóa", level: 2, type: "ASSET" },
    { code: "1567", name: "Hàng hóa bất động sản", level: 2, type: "ASSET" }
  ]},
  { code: "157", name: "Hàng gửi đi bán", level: 1, type: "ASSET" },
  { code: "158", name: "Hàng hoá kho bảo thuế", level: 1, type: "ASSET" },
  { code: "171", name: "Giao dịch mua bán lại trái phiếu Chính phủ", level: 1, type: "ASSET" },

  // LOẠI 2 - TÀI SẢN DÀI HẠN
  { code: "211", name: "Tài sản cố định hữu hình", level: 1, type: "ASSET", children: [
    { code: "2111", name: "Nhà cửa, vật kiến trúc", level: 2, type: "ASSET" },
    { code: "2112", name: "Máy móc thiết bị", level: 2, type: "ASSET" },
    { code: "2113", name: "Phương tiện vận tải, thiết bị truyền dẫn", level: 2, type: "ASSET" },
    { code: "2114", name: "Thiết bị, dụng cụ quản lý", level: 2, type: "ASSET" },
    { code: "2115", name: "Cây lâu năm, súc vật làm việc và cho sản phẩm", level: 2, type: "ASSET" },
    { code: "2118", name: "TSCĐ hữu hình khác", level: 2, type: "ASSET" }
  ]},
  { code: "212", name: "Tài sản cố định thuê tài chính", level: 1, type: "ASSET", children: [
    { code: "2121", name: "TSCĐ hữu hình thuê tài chính", level: 2, type: "ASSET" },
    { code: "2122", name: "TSCĐ vô hình thuê tài chính", level: 2, type: "ASSET" }
  ]},
  { code: "213", name: "Tài sản cố định vô hình", level: 1, type: "ASSET", children: [
    { code: "2131", name: "Quyền sử dụng đất", level: 2, type: "ASSET" },
    { code: "2132", name: "Quyền phát hành", level: 2, type: "ASSET" },
    { code: "2133", name: "Bản quyền, bằng sáng chế", level: 2, type: "ASSET" },
    { code: "2134", name: "Nhãn hiệu, tên thương mại", level: 2, type: "ASSET" },
    { code: "2135", name: "Chương trình phần mềm", level: 2, type: "ASSET" },
    { code: "2136", name: "Giấy phép và giấy phép nhượng quyền", level: 2, type: "ASSET" },
    { code: "2138", name: "TSCĐ vô hình khác", level: 2, type: "ASSET" }
  ]},
  { code: "214", name: "Hao mòn tài sản cố định", level: 1, type: "ASSET", children: [
    { code: "2141", name: "Hao mòn TSCĐ hữu hình", level: 2, type: "ASSET" },
    { code: "2142", name: "Hao mòn TSCĐ thuê tài chính", level: 2, type: "ASSET" },
    { code: "2143", name: "Hao mòn TSCĐ vô hình", level: 2, type: "ASSET" },
    { code: "2147", name: "Hao mòn BĐS đầu tư", level: 2, type: "ASSET" }
  ]},
  { code: "217", name: "Bất động sản đầu tư", level: 1, type: "ASSET" },
  { code: "221", name: "Đầu tư vào công ty con", level: 1, type: "ASSET" },
  { code: "222", name: "Đầu tư vào công ty liên doanh, liên kết", level: 1, type: "ASSET" },
  { code: "228", name: "Đầu tư khác vào công ty khác", level: 1, type: "ASSET" },
  { code: "229", name: "Dự phòng tổn thất tài sản", level: 1, type: "ASSET", children: [
    { code: "2291", name: "Dự phòng giảm giá chứng khoán kinh doanh", level: 2, type: "ASSET" },
    { code: "2292", name: "Dự phòng tổn thất đầu tư vào đơn vị khác", level: 2, type: "ASSET" },
    { code: "2293", name: "Dự phòng phải thu khó đòi", level: 2, type: "ASSET" },
    { code: "2294", name: "Dự phòng giảm giá hàng tồn kho", level: 2, type: "ASSET" }
  ]},
  { code: "241", name: "Xây dựng cơ bản dở dang", level: 1, type: "ASSET", children: [
    { code: "2411", name: "Mua sắm TSCĐ", level: 2, type: "ASSET" },
    { code: "2412", name: "Xây dựng cơ bản", level: 2, type: "ASSET" },
    { code: "2413", name: "Sửa chữa lớn TSCĐ", level: 2, type: "ASSET" }
  ]},
  { code: "242", name: "Chi phí trả trước", level: 1, type: "ASSET" },
  { code: "243", name: "Tài sản thuế thu nhập hoãn lại", level: 1, type: "ASSET" },
  { code: "244", name: "Cầm cố, thế chấp, ký quỹ, ký cược", level: 1, type: "ASSET" },

  // LOẠI 3 - NỢ PHẢI TRẢ
  { code: "331", name: "Phải trả cho người bán", level: 1, type: "LIABILITY" },
  { code: "333", name: "Thuế và các khoản phải nộp Nhà nước", level: 1, type: "LIABILITY", children: [
    { code: "3331", name: "Thuế GTGT phải nộp", level: 2, type: "LIABILITY" },
    { code: "3332", name: "Thuế tiêu thụ đặc biệt", level: 2, type: "LIABILITY" },
    { code: "3333", name: "Thuế xuất, nhập khẩu", level: 2, type: "LIABILITY" },
    { code: "3334", name: "Thuế thu nhập doanh nghiệp", level: 2, type: "LIABILITY" },
    { code: "3335", name: "Thuế thu nhập cá nhân", level: 2, type: "LIABILITY" },
    { code: "3336", name: "Thuế tài nguyên", level: 2, type: "LIABILITY" },
    { code: "3337", name: "Thuế nhà đất, tiền thuê đất", level: 2, type: "LIABILITY" },
    { code: "3338", name: "Thuế bảo vệ môi trường và các loại thuế khác", level: 2, type: "LIABILITY" },
    { code: "3339", name: "Phí, lệ phí và các khoản phải nộp khác", level: 2, type: "LIABILITY" }
  ]},
  { code: "334", name: "Phải trả người lao động", level: 1, type: "LIABILITY", children: [
    { code: "3341", name: "Phải trả công nhân viên", level: 2, type: "LIABILITY" },
    { code: "3348", name: "Phải trả người lao động khác", level: 2, type: "LIABILITY" }
  ]},
  { code: "335", name: "Chi phí phải trả", level: 1, type: "LIABILITY" },
  { code: "336", name: "Phải trả nội bộ", level: 1, type: "LIABILITY", children: [
    { code: "3361", name: "Phải trả nội bộ về vốn kinh doanh", level: 2, type: "LIABILITY" },
    { code: "3368", name: "Phải trả nội bộ khác", level: 2, type: "LIABILITY" }
  ]},
  { code: "337", name: "Thanh toán theo tiến độ hợp đồng xây dựng", level: 1, type: "LIABILITY" },
  { code: "338", name: "Phải trả, phải nộp khác", level: 1, type: "LIABILITY", children: [
    { code: "3381", name: "Tài sản thừa chờ giải quyết", level: 2, type: "LIABILITY" },
    { code: "3382", name: "Kinh phí công đoàn", level: 2, type: "LIABILITY" },
    { code: "3383", name: "Bảo hiểm xã hội", level: 2, type: "LIABILITY" },
    { code: "3384", name: "Bảo hiểm y tế", level: 2, type: "LIABILITY" },
    { code: "3385", name: "Phải trả về cổ phần hoá", level: 2, type: "LIABILITY" },
    { code: "3386", name: "Bảo hiểm thất nghiệp", level: 2, type: "LIABILITY" },
    { code: "3387", name: "Doanh thu chưa thực hiện", level: 2, type: "LIABILITY" },
    { code: "3388", name: "Phải trả, phải nộp khác", level: 2, type: "LIABILITY" }
  ]},
  { code: "341", name: "Vay và nợ thuê tài chính", level: 1, type: "LIABILITY", children: [
    { code: "3411", name: "Các khoản đi vay", level: 2, type: "LIABILITY" },
    { code: "3412", name: "Nợ thuê tài chính", level: 2, type: "LIABILITY" }
  ]},
  { code: "343", name: "Trái phiếu phát hành", level: 1, type: "LIABILITY", children: [
    { code: "3431", name: "Trái phiếu phát hành thường", level: 2, type: "LIABILITY" },
    { code: "3432", name: "Trái phiếu chuyển đổi", level: 2, type: "LIABILITY" }
  ]},
  { code: "344", name: "Nhận ký quỹ, ký cược", level: 1, type: "LIABILITY" },
  { code: "347", name: "Thuế thu nhập hoãn lại phải trả", level: 1, type: "LIABILITY" },
  { code: "352", name: "Dự phòng phải trả", level: 1, type: "LIABILITY", children: [
    { code: "3521", name: "Dự phòng bảo hành sản phẩm hàng hóa", level: 2, type: "LIABILITY" },
    { code: "3522", name: "Dự phòng bảo hành công trình xây dựng", level: 2, type: "LIABILITY" },
    { code: "3523", name: "Dự phòng tái cơ cấu doanh nghiệp", level: 2, type: "LIABILITY" },
    { code: "3524", name: "Dự phòng phải trả khác", level: 2, type: "LIABILITY" }
  ]},
  { code: "353", name: "Quỹ khen thưởng, phúc lợi", level: 1, type: "LIABILITY", children: [
    { code: "3531", name: "Quỹ khen thưởng", level: 2, type: "LIABILITY" },
    { code: "3532", name: "Quỹ phúc lợi", level: 2, type: "LIABILITY" },
    { code: "3533", name: "Quỹ phúc lợi đã hình thành TSCĐ", level: 2, type: "LIABILITY" },
    { code: "3534", name: "Quỹ thưởng ban quản lý điều hành", level: 2, type: "LIABILITY" }
  ]},
  { code: "356", name: "Quỹ phát triển khoa học và công nghệ", level: 1, type: "LIABILITY", children: [
    { code: "3561", name: "Quỹ phát triển khoa học và công nghệ", level: 2, type: "LIABILITY" },
    { code: "3562", name: "Quỹ phát triển KH&CN đã hình thành TSCĐ", level: 2, type: "LIABILITY" }
  ]},
  { code: "357", name: "Quỹ bình ổn giá", level: 1, type: "LIABILITY" },

  // LOẠI 4 - VỐN CHỦ SỞ HỮU
  { code: "411", name: "Vốn đầu tư của chủ sở hữu", level: 1, type: "EQUITY", children: [
    { code: "4111", name: "Vốn góp của chủ sở hữu", level: 2, type: "EQUITY" },
    { code: "4112", name: "Thặng dư vốn cổ phần", level: 2, type: "EQUITY" },
    { code: "4113", name: "Quyền chọn chuyển đổi trái phiếu", level: 2, type: "EQUITY" },
    { code: "4118", name: "Vốn khác", level: 2, type: "EQUITY" }
  ]},
  { code: "412", name: "Chênh lệch đánh giá lại tài sản", level: 1, type: "EQUITY" },
  { code: "413", name: "Chênh lệch tỷ giá hối đoái", level: 1, type: "EQUITY", children: [
    { code: "4131", name: "Chênh lệch tỷ giá đánh giá lại các khoản mục tiền tệ", level: 2, type: "EQUITY" },
    { code: "4132", name: "Chênh lệch tỷ giá trong giai đoạn trước hoạt động", level: 2, type: "EQUITY" }
  ]},
  { code: "414", name: "Quỹ đầu tư phát triển", level: 1, type: "EQUITY" },
  { code: "417", name: "Quỹ hỗ trợ sắp xếp doanh nghiệp", level: 1, type: "EQUITY" },
  { code: "418", name: "Các quỹ khác thuộc vốn chủ sở hữu", level: 1, type: "EQUITY" },
  { code: "419", name: "Cổ phiếu quỹ", level: 1, type: "EQUITY" },
  { code: "421", name: "Lợi nhuận sau thuế chưa phân phối", level: 1, type: "EQUITY", children: [
    { code: "4211", name: "Lợi nhuận sau thuế chưa phân phối năm trước", level: 2, type: "EQUITY" },
    { code: "4212", name: "Lợi nhuận sau thuế chưa phân phối năm nay", level: 2, type: "EQUITY" }
  ]},
  { code: "441", name: "Nguồn vốn đầu tư xây dựng cơ bản", level: 1, type: "EQUITY" },
  { code: "461", name: "Nguồn kinh phí sự nghiệp", level: 1, type: "EQUITY", children: [
    { code: "4611", name: "Nguồn kinh phí sự nghiệp năm trước", level: 2, type: "EQUITY" },
    { code: "4612", name: "Nguồn kinh phí sự nghiệp năm nay", level: 2, type: "EQUITY" }
  ]},
  { code: "466", name: "Nguồn kinh phí đã hình thành TSCĐ", level: 1, type: "EQUITY" },

  // LOẠI 5 - DOANH THU
  { code: "511", name: "Doanh thu bán hàng và cung cấp dịch vụ", level: 1, type: "REVENUE", children: [
    { code: "5111", name: "Doanh thu bán hàng hóa", level: 2, type: "REVENUE" },
    { code: "5112", name: "Doanh thu bán các thành phẩm", level: 2, type: "REVENUE" },
    { code: "5113", name: "Doanh thu cung cấp dịch vụ", level: 2, type: "REVENUE" },
    { code: "5114", name: "Doanh thu trợ cấp, trợ giá", level: 2, type: "REVENUE" },
    { code: "5117", name: "Doanh thu kinh doanh bất động sản đầu tư", level: 2, type: "REVENUE" },
    { code: "5118", name: "Doanh thu khác", level: 2, type: "REVENUE" }
  ]},
  { code: "515", name: "Doanh thu hoạt động tài chính", level: 1, type: "REVENUE" },
  { code: "521", name: "Các khoản giảm trừ doanh thu", level: 1, type: "REVENUE", children: [
    { code: "5211", name: "Chiết khấu thương mại", level: 2, type: "REVENUE" },
    { code: "5212", name: "Hàng bán bị trả lại", level: 2, type: "REVENUE" },
    { code: "5213", name: "Giảm giá hàng bán", level: 2, type: "REVENUE" }
  ]},

  // LOẠI 6 - CHI PHÍ SẢN XUẤT, KINH DOANH
  { code: "611", name: "Mua hàng (Phương pháp kiểm kê định kỳ)", level: 1, type: "EXPENSE", children: [
    { code: "6111", name: "Mua nguyên liệu, vật liệu", level: 2, type: "EXPENSE" },
    { code: "6112", name: "Mua hàng hóa", level: 2, type: "EXPENSE" }
  ]},
  { code: "621", name: "Chi phí nguyên liệu, vật liệu trực tiếp", level: 1, type: "EXPENSE" },
  { code: "622", name: "Chi phí nhân công trực tiếp", level: 1, type: "EXPENSE" },
  { code: "623", name: "Chi phí sử dụng máy thi công", level: 1, type: "EXPENSE", children: [
    { code: "6231", name: "Chi phí nhân công", level: 2, type: "EXPENSE" },
    { code: "6232", name: "Chi phí vật liệu", level: 2, type: "EXPENSE" },
    { code: "6233", name: "Chi phí dụng cụ sản xuất", level: 2, type: "EXPENSE" },
    { code: "6234", name: "Chi phí khấu hao máy thi công", level: 2, type: "EXPENSE" },
    { code: "6237", name: "Chi phí dịch vụ mua ngoài", level: 2, type: "EXPENSE" },
    { code: "6238", name: "Chi phí bằng tiền khác", level: 2, type: "EXPENSE" }
  ]},
  { code: "627", name: "Chi phí sản xuất chung", level: 1, type: "EXPENSE", children: [
    { code: "6271", name: "Chi phí nhân viên phân xưởng", level: 2, type: "EXPENSE" },
    { code: "6272", name: "Chi phí vật liệu", level: 2, type: "EXPENSE" },
    { code: "6273", name: "Chi phí dụng cụ sản xuất", level: 2, type: "EXPENSE" },
    { code: "6274", name: "Chi phí khấu hao TSCĐ", level: 2, type: "EXPENSE" },
    { code: "6277", name: "Chi phí dịch vụ mua ngoài", level: 2, type: "EXPENSE" },
    { code: "6278", name: "Chi phí bằng tiền khác", level: 2, type: "EXPENSE" }
  ]},
  { code: "631", name: "Giá thành sản xuất (Phương pháp kiểm kê định kỳ)", level: 1, type: "EXPENSE" },
  { code: "632", name: "Giá vốn hàng bán", level: 1, type: "EXPENSE" },
  { code: "635", name: "Chi phí tài chính", level: 1, type: "EXPENSE" },
  { code: "641", name: "Chi phí bán hàng", level: 1, type: "EXPENSE", children: [
    { code: "6411", name: "Chi phí nhân viên", level: 2, type: "EXPENSE" },
    { code: "6412", name: "Chi phí vật liệu, bao bì", level: 2, type: "EXPENSE" },
    { code: "6413", name: "Chi phí dụng cụ, đồ dùng", level: 2, type: "EXPENSE" },
    { code: "6414", name: "Chi phí khấu hao TSCĐ", level: 2, type: "EXPENSE" },
    { code: "6415", name: "Chi phí bảo hành", level: 2, type: "EXPENSE" },
    { code: "6417", name: "Chi phí dịch vụ mua ngoài", level: 2, type: "EXPENSE" },
    { code: "6418", name: "Chi phí bằng tiền khác", level: 2, type: "EXPENSE" }
  ]},
  { code: "642", name: "Chi phí quản lý doanh nghiệp", level: 1, type: "EXPENSE", children: [
    { code: "6421", name: "Chi phí nhân viên quản lý", level: 2, type: "EXPENSE" },
    { code: "6422", name: "Chi phí vật liệu quản lý", level: 2, type: "EXPENSE" },
    { code: "6423", name: "Chi đồ dùng văn phòng", level: 2, type: "EXPENSE" },
    { code: "6424", name: "Chi phí khấu hao TSCĐ", level: 2, type: "EXPENSE" },
    { code: "6425", name: "Thuế, phí và lệ phí", level: 2, type: "EXPENSE" },
    { code: "6426", name: "Chi phí dự phòng", level: 2, type: "EXPENSE" },
    { code: "6427", name: "Chi phí dịch vụ mua ngoài", level: 2, type: "EXPENSE" },
    { code: "6428", name: "Chi phí bằng tiền khác", level: 2, type: "EXPENSE" }
  ]},

  // LOẠI 7 - THU NHẬP KHÁC
  { code: "711", name: "Thu nhập khác", level: 1, type: "REVENUE" },

  // LOẠI 8 - CHI PHÍ KHÁC
  { code: "811", name: "Chi phí khác", level: 1, type: "EXPENSE" },
  { code: "821", name: "Chi phí thuế thu nhập doanh nghiệp", level: 1, type: "EXPENSE", children: [
    { code: "8211", name: "Chi phí thuế TNDN hiện hành", level: 2, type: "EXPENSE" },
    { code: "8212", name: "Chi phí thuế TNDN hoãn lại", level: 2, type: "EXPENSE" }
  ]},

  // LOẠI 9 - XÁC ĐỊNH KẾT QUẢ KINH DOANH
  { code: "911", name: "Xác định kết quả kinh doanh", level: 1, type: "EQUITY" }
];

async function main() {
  console.log("Seeding full chart of accounts...");
  
  for (const acc of accounts) {
    const parent = await (prisma as any).accountingAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        level: acc.level,
        type: acc.type,
        isParent: !!acc.children?.length
      }
    });

    if (acc.children) {
      for (const child of acc.children) {
        await (prisma as any).accountingAccount.upsert({
          where: { code: child.code },
          update: {},
          create: {
            code: child.code,
            name: child.name,
            level: child.level,
            type: child.type,
            parentId: parent.id,
            isParent: false
          }
        });
      }
    }
  }

  console.log("Seeding completed!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
