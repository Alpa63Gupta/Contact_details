const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
  orders: "sweet-shop-pos:orders",
  expenses: "sweet-shop-pos:expenses",
  ledgerEntries: "sweet-shop-pos:ledger-entries",
  transferHistory: "sweet-shop-pos:transfer-history",
};

const elements = {
  date: document.querySelector("#todayReportDate"),
  downloadPdf: document.querySelector("#downloadTodayReportPdf"),
  print: document.querySelector("#printTodayReport"),
  summary: document.querySelector("#todayReportSummary"),
  saleBreakdown: document.querySelector("#todaySaleBreakdown"),
  paymentBreakdown: document.querySelector("#todayPaymentBreakdown"),
  itemSales: document.querySelector("#todayItemSales"),
  expenses: document.querySelector("#todayExpenses"),
  ledgerEntries: document.querySelector("#todayLedgerEntries"),
  stockTransfers: document.querySelector("#todayStockTransfers"),
};

const params = new URLSearchParams(window.location.search);
const selectedDate = getDateParam(params.get("date")) || getCurrentDateValue();
const shouldMakePdf = params.get("pdf") === "1";

const state = {
  today: selectedDate,
  products: [],
  orders: [],
  expenses: [],
  ledgerEntries: [],
  transferHistory: [],
  didAutoDownload: false,
};

initialize();

async function initialize() {
  bindEvents();
  await hydrateState();
  startLiveSync();
  render();
  if (shouldMakePdf) {
    setTimeout(autoDownloadPdf, 350);
  }
}

function bindEvents() {
  elements.print.addEventListener("click", () => window.print());
  elements.downloadPdf.addEventListener("click", downloadPdf);
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.products]: [],
    [STORAGE_KEYS.orders]: [],
    [STORAGE_KEYS.expenses]: [],
    [STORAGE_KEYS.ledgerEntries]: [],
    [STORAGE_KEYS.transferHistory]: [],
  });

  state.products = stored[STORAGE_KEYS.products] || [];
  state.orders = stored[STORAGE_KEYS.orders] || [];
  state.expenses = stored[STORAGE_KEYS.expenses] || [];
  state.ledgerEntries = stored[STORAGE_KEYS.ledgerEntries] || [];
  state.transferHistory = stored[STORAGE_KEYS.transferHistory] || [];
}

function startLiveSync() {
  window.PosDb.watch(Object.values(STORAGE_KEYS), (values) => {
    state.products = values[STORAGE_KEYS.products] || [];
    state.orders = values[STORAGE_KEYS.orders] || [];
    state.expenses = values[STORAGE_KEYS.expenses] || [];
    state.ledgerEntries = values[STORAGE_KEYS.ledgerEntries] || [];
    state.transferHistory = values[STORAGE_KEYS.transferHistory] || [];
    render();
  });
}

function getReportData() {
  const orders = state.orders.filter((order) => matchesToday(order.createdAt));
  const expenses = state.expenses.filter((expense) => matchesToday(expense.createdAt));
  const ledgerEntries = state.ledgerEntries.filter((entry) => matchesToday(entry.createdAt));
  const transferHistory = state.transferHistory.filter((entry) => matchesToday(entry.createdAt));
  const itemStats = getItemStats(orders);
  const paymentTotals = getPaymentTotals(orders);
  const totals = {
    subtotal: sumBy(orders, "subtotal"),
    discount: sumBy(orders, "discount"),
    tax: sumBy(orders, "tax"),
    totalSale: sumBy(orders, "total"),
    totalExpense: sumBy(expenses, "amount"),
  };
  totals.netAmount = totals.totalSale - totals.totalExpense;
  totals.quantitySold = itemStats.reduce((sum, item) => sum + item.quantitySold, 0);

  return { orders, expenses, ledgerEntries, transferHistory, itemStats, paymentTotals, totals };
}

function render() {
  const report = getReportData();
  elements.date.textContent = formatDisplayDate(state.today);
  renderSummary(report);
  renderSaleBreakdown(report);
  renderPaymentBreakdown(report.paymentTotals);
  renderItemSales(report.itemStats);
  renderExpenses(report.expenses);
  renderLedgerEntries(report.ledgerEntries);
  renderStockTransfers(report.transferHistory);
}

function renderSummary(report) {
  elements.summary.innerHTML = `
    <article class="stat-card">
      <span>Total Sale</span>
      <strong>${formatCurrency(report.totals.totalSale)}</strong>
    </article>
    <article class="stat-card">
      <span>Total Expense</span>
      <strong>${formatCurrency(report.totals.totalExpense)}</strong>
    </article>
    <article class="stat-card">
      <span>Net Amount</span>
      <strong>${formatCurrency(report.totals.netAmount)}</strong>
    </article>
    <article class="stat-card">
      <span>Bills</span>
      <strong>${report.orders.length}</strong>
    </article>
    <article class="stat-card">
      <span>Discount</span>
      <strong>${formatCurrency(report.totals.discount)}</strong>
    </article>
    <article class="stat-card">
      <span>Qty Sold</span>
      <strong>${formatNumber(report.totals.quantitySold)}</strong>
    </article>
  `;
}

