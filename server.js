import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookup } from "./lib/search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/search", async (req, res) => {
  const input = (req.query.q || "").toString().trim();
  if (!input) {
    return res.status(400).json({ error: "Thiếu tham số tìm kiếm 'q'." });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  if (!apiKey || !cx) {
    return res.status(500).json({
      error:
        "Chưa cấu hình GOOGLE_API_KEY và GOOGLE_CX. Hãy sao chép .env.example thành .env và điền khoá.",
    });
  }

  try {
    const data = await lookup({ input, apiKey, cx });
    res.json(data);
  } catch (err) {
    console.error("Lỗi tra cứu:", err.message);
    res.status(err.status && err.status < 600 ? err.status : 502).json({
      error: err.message || "Lỗi khi gọi Google Search.",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX),
  });
});

app.listen(PORT, () => {
  console.log(`Tra cứu giá thị trường đang chạy: http://localhost:${PORT}`);
});
