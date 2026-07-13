// Lõi tra cứu: phát hiện loại input, gọi Google Custom Search, trích xuất giá.

/**
 * Phát hiện input có phải barcode hay không.
 * Barcode hợp lệ: chỉ gồm chữ số, độ dài 8 (EAN-8), 12 (UPC-A),
 * 13 (EAN-13) hoặc 14 (ITF-14). Cho phép người dùng gõ kèm khoảng trắng/gạch.
 */
export function detectInputType(raw) {
  const cleaned = String(raw).replace(/[\s-]/g, "");
  const isBarcode = /^\d+$/.test(cleaned) && [8, 12, 13, 14].includes(cleaned.length);
  return {
    type: isBarcode ? "barcode" : "name",
    value: isBarcode ? cleaned : String(raw).trim(),
  };
}

/**
 * Trích các mức giá (VND) từ một đoạn text tiếng Việt.
 * Bắt các dạng: "1.500.000đ", "1.500.000 VND", "₫1,500,000", "1500000 đồng".
 * Trả về mảng số (đã chuẩn hoá) đã lọc trùng và loại giá trị vô lý.
 */
export function extractPrices(text) {
  if (!text) return [];
  const prices = new Set();

  // Dạng: số có phân tách hàng nghìn + đơn vị tiền phía sau.
  // Lookahead (?![\p{L}\d]) để "đ" không dính vào từ khác như "đến", "đô".
  const after = /(\d{1,3}(?:[.,]\d{3})+)\s*(?:₫|vn[đd]|đồng|đ)(?![\p{L}\d])/giu;
  // Dạng: ký hiệu tiền phía trước + số
  const before = /(?:₫|đ)\s*(\d{1,3}(?:[.,]\d{3})+)/giu;

  for (const re of [after, before]) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const num = Number(m[1].replace(/[.,]/g, ""));
      if (Number.isFinite(num) && num >= 1000 && num <= 5_000_000_000) {
        prices.add(num);
      }
    }
  }
  return [...prices].sort((a, b) => a - b);
}

/** Định dạng số thành chuỗi giá VND: 1500000 -> "1.500.000 ₫" */
export function formatVND(n) {
  return n.toLocaleString("vi-VN") + " ₫";
}

/** Đọc giá từ pagemap (dữ liệu có cấu trúc Google trả về, nếu có). */
function pricesFromPagemap(pagemap = {}) {
  const out = [];
  const buckets = [
    ...(pagemap.offer || []),
    ...(pagemap.product || []),
    ...(pagemap.aggregateoffer || []),
  ];
  for (const b of buckets) {
    const raw = b.price ?? b.lowprice ?? b.highprice;
    if (raw == null) continue;
    const num = Number(String(raw).replace(/[^\d]/g, ""));
    if (Number.isFinite(num) && num >= 1000) out.push(num);
  }
  return out;
}

/**
 * Gọi Google Custom Search API và chuẩn hoá kết quả.
 * @param {object} opts
 * @param {string} opts.query   - Chuỗi truy vấn gửi lên Google
 * @param {string} opts.apiKey  - GOOGLE_API_KEY
 * @param {string} opts.cx      - GOOGLE_CX
 * @param {number} [opts.num]   - Số kết quả (tối đa 10)
 */
export async function googleSearch({ query, apiKey, cx, num = 10 }) {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(num, 10)));
  url.searchParams.set("gl", "vn"); // ưu tiên kết quả Việt Nam
  url.searchParams.set("hl", "vi");

  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || "";
    } catch { /* bỏ qua */ }
    const err = new Error(detail || `Google API lỗi HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const items = data.items || [];

  return items.map((it) => {
    const textForPrice = `${it.title || ""} ${it.snippet || ""}`;
    const prices = [
      ...pricesFromPagemap(it.pagemap),
      ...extractPrices(textForPrice),
    ]
      .filter((n) => n >= 1000 && n <= 5_000_000_000)
      .sort((a, b) => a - b);
    const uniquePrices = [...new Set(prices)];

    return {
      title: it.title,
      link: it.link,
      displayLink: it.displayLink,
      snippet: it.snippet,
      thumbnail: it.pagemap?.cse_thumbnail?.[0]?.src || null,
      prices: uniquePrices,
    };
  });
}

/**
 * Điểm vào chính: nhận input thô, quyết định cách tìm, trả kết quả + thống kê giá.
 */
export async function lookup({ input, apiKey, cx }) {
  const { type, value } = detectInputType(input);

  // Barcode -> tìm chính xác theo mã. Tên -> tìm gần đúng + gợi ý về giá.
  const query =
    type === "barcode"
      ? `"${value}" giá`
      : `${value} giá bao nhiêu`;

  const results = await googleSearch({ query, apiKey, cx });

  const allPrices = results.flatMap((r) => r.prices);
  const stats = allPrices.length
    ? {
        count: allPrices.length,
        min: Math.min(...allPrices),
        max: Math.max(...allPrices),
        median: median(allPrices),
      }
    : null;

  return { type, value, query, results, stats };
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