function renderSaleBreakdown(report) {
  const rows = [
    ["Subtotal", report.totals.subtotal],
    ["Discount", report.totals.discount],
    ["Tax", report.totals.tax],
    ["Total Sale", report.totals.totalSale],
    ["Expenses", report.totals.totalExpense],
    ["Net Amount", report.totals.netAmount],
  ];

  elements.saleBreakdown.innerHTML = rows
    .map(
      ([label, value]) => `
        <article class="summary report-breakdown-card">
          <div class="summary-row">
            <span>${escapeHtml(label)}</span>
            <strong>${formatCurrency(value)}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPaymentBreakdown(paymentTotals) {
  elements.paymentBreakdown.innerHTML = ["Cash", "Card", "UPI", "Credit", "Split Bill"]
    .map(
      (method) => `
        <article class="stat-card">
          <span>${escapeHtml(method)}</span>
          <strong>${formatCurrency(paymentTotals[method] || 0)}</strong>
        </article>
      `
    )
    .join("");
}

function renderItemSales(items) {
  if (!items.length) {
    elements.itemSales.innerHTML = `<div class="empty-state">No item sales today.</div>`;
    return;
  }

  elements.itemSales.innerHTML = `
    <div class="report-compact-grid item-sold-grid">
      ${items
        .map(
          (item) => `
            <article class="report-mini-card">
              <div class="report-mini-card__title">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.category)}</span>
              </div>
              <div class="report-mini-pairs">
                <span>Qty</span>
                <strong>${formatNumber(item.quantitySold)} ${escapeHtml(item.unit)}</strong>
                <span>Sales</span>
                <strong>${formatCurrency(item.salesAmount)}</strong>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderExpenses(expenses) {
  if (!expenses.length) {
    elements.expenses.innerHTML = `<div class="empty-state">No expenses today.</div>`;
    return;
  }
  elements.expenses.innerHTML = renderTable(
    ["Time", "Expense", "Notes", "By", "Amount"],
    expenses.map((expense) => [
      formatTime(expense.createdAt),
      expense.title,
      expense.notes || "-",
      expense.createdBy || "Unknown",
      formatCurrency(expense.amount),
    ])
  );
}

function renderLedgerEntries(entries) {
  if (!entries.length) {
    elements.ledgerEntries.innerHTML = `<div class="empty-state">No ledger entries today.</div>`;
    return;
  }
  elements.ledgerEntries.innerHTML = renderTable(
    ["Time", "Type", "Name", "Entry", "Amount"],
    entries.map((entry) => [
      formatTime(entry.createdAt),
      entry.partyType || "-",
      entry.partyName || "-",
      entry.entryType || "-",
      formatCurrency(entry.amount),
    ])
  );
}

function renderStockTransfers(entries) {
  if (!entries.length) {
    elements.stockTransfers.innerHTML = `<div class="empty-state">No stock transfer entries today.</div>`;
    return;
  }
  elements.stockTransfers.innerHTML = renderTable(
    ["Time", "Item", "Type", "Qty", "Status"],
    entries.map((entry) => [
      formatTime(entry.createdAt),
      entry.productName || "-",
      entry.transferType || "-",
      `${formatNumber(entry.quantity)} ${entry.unit || ""}`.trim(),
      entry.status || "-",
    ])
  );
}

function renderTable(headers, rows) {
  return `
    <table class="report-table">
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

function getItemStats(orders) {
  const salesByItem = new Map();
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.id || item.name;
      const existing = salesByItem.get(key) || {
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantitySold: 0,
        salesAmount: 0,
      };
      existing.quantitySold += Number(item.quantity || 0);
      existing.salesAmount += Number(item.amount ?? item.price * item.quantity ?? 0);
      salesByItem.set(key, existing);
    });
  });

  return [...salesByItem.values()]
    .map((item) => {
      const product = state.products.find((productItem) => productItem.id === item.id);
      return {
        ...item,
        category: product?.category || "Unknown",
      };
    })
    .sort((left, right) => right.quantitySold - left.quantitySold);
}

function getPaymentTotals(orders) {
  return orders.reduce((totals, order) => {
    if (order.paymentMethod === "Split Bill" && order.paymentBreakdown) {
      Object.entries(order.paymentBreakdown).forEach(([method, amount]) => {
        totals[method] = (totals[method] || 0) + Number(amount || 0);
      });
      totals["Split Bill"] = (totals["Split Bill"] || 0) + Number(order.total || 0);
      return totals;
    }
    totals[order.paymentMethod] = (totals[order.paymentMethod] || 0) + Number(order.total || 0);
    return totals;
  }, {});
}

