import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

async function generateWithFallback(prompt: string): Promise<any> {
  const keysStr = process.env.GEMINI_API_KEYS || "";
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error("Chua cau hinh GEMINI_API_KEYS");
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  for (const key of keys) {
    for (const model of MODELS) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const res = await ai.models.generateContent({ model, contents: prompt });
        const raw = res.text?.replace(/```json|```/g, '').trim() || '{}';
        return JSON.parse(raw);
      } catch (err: any) {
        console.warn(`[AI Fallback] ${model} failed:`, err.message?.slice(0, 80));
      }
    }
  }
  throw new Error("Tat ca model AI deu that bai");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      campaignName,
      campaignDesc,
      products,
      targetSegment,
      channels,
      timeline,
      budget,
    } = body;

    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const prompt = `Bạn là chuyên gia phân tích thị trường cấp cao trong ngành Kitchen & Bath (K&B) tại Việt Nam, với hơn 15 năm kinh nghiệm. Thời điểm phân tích: ${now}.

Hãng thiết bị vệ sinh cao cấp Seajong (Hàn Quốc/Việt Nam) đang lên kế hoạch triển khai chiến dịch sau:
- Tên chiến dịch: ${campaignName || "Chưa đặt tên"}
- Mô tả: ${campaignDesc || "Không có"}
- Nhóm sản phẩm trọng tâm: ${products?.join(', ') || "Chưa xác định"}
- Phân khúc mục tiêu: ${targetSegment || "Chưa xác định"}
- Kênh phân phối: ${channels?.join(', ') || "Chưa xác định"}
- Timeline dự kiến: ${timeline || "Chưa xác định"}
- Ngân sách ước tính: ${budget || "Chưa xác định"}

===== FRAMEWORK PHÂN TÍCH CHUYÊN GIA K&B =====

I. CÁC CHỈ SỐ DỮ LIỆU CẦN PHÂN TÍCH (Cho thương hiệu Seajong):
- Định vị Seajong: Cần bám sát định vị cao cấp, công nghệ thông minh, thiết kế hiện đại của Seajong. Đánh giá tính khả thi khi cạnh tranh với các ông lớn TOTO, Inax, Grohe...
- Phân khúc thị trường: Bình dân (Local/China brands), Trung cấp (Inax, American Standard), Cao cấp (TOTO, Grohe), Hạng sang (Kohler, Duravit, Gessi) → Xác định đại dương xanh, Gap analysis cho Seajong
- Sản phẩm chủ đạo: Smart Toilet, Vòi sen âm tường (Minimalism), Chậu rửa tích hợp, Thiết bị PVD màu (Gold/Rose Gold/Black Chrome) → Xu hướng thẩm mỹ và công nghệ dẫn dắt dòng tiền
- Đối thủ: Độ phủ Showroom, chiết khấu đại lý (25-45%), tần suất khuyến mãi, bảo hành → Chiến lược giá và kênh phân phối
- Hành vi KH: Tỷ lệ mua combo, ảnh hưởng KTS/Nhà thầu (60-70% đơn cao cấp), mua qua video review/livestream → Tối ưu phễu bán hàng
- Chuỗi cung ứng: Tỷ giá, thuế nhập khẩu TQ/EU, thời gian thông quan, giá đồng LME, inox 304 → Biên lợi nhuận và kế hoạch nhập hàng

II. PHƯƠNG PHÁP THU THẬP (để AI suy luận từ):
- Dữ liệu hải quan: HS Code 6910 (gốm), 7324 (sắt/thép) → volume nhập của đối thủ
- Digital Audit: SimilarWeb traffic, Facebook Ad Library → quảng cáo đối thủ đang chạy
- Báo cáo VABM, VICA, niêm yết công ty lớn
- "Người gác cổng" KTS/Nhà thầu → tiêu chuẩn kỹ thuật, mức chiết khấu kỳ vọng
- Mystery Shopping → quy trình tư vấn, chiết khấu cuối cho khách lẻ
- Social Listening: Facebook Groups (Nghiện Nhà, Yêu Bếp) → sentiment, feature wish-list

III. HỆ THỐNG CẢNH BÁO SỚM (EWS) VÀ DỰ BÁO:
- EWS: Inventory Turnover tăng 20% liên tiếp 2 tháng → bão hòa; Lead Time tăng → đứt chuỗi; Giá đồng LME tăng >10% → vòi sen tăng giá sau 3-6 tháng
- Dự báo 2026-2028: Smart & Touchless (giọng nói TV/radar), Wellness/Home Spa (Chromotherapy, lọc nước tại vòi), Eco-Friendly (LEED/LOTUS) bùng nổ ở căn hộ cao cấp và khách sạn

===== YÊU CẦU ĐẦU RA =====
Dựa trên thông tin chiến dịch và framework trên, hãy tạo báo cáo phân tích chiến lược CHUYÊN SÂU và CỤ THỂ cho chiến dịch này.
Trả về JSON thuần (không markdown, không giải thích):

{
  "executiveSummary": "Tóm tắt điều hành 3-4 câu: đánh giá tổng thể cơ hội và mức độ khả thi của chiến dịch này trong bối cảnh thị trường K&B Việt Nam 2026",
  "opportunityScore": 82,
  "riskLevel": "Trung bình",

  "marketFit": {
    "assessment": "Đánh giá mức độ phù hợp của chiến dịch với thị trường hiện tại (1 đoạn)",
    "gapOpportunity": "Khoảng trống/đại dương xanh cụ thể mà chiến dịch này có thể khai thác",
    "targetSegmentAnalysis": "Phân tích chi tiết phân khúc mục tiêu: quy mô ước tính, tốc độ tăng trưởng, đặc điểm",
    "seasonality": "Tính mùa vụ và thời điểm trong năm phù hợp nhất để tung chiến dịch này"
  },

  "productInsights": {
    "trendAlignment": "Mức độ bắt kịp xu hướng 2026-2028 của sản phẩm được chọn",
    "uniqueSellingPoints": ["USP cần nhấn mạnh 1", "USP 2", "USP 3"],
    "pricingStrategy": "Chiến lược giá gợi ý dựa trên benchmark thị trường (chiết khấu, combo, PVD premium...)",
    "productRisks": ["Rủi ro sản phẩm 1", "Rủi ro 2"]
  },

  "competitorIntel": {
    "keyThreats": [
      { "brand": "Tên thương hiệu", "threat": "Mô tả mối đe dọa cụ thể", "level": "Cao | Trung bình | Thấp" }
    ],
    "competitiveAdvantage": "Lợi thế cạnh tranh có thể khai thác so với đối thủ trong chiến dịch này",
    "discountBenchmark": "Mức chiết khấu tham chiếu ngành phù hợp với phân khúc mục tiêu",
    "counterStrategy": "Chiến thuật đối phó cụ thể với đối thủ mạnh nhất trong phân khúc"
  },

  "channelStrategy": {
    "primaryChannel": { "name": "Kênh ưu tiên số 1", "reason": "Lý do cụ thể", "tactics": ["Chiến thuật 1", "Chiến thuật 2"], "icon": "bi-shop" },
    "secondaryChannels": [
      { "name": "Kênh 2", "role": "Vai trò trong mix kênh", "icon": "bi-camera-video" }
    ],
    "ktsInfluenceStrategy": "Chiến lược tiếp cận KTS/Nhà thầu nếu relevant",
    "contentRecommendations": ["Loại nội dung ưu tiên 1", "Loại nội dung 2", "Loại nội dung 3"]
  },

  "customerJourney": {
    "targetBuyer": "Chân dung khách hàng mục tiêu chi tiết",
    "decisionTriggers": ["Yếu tố kích hoạt quyết định mua 1", "Yếu tố 2"],
    "objections": ["Rào cản/phản đối thường gặp 1", "Rào cản 2"],
    "conversionTactics": ["Chiến thuật chuyển đổi 1", "Chiến thuật 2"]
  },

  "supplyChainAlert": {
    "overallRisk": "Thấp | Trung bình | Cao",
    "alerts": [
      { "factor": "Tên yếu tố rủi ro", "impact": "Tác động cụ thể đến chiến dịch này", "action": "Hành động khuyến nghị", "urgency": "Ngay | Trong 1 tháng | Theo dõi" }
    ],
    "procurementAdvice": "Lời khuyên nhập hàng/tồn kho cụ thể cho timeline chiến dịch"
  },

  "earlyWarningSignals": [
    { "signal": "Tên chỉ số cần theo dõi", "threshold": "Ngưỡng cảnh báo cụ thể", "action": "Hành động khi chạm ngưỡng", "frequency": "Theo dõi hàng tuần | tháng" }
  ],

  "trendForecast": [
    { "trend": "Tên xu hướng 2026-2028 liên quan", "relevance": "Mức độ liên quan đến chiến dịch này", "opportunity": "Cơ hội cụ thể", "timeline": "Khi nào xu hướng này đạt đỉnh" }
  ],

  "actionPlan": {
    "immediate": ["Hành động ngay (0-2 tuần) 1", "Hành động 2", "Hành động 3"],
    "shortTerm": ["Hành động ngắn hạn (1-3 tháng) 1", "Hành động 2"],
    "longTerm": ["Hành động dài hạn (3-12 tháng) 1", "Hành động 2"],
    "budget": "Gợi ý tổng quan về cách phân bổ ngân sách",
    "budgetAllocation": [
      { "channel": "Tên kênh/hạng mục", "percentage": 45 },
      { "channel": "Kênh khác", "percentage": 55 }
    ]
  },

  "finalVerdict": "Kết luận cuối cùng 2-3 câu: Có nên triển khai chiến dịch này không? Điều kiện tiên quyết để thành công là gì?"
}`;

    const data = await generateWithFallback(prompt);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[/api/market-analysis] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
