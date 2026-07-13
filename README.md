# Tra cứu giá thị trường 💰

Website tra cứu giá thị trường online. Nhập **barcode** hoặc **tên hàng hoá**, hệ thống tìm trên **Google Custom Search** và tổng hợp khoảng giá tham khảo.

- Input là **barcode** (8/12/13/14 chữ số) → tìm **chính xác** theo mã.
- Input là **tên hàng hoá** → tìm **gần đúng** theo tên.

## 🔗 Dùng ngay (GitHub Pages)

**https://warnbroom.github.io/price-lookup/**

Bản này chạy hoàn toàn trong trình duyệt. Lần đầu vào, bấm **⚙️ Cấu hình khoá Google**,
nhập **API Key** + **Search Engine ID** (xem cách lấy bên dưới). Khoá chỉ lưu trong
localStorage của máy bạn, **không** nằm trong mã nguồn.

> ⚠️ Vì key được dùng ở phía trình duyệt, hãy vào Google Cloud Console → API key →
> *Application restrictions* → **HTTP referrers**, thêm `warnbroom.github.io/*` để giới hạn.

Ngoài ra vẫn có **bản chạy server (Node/Express)** dưới đây nếu muốn giấu key phía backend.

## Cài đặt (bản server)

```bash
cd price-lookup
npm install
```

## Cấu hình Google Custom Search (bắt buộc)

1. **API Key**: vào [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
   bật **Custom Search API**, tạo một **API key**.
2. **Search Engine ID (cx)**: vào [Programmable Search Engine](https://programmablesearchengine.google.com/),
   tạo một engine (chọn *Search the entire web*), lấy **Search engine ID**.
3. Sao chép `.env.example` thành `.env` và điền:

```bash
cp .env.example .env
```

```
GOOGLE_API_KEY=xxxxxxxx
GOOGLE_CX=yyyyyyyy
PORT=3000
```

> Gói miễn phí: 100 lượt tìm/ngày. Vượt hạn mức sẽ tính phí.

## Chạy

```bash
npm start          # hoặc: npm run dev  (tự reload)
```

Mở http://localhost:3000

## Cấu trúc

| File | Vai trò |
|------|---------|
| `server.js` | Server Express, route `/api/search` |
| `lib/search.js` | Lõi: phát hiện barcode/tên, gọi Google API, trích xuất giá |
| `public/` | Giao diện (HTML/CSS/JS thuần) |

## Ghi chú

- Giá được trích từ tiêu đề/mô tả và dữ liệu có cấu trúc (pagemap) trong kết quả Google,
  nên **chỉ mang tính tham khảo**, không đảm bảo chính xác 100%.
- Có thể chỉnh câu truy vấn gửi lên Google trong hàm `lookup()` ở `lib/search.js`.
