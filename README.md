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

## Cấu hình Google Custom Search trên BACKEND (chi tiết)

Ở bản server này, khoá nằm trong file `.env` phía máy chủ. Frontend **không hỏi** và
**không nhìn thấy** khoá — trình duyệt chỉ gọi `/api/search`, còn server mới gọi Google.

Cần lấy **2 giá trị**: `GOOGLE_API_KEY` và `GOOGLE_CX`.

### Bước 1 — Tạo API Key (GOOGLE_API_KEY)

1. Mở [Google Cloud Console](https://console.cloud.google.com/) và đăng nhập.
2. Tạo project mới: thanh trên cùng → menu chọn project → **New Project** → đặt tên
   (VD: `price-lookup`) → **Create**. Chọn đúng project vừa tạo.
3. Bật API: mở
   [**Custom Search API**](https://console.cloud.google.com/apis/library/customsearch.googleapis.com)
   → bấm **Enable**.
4. Tạo khoá: vào [**APIs & Services → Credentials**](https://console.cloud.google.com/apis/credentials)
   → **+ Create credentials** → **API key**. Copy chuỗi dạng `AIzaSy...` → đây là `GOOGLE_API_KEY`.
5. *(Khuyến nghị)* Giới hạn khoá cho an toàn: bấm **Edit** khoá vừa tạo →
   **API restrictions** → **Restrict key** → chỉ tick **Custom Search API** → **Save**.
   (Vì chạy ở backend, KHÔNG dùng "HTTP referrers"; nếu server có IP tĩnh có thể chọn
   *Application restrictions → IP addresses* và điền IP máy chủ.)

### Bước 2 — Tạo Search Engine ID (GOOGLE_CX)

1. Mở [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/create).
2. Đặt tên engine; ở phần *What to search* chọn **Search the entire web** (tìm toàn bộ web).
3. **Create**. Vào engine → tab **Overview / Basic** → copy **Search engine ID**
   (chuỗi dạng `a1b2c3d4e5...`) → đây là `GOOGLE_CX`.
4. *(Tuỳ chọn)* Bật **Image search** / **SafeSearch** nếu muốn.

### Bước 3 — Đưa khoá vào backend (.env)

```bash
cp .env.example .env
```

Mở `.env`, điền 2 giá trị vừa lấy:

```
GOOGLE_API_KEY=AIzaSy....................
GOOGLE_CX=a1b2c3d4e5....................
PORT=3000
```

> `.env` đã nằm trong `.gitignore` nên **không bị đẩy lên GitHub**. Không bao giờ commit khoá thật.

### Bước 4 — Kiểm tra đã cấu hình đúng

Chạy server (mục [Chạy](#chạy)) rồi mở:

```
http://localhost:3000/api/health
```

Nếu trả `{"ok":true,"configured":true}` là backend đã nhận khoá. Nếu `configured:false`
nghĩa là chưa đọc được `.env` (kiểm tra lại tên biến / vị trí file / đã khởi động lại server chưa).

> Gói miễn phí: **100 lượt tìm/ngày**. Vượt hạn mức sẽ tính phí (bật billing trong Cloud Console).

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
