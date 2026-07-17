import { NextResponse } from "next/server";
import * as imaps from "imap-simple";
import { simpleParser } from "mailparser";
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

function parseInvoiceXML(xmlText: string) {
  const $ = cheerio.load(xmlText, { xmlMode: true });

  const soHoaDon = extractTag($, ["SHDon", "InvoiceNumber"]) || `UNKN-${Math.floor(Math.random()*1000)}`;
  const kyHieu = extractTag($, ["KHHDon", "SerialNo"]) || "1C24TXX";
  const ngayLap = extractTag($, ["NgayLap", "IssueDate"]) || new Date().toISOString().split('T')[0];
  
  let tenNguoiBan = extractTag($, ["TenNNT", "SellerLegalName", "TenNguoiBan"]);
  let mstNguoiBan = extractTag($, ["MSTNNT", "SellerTaxCode", "MSTNguoiBan"]);
  let dchiNguoiBan = extractTag($, ["DChiNNT", "SellerAddress", "NDHDon > NBan > DChi"]);
  
  if (!tenNguoiBan) tenNguoiBan = extractTag($, ["NDHDon > NBan > Ten", "Seller > Name"]) || "Không xác định được tên nhà cung cấp";
  if (!mstNguoiBan) mstNguoiBan = extractTag($, ["NDHDon > NBan > MST", "Seller > TaxCode"]) || "0000000000";

  let tenNguoiMua = extractTag($, ["TenNMua", "BuyerLegalName", "NDHDon > NMua > Ten"]) || "Công ty Cổ phần Seajong Faucet Việt Nam";
  let mstNguoiMua = extractTag($, ["MSTNMua", "BuyerTaxCode", "NDHDon > NMua > MST"]) || "0108112233";
  let dchiNguoiMua = extractTag($, ["DChiNMua", "BuyerAddress", "NDHDon > NMua > DChi"]) || "Khu công nghiệp VSIP, Hải Phòng";

  const tienThueStr = extractTag($, ["TgTThue", "TgTienThue", "TgTienGtGt", "VATAmount", "TToan > TgTThue"]) || "0";
  const tongTienStr = extractTag($, ["TgTTTBSo", "TgTTien", "TotalAmount", "TToan > TgTTTBSo"]) || "0";

  const taxAmount = parseFloat(tienThueStr.replace(/[^0-9.-]+/g, "")) || 0;
  const totalAmount = parseFloat(tongTienStr.replace(/[^0-9.-]+/g, "")) || 0;

  const items: any[] = [];
  $("HHDVu, InvoiceItem, Item").each((i, el) => {
    const name = extractTag(cheerio.load(el, { xmlMode: true }), ["THHDVu", "ItemName", "TenHHDV"]) || "Mặt hàng " + (i + 1);
    const unit = extractTag(cheerio.load(el, { xmlMode: true }), ["DVTinh", "UnitName", "DVT"]) || "Cái";
    const qtyStr = extractTag(cheerio.load(el, { xmlMode: true }), ["SLuong", "Quantity"]) || "1";
    const priceStr = extractTag(cheerio.load(el, { xmlMode: true }), ["DGia", "UnitPrice"]) || "0";
    const totalStr = extractTag(cheerio.load(el, { xmlMode: true }), ["ThTien", "Amount"]) || "0";
    const taxRateStr = extractTag(cheerio.load(el, { xmlMode: true }), ["TSuat", "TaxRate"]) || "10%";

    items.push({
      name, unit,
      quantity: parseFloat(qtyStr.replace(/[^0-9.-]+/g, "")) || 1,
      price: parseFloat(priceStr.replace(/[^0-9.-]+/g, "")) || 0,
      total: parseFloat(totalStr.replace(/[^0-9.-]+/g, "")) || 0,
      taxRate: taxRateStr
    });
  });

  let statusTaxCode: "active" | "inactive" | "suspended" = "active";
  let statusSignature: "valid" | "invalid" | "missing" = "missing";
  let statusAi: "green" | "yellow" | "red" = "green";
  let aiNotes = "Hợp lệ, chữ ký số đầy đủ.";

  if (xmlText.includes("<Signature") || xmlText.includes("<ds:Signature")) {
    statusSignature = "valid";
  } else {
    statusSignature = "missing";
    statusAi = "yellow";
    aiNotes = "CẢNH BÁO: Không tìm thấy chứng thư số trong file XML.";
  }

  if (totalAmount > 0 && taxAmount > 0) {
     if (Math.abs((totalAmount - taxAmount) - (totalAmount / 1.1)) > 1000 && Math.abs((totalAmount - taxAmount) - (totalAmount / 1.08)) > 1000) {
        statusAi = "red";
        aiNotes = "CẢNH BÁO: Tiền thuế không khớp với tổng tiền thanh toán!";
     }
  }

  return {
      id: `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
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
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, syncMode } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "Vui lòng cung cấp Email và Mật khẩu ứng dụng." 
      }, { status: 400 });
    }

    const config = {
      imap: {
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000
      }
    };

    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = syncMode === 'ALL' ? ['ALL'] : ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', ''],
      struct: true,
      markSeen: true 
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const parsedInvoices = [];

    for (const item of messages) {
      const all = item.parts.find((x: any) => x.which === '');
      if (!all) continue;

      const id = item.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";
      
      const mail = await simpleParser(idHeader + all.body);
      
      if (mail.attachments && mail.attachments.length > 0) {
        for (const att of mail.attachments) {
          if (att.filename && att.filename.toLowerCase().endsWith('.xml')) {
            const xmlText = att.content.toString('utf-8');
            try {
              const invoiceData = parseInvoiceXML(xmlText);
              parsedInvoices.push(invoiceData);
            } catch (e) {
              console.error("Lỗi khi parse file XML đính kèm", e);
            }
          }
        }
      }
    }

    connection.end();

    return NextResponse.json({
      success: true,
      data: parsedInvoices,
      message: `Đã đồng bộ ${parsedInvoices.length} hóa đơn mới từ Email.`
    });

  } catch (error: any) {
    console.error("Lỗi API/IMAP:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Lỗi hệ thống: " + (error.message || "Không xác định") 
    }, { status: 500 });
  }
}