function downloadPdf() {
  const report = getReportData();
  const bytes = buildTodayReportPdf(report);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Ramesh-sweets-Today-All-Report-${state.today}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function autoDownloadPdf() {
  if (state.didAutoDownload) {
    return;
  }
  state.didAutoDownload = true;
  downloadPdf();
}

function buildTodayReportPdf(report) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const lineHeight = 14;
  const bottom = 42;
  const pages = [];
  let lines = [];
  let y = pageHeight - margin;

  function addLine(text, size = 10) {
    if (y < bottom) {
      pages.push(lines);
      lines = [];
      y = pageHeight - margin;
    }
    lines.push({ text: sanitizePdfText(text), x: margin, y, size });
    y -= lineHeight;
  }

  function addWrapped(text, size = 9, maxLength = 86) {
    wrapPdfLine(text, maxLength).forEach((line) => addLine(line, size));
  }

  addLine("Ramesh sweets", 18);
  addLine("Today All Report", 14);
  addLine(`Date: ${state.today}`, 10);
  addLine(" ");
  addLine(`Total Sale: ${formatPdfCurrency(report.totals.totalSale)}`, 10);
  addLine(`Subtotal: ${formatPdfCurrency(report.totals.subtotal)}`, 10);
  addLine(`Discount: ${formatPdfCurrency(report.totals.discount)}`, 10);
  addLine(`Tax: ${formatPdfCurrency(report.totals.tax)}`, 10);
  addLine(`Expenses: ${formatPdfCurrency(report.totals.totalExpense)}`, 10);
  addLine(`Net Amount: ${formatPdfCurrency(report.totals.netAmount)}`, 10);
  addLine(`Bills: ${report.orders.length}`, 10);
  addLine(" ");
  addSection("Payment Breakdown");
  ["Cash", "Card", "UPI", "Credit", "Split Bill"].forEach((method) => {
    addLine(`${method}: ${formatPdfCurrency(report.paymentTotals[method] || 0)}`, 9);
  });
  addSection("Item Quantity Sold");
  addLinesOrEmpty(report.itemStats, (item) => `${item.name} | Qty ${formatNumber(item.quantitySold)} ${item.unit || ""} | Sales ${formatPdfCurrency(item.salesAmount)}`);
  addSection("Expense Details");
  addLinesOrEmpty(report.expenses, (expense) => `${formatTime(expense.createdAt)} | ${expense.title || "-"} | ${formatPdfCurrency(expense.amount)} | ${expense.notes || "-"} | ${expense.createdBy || "Unknown"}`);
  addSection("Ledger Entries");
  addLinesOrEmpty(report.ledgerEntries, (entry) => `${formatTime(entry.createdAt)} | ${entry.partyType || "-"} | ${entry.partyName || "-"} | ${entry.entryType || "-"} | ${formatPdfCurrency(entry.amount)} | ${entry.notes || "-"}`);
  addSection("Stock Transfer Entries");
  addLinesOrEmpty(report.transferHistory, (entry) => `${formatTime(entry.createdAt)} | ${entry.productName || "-"} | ${entry.transferType || "-"} | ${formatNumber(entry.quantity)} ${entry.unit || ""} | ${entry.status || "-"}`);

  pages.push(lines);
  return createPdfBytes(pages, pageWidth, pageHeight);

  function addSection(title) {
    addLine(" ");
    addLine(title, 12);
    addLine("------------------------------------------------------------", 9);
  }

  function addLinesOrEmpty(items, getText) {
    if (!items.length) {
      addLine("No entries", 9);
      return;
    }
    items.forEach((item) => addWrapped(getText(item), 9));
  }
}

function createPdfBytes(pages, pageWidth, pageHeight) {
  const objects = [];
  const pageObjectIds = [];
  const fontObjectId = 3;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "";
  objects[fontObjectId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const contentObjectId = 4 + index * 2;
    const pageObjectId = contentObjectId + 1;
    pageObjectIds.push(pageObjectId);
    const stream = pageLines
      .map((line) => `BT /F1 ${line.size} Tf ${line.x} ${line.y} Td (${escapePdfString(line.text)}) Tj ET`)
      .join("\n");
    objects[contentObjectId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Uint8Array([...pdf].map((char) => char.charCodeAt(0)));
}

function wrapPdfLine(text, maxLength) {
  const words = sanitizePdfText(text).split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = next;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines;
}

function matchesToday(value) {
  return getDateKey(value) === state.today;
}

function getDateKey(value) {
  if (!value) {
    return "";
  }
  const directDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (directDate) {
    return directDate;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function sumBy(items, key) {
  return items.reduce((sum, item) => sum + Number(item[key] || 0), 0);
}

function getCurrentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getDateParam(value) {
  return String(value || "").match(/^\d{4}-\d{2}-\d{2}$/)?.[0] || "";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPdfCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-";
}

function formatDisplayDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sanitizePdfText(value) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfString(value) {
  return sanitizePdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
