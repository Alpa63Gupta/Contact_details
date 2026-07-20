const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
};

const elements = {
  outlet: document.querySelector("#stockCheckingOutlet"),
  start: document.querySelector("#startStockChecking"),
  downloadList: document.querySelector("#downloadStockAvailableList"),
  print: document.querySelector("#printStockChecking"),
  summary: document.querySelector("#stockCheckingSummary"),
  total: document.querySelector("#stockCheckingTotal"),
  items: document.querySelector("#stockCheckingItems"),
};

const state = {
  products: [],
  outlets: [],
  activeOutletId: window.PosDb.getActiveOutletId(),
};

initialize();

async function initialize() {
  elements.start.addEventListener("click", () => {
    elements.items.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.downloadList.addEventListener("click", downloadStockAvailableList);
  elements.print.addEventListener("click", () => window.print());
  await hydrateState();
  startLiveSync();
  render();
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.products]: [],
  });
  state.products = stored[STORAGE_KEYS.products] || [];
  state.outlets = await window.PosDb.getOutlets();
  state.activeOutletId = window.PosDb.getActiveOutletId();
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.products], (values) => {
    state.products = values[STORAGE_KEYS.products] || [];
    render();
  });
}

function render() {
  const stockItems = getStockItems();
  const totalStockAmount = stockItems.reduce((sum, item) => sum + item.stockAmount, 0);
  const totalStockUnits = stockItems.reduce((sum, item) => sum + item.stock, 0);
  const lowStockCount = stockItems.filter((item) => item.stock <= Number(item.minStock ?? 5)).length;
  const activeOutlet = state.outlets.find((outlet) => outlet.id === state.activeOutletId);

  elements.outlet.textContent = activeOutlet ? `Outlet: ${activeOutlet.name}` : "Selected outlet";
  elements.summary.innerHTML = `
    <article class="stat-card">
      <span>Total Stock Amount</span>
      <strong>${formatCurrency(totalStockAmount)}</strong>
    </article>
    <article class="stat-card">
      <span>Total Items</span>
      <strong>${stockItems.length}</strong>
    </article>
    <article class="stat-card">
      <span>Total Stock Units</span>
      <strong>${formatNumber(totalStockUnits)}</strong>
    </article>
    <article class="stat-card">
      <span>Low Stock Items</span>
      <strong>${lowStockCount}</strong>
    </article>
  `;

  elements.total.innerHTML = `
    <article class="order-card stock-total-card">
      <div class="order-row">
        <strong>${escapeHtml(activeOutlet?.name || "Selected Outlet")}</strong>
        <strong>${formatCurrency(totalStockAmount)}</strong>
      </div>
      <div class="order-row muted">
        <span>Total available stock amount</span>
        <span>Price x available stock</span>
      </div>
    </article>
  `;

  if (!stockItems.length) {
    elements.items.innerHTML = `<div class="empty-state">No stock items found for this outlet.</div>`;
    return;
  }

  elements.items.innerHTML = renderTable(
    ["Item", "Category", "Stock", "Rate", "Stock Amount"],
    stockItems
      .sort((left, right) => right.stockAmount - left.stockAmount)
      .map((item) => [
        item.name,
        item.category || "-",
        `${formatNumber(item.stock)} ${item.unit || ""}`.trim(),
        formatCurrency(item.price),
        formatCurrency(item.stockAmount),
      ])
  );
}

function getStockItems() {
  return state.products.map((product) => {
    const stock = Number(product.stock || 0);
    const price = Number(product.price || 0);
    return {
      ...product,
      stock,
      price,
      stockAmount: Number((stock * price).toFixed(2)),
    };
  });
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

function downloadStockAvailableList() {
  const activeOutlet = state.outlets.find((outlet) => outlet.id === state.activeOutletId);
  const rows = getStockItems()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => [
      item.name,
      item.category || "",
      `${formatNumber(item.stock)} ${item.unit || ""}`.trim(),
      item.price.toFixed(2),
      item.stockAmount.toFixed(2),
    ]);
  const csv = [
    ["Outlet", activeOutlet?.name || "Selected Outlet"],
    ["Generated At", new Date().toLocaleString("en-IN")],
    [],
    ["Item Name", "Category", "Quantity Available", "Rate", "Amount"],
    ...rows,
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const outletName = activeOutlet?.name || "stock";
  link.href = url;
  link.download = `stock-available-list-${slugify(outletName)}-${getCurrentDateValue()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function slugify(value) {
  return String(value || "stock")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "stock";
}

function getCurrentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
