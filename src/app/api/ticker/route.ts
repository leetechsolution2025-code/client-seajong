import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleStr = searchParams.get("module") || "general";

    let data: { text: string; link?: string; title?: string; type: string }[] = [];

    if (moduleStr === "tax") {
      const news = await prisma.taxPolicyNews.findMany({
        take: 10,
        orderBy: { publishDate: 'desc' },
      });
      data = news.map((n: any) => ({
        text: `• ${n.title} - ${n.summary || ""}`,
        link: n.link,
        title: n.title,
        type: 'tax'
      }));
    } else if (moduleStr === "finance_inventory") {
      const items = await prisma.inventoryItem.findMany({
        where: { loai: "hang-hoa" },
        include: {
          stocks: { select: { soLuong: true, soLuongMin: true } }
        }
      });
      
      let tongGiaTri = 0;
      let sapHet = 0;
      let daHet = 0;

      items.forEach((item: any) => {
        const hasStocks = item.stocks && item.stocks.length > 0;
        const soLuongThuc = hasStocks ? item.stocks.reduce((sum: number, s: any) => sum + s.soLuong, 0) : (item.soLuong || 0);
        
        tongGiaTri += soLuongThuc * (item.giaNhap || 0);
        
        const soLuongMinTotal = hasStocks ? item.stocks.reduce((sum: number, s: any) => sum + s.soLuongMin, 0) : 0;
        const minThreshold = soLuongMinTotal > 0 ? soLuongMinTotal : (item.soLuongMin || 0);

        if (soLuongThuc <= 0) daHet++;
        else if (minThreshold > 0 && soLuongThuc <= minThreshold) sapHet++;
      });
      
      const formatMoney = (val: number) => new Intl.NumberFormat("vi-VN").format(Math.round(val)) + " đ";

      data = [
        { text: `• Tổng số mặt hàng: ${items.length}`, type: 'text' },
        { text: `• Tổng giá trị kho: ${formatMoney(tongGiaTri)}`, type: 'text' },
        { text: `• Sắp hết hàng: ${sapHet} mặt hàng`, type: 'text' },
        { text: `• Đã hết hàng: ${daHet} mặt hàng`, type: 'text' },
      ];
    } else if (moduleStr === "finance_assets") {
      const assets = await prisma.asset.findMany();
      const now = new Date();
      let totalValue = 0;
      let totalInitialValue = 0;
      let countInUse = 0;

      assets.forEach((asset: any) => {
        totalInitialValue += asset.giaTriMua || 0;
        if (asset.trangThai === "dang-su-dung") countInUse++;

        let remainingValue = asset.giaTriMua || 0;
        if (asset.soThangKhauHao && asset.soThangKhauHao > 0 && asset.ngayBatDauKhauHao) {
          const start = new Date(asset.ngayBatDauKhauHao);
          const startMonth = start.getFullYear() * 12 + start.getMonth();
          const currentMonth = now.getFullYear() * 12 + now.getMonth();
          const lastCompletedMonth = (now.getDate() >= 28) ? currentMonth : currentMonth - 1;
          const monthsDiff = lastCompletedMonth - startMonth + 1;
          if (monthsDiff > 0) {
            const depreciationPerMonth = asset.giaTriMua / asset.soThangKhauHao;
            remainingValue = Math.max(0, asset.giaTriMua - (monthsDiff * depreciationPerMonth));
          }
        }
        totalValue += remainingValue;
      });

      const formatMoney = (val: number) => new Intl.NumberFormat("vi-VN").format(Math.round(val)) + " đ";
      const percent = totalInitialValue > 0 ? Math.round(((totalInitialValue - totalValue) / totalInitialValue) * 100) : 0;
      const percentText = percent > 0 ? ` <span class="badge bg-danger ms-1" style="font-size: 0.7rem; padding: 0.3em 0.5em; font-weight: 600; vertical-align: middle;">↓ ${percent}%</span>` : '';

      data = [
        { text: `• Tổng số tài sản: ${assets.length}`, type: 'text' },
        { text: `• Đang sử dụng: ${countInUse} tài sản`, type: 'text' },
        { text: `• Tổng nguyên giá: ${formatMoney(totalInitialValue)}`, type: 'text' },
        { text: `• Tổng giá trị hiện tại: ${formatMoney(totalValue)}${percentText}`, type: 'text' },
        { text: `• Khấu hao luỹ kế: ${formatMoney(totalInitialValue - totalValue)}`, type: 'text' },
      ];
    } else if (moduleStr === "finance") {
      const debts = await prisma.debt.findMany();
      
      let phaiThuTotal = 0; let phaiThuCon = 0;
      let phaiTraTotal = 0; let phaiTraCon = 0;
      let noVayTotal = 0;   let noVayCon = 0;
      
      debts.forEach((d: any) => {
        const amt = d.amount || 0;
        const remaining = amt - (d.paidAmount || 0);
        if (d.type === "phai-thu" || d.type === "RECEIVABLE") {
          phaiThuTotal += amt; phaiThuCon += remaining;
        }
        else if (d.type === "phai-tra" || d.type === "PAYABLE") {
          phaiTraTotal += amt; phaiTraCon += remaining;
        }
        else if (d.type === "vay" || d.type === "LOAN") {
          noVayTotal += amt; noVayCon += remaining;
          const startDate = new Date(d.createdAt);
          if (startDate <= new Date()) {
             totalExpense += (amt * (d.interestRate || 0)) / 100 / 12;
          }
        }
      });
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      let totalExpense = 0;

      // 1. Manual expenses
      const expenses = await prisma.expense.aggregate({
        _sum: { soTien: true },
        where: { 
          ngayChiTra: { gte: firstDay, lte: lastDay },
          trangThai: { in: ["paid", "Đã thanh toán", "completed"] }
        }
      });
      totalExpense += expenses._sum.soTien || 0;

      // 2. Asset depreciation this month
      const assets = await prisma.asset.findMany({
        where: {
          trangThai: "dang-su-dung",
          ngayBatDauKhauHao: { not: null },
          soThangKhauHao: { gt: 0 }
        }
      });
      assets.forEach((asset: any) => {
        const startDate = new Date(asset.ngayBatDauKhauHao);
        if (startDate <= now) {
          totalExpense += asset.giaTriMua / (asset.soThangKhauHao || 1);
        }
      });

      // 3. Payroll this month
      const payrolls = await prisma.payroll.aggregate({
        _sum: { tongChiPhiCty: true },
        where: { thang: currentMonth + 1, nam: currentYear }
      });
      totalExpense += payrolls._sum.tongChiPhiCty || 0;

      const formatMoney = (val: number) => new Intl.NumberFormat("vi-VN").format(Math.round(val)) + " đ";
      
      data = [
        { text: `• Tổng phát sinh phải thu: ${formatMoney(phaiThuTotal)} (Dư nợ hiện tại: ${formatMoney(phaiThuCon)})`, type: 'text' },
        { text: `• Tổng phát sinh phải trả: ${formatMoney(phaiTraTotal)} (Dư nợ hiện tại: ${formatMoney(phaiTraCon)})`, type: 'text' },
        { text: `• Tổng vay: ${formatMoney(noVayTotal)} (Dư nợ hiện tại: ${formatMoney(noVayCon)})`, type: 'text' },
        { text: `• Tổng chi phí trong tháng: ${formatMoney(totalExpense)}`, type: 'text' },
      ];
    } else if (moduleStr === "hr") {
      data = [
        { text: "• Nhắc nhở: Hạn chót duyệt bảng công tháng này là ngày 05.", type: "text" },
        { text: "• Chào mừng 3 nhân sự mới gia nhập phòng Kinh doanh tuần này!", type: "text" },
        { text: "• Chính sách phúc lợi mới: Tăng phụ cấp ăn trưa từ tháng sau.", type: "text" }
      ];
    } else if (moduleStr === "production") {
      data = [
        { text: "• Cảnh báo: Mã vật tư VT-001 đang dưới định mức an toàn.", type: "text" },
        { text: "• Kế hoạch bảo trì máy cắt laser CNC số 2 vào cuối tuần này.", type: "text" },
        { text: "• Tiến độ sản xuất đơn hàng PO-2024-05 đạt 85%.", type: "text" }
      ];
    } else if (moduleStr === "sales") {
      data = [
        { text: "• Chúc mừng Team Sale 1 vừa chốt thành công hợp đồng 500 triệu!", type: "text" },
        { text: "• Cập nhật bảng giá mới cho dòng sản phẩm A áp dụng từ ngày 01/08.", type: "text" },
        { text: "• Mục tiêu doanh số tháng này đã đạt 75%.", type: "text" }
      ];
    } else if (moduleStr === "logistics") {
      data = [
        { text: "• Thông báo: Lịch kiểm kê kho định kỳ vào chiều Thứ 6 tuần này.", type: "text" },
        { text: "• Có 3 chuyến hàng nội bộ đang chờ xác nhận luân chuyển.", type: "text" }
      ];
    } else {
      // General Board / Exec / Other
      data = [
        { text: "• Chào mừng đến với Hệ thống Quản trị Doanh nghiệp Toàn diện.", type: "text" },
        { text: "• Lịch họp giao ban Ban Giám Đốc vào 9h sáng Thứ Hai tuần tới.", type: "text" }
      ];
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API Ticker Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
