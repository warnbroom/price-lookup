# Tra cứu giá thị trường 💰

Website tra cứu giá thị trường online. Nhập **barcode** hoặc **tên hàng hoá**, hệ thống tìm trên **Google Custom Search** và tổng hợp khoảng giá tham khảo.

- Input là **barcode** (8/12/13/14 chữ số) → tìm **chính xác** theo mã.
- Input là **tên hàng hoá** → tìm **gần đúng** theo tên.

## Cài đặt

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
