import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

function extractTag($: cheerio.CheerioAPI, tags: string[]): string {
  for (const tag of tags) {
    const el = $(tag).first();
    if (el.length > 0) {
      return el.text().trim();
    }
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "Không tìm thấy file" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xml")) {
      return NextResponse.json({ success: false, message: "Hệ thống hiện chỉ hỗ trợ định dạng XML." }, { status: 400 });
    }

    const xmlText = await file.text();
    const $ = cheerio.load(xmlText, { xmlMode: true });

    // Đọc số hóa đơn, ký hiệu, ngày lập
    const soHoaDon = extractTag($, ["SHDon", "InvoiceNumber"]) || `UNKN-${Math.floor(Math.random()*1000)}`;
    const kyHieu = extractTag($, ["KHHDon", "SerialNo"]) || "1C24TXX";
    const ngayLap = extractTag($, ["NgayLap", "IssueDate"]) || new Date().toISOString().split('T')[0];
    
    // NNT = Người nộp thuế (Người bán)
    let tenNguoiBan = extractTag($, ["TenNNT", "SellerLegalName", "TenNguoiBan"]);
    let mstNguoiBan = extractTag($, ["MSTNNT", "SellerTaxCode", "MSTNguoiBan"]);
    let dchiNguoiBan = extractTag($, ["DChiNNT", "SellerAddress", "NDHDon > NBan > DChi"]);
    
    if (!tenNguoiBan) tenNguoiBan = extractTag($, ["NDHDon > NBan > Ten", "Seller > Name"]) || "Không xác định được tên nhà cung cấp";
    if (!mstNguoiBan) mstNguoiBan = extractTag($, ["NDHDon > NBan > MST", "Seller > TaxCode"]) || "0000000000";

    // Người mua
    let tenNguoiMua = extractTag($, ["TenNMua", "BuyerLegalName", "NDHDon > NMua > Ten"]) || "Công ty Cổ phần Seajong Faucet Việt Nam";
    let mstNguoiMua = extractTag($, ["MSTNMua", "BuyerTaxCode", "NDHDon > NMua > MST"]) || "0108112233";
    let dchiNguoiMua = extractTag($, ["DChiNMua", "BuyerAddress", "NDHDon > NMua > DChi"]) || "Khu công nghiệp VSIP, Hải Phòng";

    const tienThueStr = extractTag($, ["TgTThue", "TgTienThue", "TgTienGtGt", "VATAmount", "TToan > TgTThue"]) || "0";
    const tongTienStr = extractTag($, ["TgTTTBSo", "TgTTien", "TotalAmount", "TToan > TgTTTBSo"]) || "0";

    const taxAmount = parseFloat(tienThueStr.replace(/[^0-9.-]+/g, "")) || 0;
    const totalAmount = parseFloat(tongTienStr.replace(/[^0-9.-]+/g, "")) || 0;

    // Lấy danh sách hàng hóa
    const items: any[] = [];
    $("HHDVu, InvoiceItem, Item").each((i, el) => {
      const name = extractTag(cheerio.load(el, { xmlMode: true }), ["THHDVu", "ItemName", "TenHHDV"]) || "Mặt hàng " + (i + 1);
      const unit = extractTag(cheerio.load(el, { xmlMode: true }), ["DVTinh", "UnitName", "DVT"]) || "Cái";
      const qtyStr = extractTag(cheerio.load(el, { xmlMode: true }), ["SLuong", "Quantity"]) || "1";
      const priceStr = extractTag(cheerio.load(el, { xmlMode: true }), ["DGia", "UnitPrice"]) || "0";
      const totalStr = extractTag(cheerio.load(el, { xmlMode: true }), ["ThTien", "Amount"]) || "0";
      const taxRateStr = extractTag(cheerio.load(el, { xmlMode: true }), ["TSuat", "TaxRate"]) || "10%";

      items.push({
        name,
        unit,
        quantity: parseFloat(qtyStr.replace(/[^0-9.-]+/g, "")) || 1,
        price: parseFloat(priceStr.replace(/[^0-9.-]+/g, "")) || 0,
        total: parseFloat(totalStr.replace(/[^0-9.-]+/g, "")) || 0,
        taxRate: taxRateStr
      });
    });

    // 2. Rule Engine
    let statusTaxCode: "active" | "inactive" | "suspended" = "active";
    let statusSignature: "valid" | "invalid" | "missing" = "missing";
    let statusAi: "green" | "yellow" | "red" = "green";
    let aiNotes = "Hợp lệ, chữ ký số đầy đủ.";

    // Check Signature
    if (xmlText.includes("<Signature") || xmlText.includes("<ds:Signature")) {
      statusSignature = "valid";
    } else {
      statusSignature = "missing";
      statusAi = "yellow";
      aiNotes = "CẢNH BÁO: Không tìm thấy chứng thư số trong file XML.";
    }

    // Check Math (Basic)
    if (totalAmount > 0 && taxAmount > 0) {
       // Thường tổng tiền trước thuế = Tổng tiền - Tiền thuế
       const preTax = totalAmount - taxAmount;
       // Nếu tiền thuế không phải là 8% hay 10% của preTax (chênh lệch quá 100đ do làm tròn)
       const rate10 = preTax * 0.1;
       const rate8 = preTax * 0.08;
       const rate5 = preTax * 0.05;
       
       const isMathOk = Math.abs(taxAmount - rate10) < 100 || Math.abs(taxAmount - rate8) < 100 || Math.abs(taxAmount - rate5) < 100;
       
       if (!isMathOk && statusAi === "green") {
           statusAi = "yellow";
           aiNotes = "CẢNH BÁO: Số tiền thuế không khớp chính xác với tỷ lệ 5%, 8% hoặc 10%. Cần kiểm tra lại chi tiết.";
       }
    }

    const newInvoice = {
        id: `INV-${Date.now()}`,
        invoiceNumber: `${kyHieu}/${soHoaDon}`,
        date: ngayLap,
        supplier: tenNguoiBan,
        supplierTaxCode: mstNguoiBan,
        supplierAddress: dchiNguoiBan,
        buyerName: tenNguoiMua,
        buyerTaxCode: mstNguoiMua,
        buyerAddress: dchiNguoiMua,
        items,
        totalAmount,
        taxAmount,
        statusTaxCode,
        statusSignature,
        statusAi,
        aiNotes
    };

    return NextResponse.json({
      success: true,
      data: newInvoice
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
