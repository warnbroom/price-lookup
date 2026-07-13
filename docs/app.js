// Bản GitHub Pages: gọi Google Custom Search API trực tiếp từ trình duyệt.
// Khoá do người dùng nhập, lưu trong localStorage — không nhúng trong mã nguồn.

const LS_KEY = "priceLookup.googleKey";
const LS_CX = "priceLookup.googleCx";

const form = document.getElementById("search-form");
const input = document.getElementById("q");
const btn = document.getElementById("submit-btn");
const typeHint = document.getElementById("type-hint");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const resultsEl = document.getElementById("results");

const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings");
const cfgKey = document.getElementById("cfg-key");
const cfgCx = document.getElementById("cfg-cx");
const cfgSave = document.getElementById("cfg-save");
const cfgClear = document.getElementById("cfg-clear");
const cfgStatus = document.getElementById("cfg-status");

const fmtVND = (n) => n.toLocaleString("vi-VN") + " ₫";
const getKey = () => localStorage.getItem(LS_KEY) || "";
const getCx = () => localStorage.getItem(LS_CX) || "";

/* ---------- Lõi tra cứu (chạy client-side) ---------- */

function detectInputType(raw) {
  const cleaned = String(raw).replace(/[\s-]/g, "");
  const isBarcode = /^\d+$/.test(cleaned) && [8, 12, 13, 14].includes(cleaned.length);
  return { type: isBarcode ? "barcode" : "name", value: isBarcode ? cleaned : String(raw).trim() };
}

function extractPrices(text) {
  if (!text) return [];
  const prices = new Set();
  const after = /(\d{1,3}(?:[.,]\d{3})+)\s*(?:₫|vn[đd]|đồng|đ)(?![\p{L}\d])/giu;
  const before = /(?:₫|đ)\s*(\d{1,3}(?:[.,]\d{3})+)/giu;
  for (const re of [after, before]) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const num = Number(m[1].replace(/[.,]/g, ""));
      if (Number.isFinite(num) && num >= 1000 && num <= 5_000_000_000) prices.add(num);
    }
  }
  return [...prices].sort((a, b) => a - b);
}

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

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function lookup(inputRaw) {
  const apiKey = getKey();
  const cx = getCx();
  if (!apiKey || !cx) {
    const err = new Error("Chưa cấu hình khoá Google. Bấm ⚙️ để nhập API Key và Search Engine ID.");
    err.config = true;
    throw err;
  }

  const { type, value } = detectInputType(inputRaw);
  const query = type === "barcode" ? `"${value}" giá` : `${value} giá bao nhiêu`;

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  url.searchParams.set("gl", "vn");
  url.searchParams.set("hl", "vi");

  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch {}
    throw new Error(detail || `Google API lỗi HTTP ${res.status}`);
  }
  const data = await res.json();
  const items = data.items || [];

  const results = items.map((it) => {
    const prices = [
      ...pricesFromPagemap(it.pagemap),
      ...extractPrices(`${it.title || ""} ${it.snippet || ""}`),
    ].filter((n) => n >= 1000 && n <= 5_000_000_000).sort((a, b) => a - b);
    return {
      title: it.title,
      link: it.link,
      displayLink: it.displayLink,
      snippet: it.snippet,
      thumbnail: it.pagemap?.cse_thumbnail?.[0]?.src || null,
      prices: [...new Set(prices)],
    };
  });

  const allPrices = results.flatMap((r) => r.prices);
  const stats = allPrices.length
    ? { count: allPrices.length, min: Math.min(...allPrices), max: Math.max(...allPrices), median: median(allPrices) }
    : null;

  return { type, value, query, results, stats };
}

/* ---------- Giao diện ---------- */

function detectType(raw) {
  const cleaned = String(raw).replace(/[\s-]/g, "");
  return /^\d+$/.test(cleaned) && [8, 12, 13, 14].includes(cleaned.length) ? "barcode" : "name";
}

input.addEventListener("input", () => {
  const v = input.value.trim();
  if (!v) { typeHint.innerHTML = ""; return; }
  typeHint.innerHTML = detectType(v) === "barcode"
    ? `<span class="badge barcode">BARCODE</span> Sẽ tìm chính xác theo mã.`
    : `<span class="badge name">TÊN HÀNG</span> Sẽ tìm gần đúng theo tên.`;
});

function setStatus(msg, isError = false) {
  if (!msg) { statusEl.hidden = true; return; }
  statusEl.hidden = false;
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderSummary(data) {
  if (!data.stats) { summaryEl.hidden = true; return; }
  const { min, max, median, count } = data.stats;
  summaryEl.hidden = false;
  summaryEl.innerHTML = `
    <h2>Khoảng giá tham khảo (${count} mức giá tìm thấy)</h2>
    <div class="stat-grid">
      <div class="stat"><div class="label">Thấp nhất</div><div class="value">${fmtVND(min)}</div></div>
      <div class="stat"><div class="label">Trung vị</div><div class="value">${fmtVND(median)}</div></div>
      <div class="stat"><div class="label">Cao nhất</div><div class="value">${fmtVND(max)}</div></div>
    </div>`;
}

function renderResults(data) {
  resultsEl.innerHTML = "";
  if (!data.results.length) { setStatus("Không tìm thấy kết quả nào.", false); return; }
  for (const r of data.results) {
    const el = document.createElement("article");
    el.className = "result";
    const priceTags = r.prices.map((p) => `<span class="price-tag">${fmtVND(p)}</span>`).join("");
    el.innerHTML = `
      ${r.thumbnail ? `<img src="${esc(r.thumbnail)}" alt="" loading="lazy" />` : ""}
      <div class="body">
        <a class="title" href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>
        <div class="domain">${esc(r.displayLink)}</div>
        ${r.snippet ? `<p class="snippet">${esc(r.snippet)}</p>` : ""}
        ${priceTags ? `<div class="prices">${priceTags}</div>` : ""}
      </div>`;
    resultsEl.appendChild(el);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;

  btn.disabled = true;
  summaryEl.hidden = true;
  resultsEl.innerHTML = "";
  setStatus("Đang tra cứu…");

  try {
    const data = await lookup(q);
    setStatus(null);
    renderSummary(data);
    renderResults(data);
  } catch (err) {
    setStatus(err.message, true);
    if (err.config) openSettings(true);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Cấu hình khoá ---------- */

function openSettings(force) {
  const willShow = force || settingsPanel.hidden;
  settingsPanel.hidden = !willShow;
  if (willShow) {
    cfgKey.value = getKey();
    cfgCx.value = getCx();
    cfgStatus.textContent = "";
  }
}

settingsBtn.addEventListener("click", () => openSettings());

cfgSave.addEventListener("click", () => {
  const k = cfgKey.value.trim();
  const c = cfgCx.value.trim();
  if (!k || !c) { cfgStatus.textContent = "Cần nhập cả hai."; cfgStatus.style.color = "#ff9b9b"; return; }
  localStorage.setItem(LS_KEY, k);
  localStorage.setItem(LS_CX, c);
  cfgStatus.style.color = "var(--price)";
  cfgStatus.textContent = "Đã lưu ✓";
});

cfgClear.addEventListener("click", () => {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_CX);
  cfgKey.value = "";
  cfgCx.value = "";
  cfgStatus.style.color = "var(--muted)";
  cfgStatus.textContent = "Đã xoá khoá.";
});

// Lần đầu chưa có khoá -> mở sẵn phần cấu hình.
if (!getKey() || !getCx()) openSettings(true);
