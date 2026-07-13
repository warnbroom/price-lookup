const form = document.getElementById("search-form");
const input = document.getElementById("q");
const btn = document.getElementById("submit-btn");
const typeHint = document.getElementById("type-hint");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const resultsEl = document.getElementById("results");

const fmtVND = (n) => n.toLocaleString("vi-VN") + " ₫";

// Đoán loại input ngay khi gõ để hiển thị gợi ý (khớp logic backend).
function detectType(raw) {
  const cleaned = String(raw).replace(/[\s-]/g, "");
  return /^\d+$/.test(cleaned) && [8, 12, 13, 14].includes(cleaned.length)
    ? "barcode"
    : "name";
}

input.addEventListener("input", () => {
  const v = input.value.trim();
  if (!v) {
    typeHint.innerHTML = "";
    return;
  }
  if (detectType(v) === "barcode") {
    typeHint.innerHTML = `<span class="badge barcode">BARCODE</span> Sẽ tìm chính xác theo mã.`;
  } else {
    typeHint.innerHTML = `<span class="badge name">TÊN HÀNG</span> Sẽ tìm gần đúng theo tên.`;
  }
});

function setStatus(msg, isError = false) {
  if (!msg) {
    statusEl.hidden = true;
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

function renderSummary(data) {
  if (!data.stats) {
    summaryEl.hidden = true;
    return;
  }
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

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

function renderResults(data) {
  resultsEl.innerHTML = "";
  if (!data.results.length) {
    setStatus("Không tìm thấy kết quả nào.", false);
    return;
  }
  for (const r of data.results) {
    const el = document.createElement("article");
    el.className = "result";
    const priceTags = r.prices
      .map((p) => `<span class="price-tag">${fmtVND(p)}</span>`)
      .join("");
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
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Có lỗi xảy ra.", true);
      return;
    }
    setStatus(null);
    renderSummary(data);
    renderResults(data);
  } catch (err) {
    setStatus("Không kết nối được máy chủ: " + err.message, true);
  } finally {
    btn.disabled = false;
  }
});
