const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
  transferHistory: "sweet-shop-pos:transfer-history",
  session: "sweet-shop-pos:session",
};

const elements = {
  resetAllStockButton: document.querySelector("#resetAllStockButton"),
  downloadStockSheetButton: document.querySelector("#downloadStockSheetButton"),
  stockHistoryDateFilter: document.querySelector("#stockHistoryDateFilter"),
  stockHistorySummary: document.querySelector("#stockHistorySummary"),
  stockHistoryList: document.querySelector("#stockHistoryList"),
};

const state = {
  products: [],
  transferHistory: [],
  role: null,
};

initialize();

async function initialize() {
  bindEvents();
  await hydrateState();
  await hydrateSession();
  startLiveSync();
  render();
}

function bindEvents() {
  elements.stockHistoryDateFilter.addEventListener("input", render);
  elements.resetAllStockButton.addEventListener("click", resetAllStock);
  elements.downloadStockSheetButton.addEventListener("click", downloadStockSheet);
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.products]: [],
    [STORAGE_KEYS.transferHistory]: [],
    [STORAGE_KEYS.session]: null,
  });

  state.products = stored[STORAGE_KEYS.products] || [];
  state.transferHistory = stored[STORAGE_KEYS.transferHistory] || [];
  state.role = stored[STORAGE_KEYS.session];
}

async function hydrateSession() {
  try {
    const session = await window.PosDb.getSession();
    state.role = session.user?.role || state.role;
  } catch (error) {
    console.warn("Failed to hydrate stock receive history session", error);
  }
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.products, STORAGE_KEYS.transferHistory], (values) => {
    state.products = values[STORAGE_KEYS.products] || [];
    state.transferHistory = values[STORAGE_KEYS.transferHistory] || [];
    render();
  });
}

function render() {
  renderActions();
  const entries = getFilteredEntries();
  renderSummary(entries);
  renderList(entries);
}

function renderActions() {
  const ownerMode = state.role === "Owner";
  elements.resetAllStockButton.hidden = !ownerMode;
  elements.downloadStockSheetButton.hidden = !ownerMode;
}

function getFilteredEntries() {
  const selectedDate = elements.stockHistoryDateFilter.value;
  return selectedDate
    ? state.transferHistory.filter((entry) => matchesDate(entry.createdAt, selectedDate))
    : state.transferHistory;
}

function renderSummary(entries) {
  const totalEntries = entries.length;
  const totalIn = entries
    .filter((entry) => entry.transferType === "in")
    .reduce((sum, entry) => sum + entry.quantity, 0);
  const totalOut = entries
    .filter((entry) => entry.transferType === "out")
    .reduce((sum, entry) => sum + entry.quantity, 0);

  elements.stockHistorySummary.innerHTML = `
    <div class="summary-row">
      <span>Entries</span>
      <strong>${totalEntries}</strong>
    </div>
    <div class="summary-row">
      <span>Item In</span>
      <strong>${formatNumber(totalIn)}</strong>
    </div>
    <div class="summary-row">
      <span>Item Out</span>
      <strong>${formatNumber(totalOut)}</strong>
    </div>
    <div class="summary-row">
      <span>Session</span>
      <strong>${escapeHtml(state.role || "Guest")}</strong>
    </div>
  `;
}

function renderList(entries) {
  if (!entries.length) {
    elements.stockHistoryList.innerHTML = `<div class="empty-state">No stock receive history for the selected date.</div>`;
    return;
  }

  elements.stockHistoryList.innerHTML = entries
    .slice(0, 50)
    .map(
      (entry) => `
        <article class="order-card transfer-card">
          <div class="order-row">
            <strong>${escapeHtml(entry.productName)}</strong>
            <strong>${formatNumber(entry.quantity)} ${escapeHtml(entry.unit)}</strong>
          </div>
          <div class="order-row muted">
            <span>${entry.transferType === "out" ? "Item Out" : "Item In"}</span>
            <span>${new Date(entry.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <div class="order-row muted">
            <span>Requested by ${escapeHtml(entry.requestedBy || "Admin")}</span>
            <span>${escapeHtml(entry.status || "Pending")}</span>
          </div>
          <div class="order-row muted">
            <span>${entry.acceptedAt ? `Accepted ${new Date(entry.acceptedAt).toLocaleString("en-IN")}` : "Not accepted yet"}</span>
            <span>${entry.acceptedBy ? `By ${escapeHtml(entry.acceptedBy)}` : ""}</span>
          </div>
        </article>
      `
    )
    .join("");
}

async function resetAllStock() {
  if (state.role !== "Owner") {
    window.alert("Owner access required.");
    return;
  }

  if (!state.products.length) {
    window.alert("No stock items found.");
    return;
  }

  const confirmed = window.confirm("Make all product stock 0?");
  if (!confirmed) {
    return;
  }

  const nextProducts = state.products.map((product) => ({
    ...product,
    stock: 0,
  }));

  try {
    await window.PosDb.save(STORAGE_KEYS.products, nextProducts);
    state.products = nextProducts;
    window.alert("All stock set to 0.");
  } catch (error) {
    console.error("Failed to reset stock", error);
    window.alert("Failed to reset stock.");
  }
}

function downloadStockSheet() {
  const headers = [
    "Item Name",
    "Rate",
    "Quantity",
    "Amount",
    "Left Quantity",
    "Left Amount",
  ];

  const rows = state.products
    .slice()
    .sort((left, right) => String(left.name).localeCompare(String(right.name)))
    .map((product) => {
      const rate = Number(product.price || 0);
      const quantity = Number(product.stock || 0);
      const amount = Number((rate * quantity).toFixed(2));
      return [
        product.name || "",
        rate,
        quantity,
        amount,
        "",
        "",
      ];
    });

  const csv = [headers, ...rows]
    .map((row) => row.map(toCsvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateSuffix = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `stock-sheet-${dateSuffix}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function matchesDate(isoValue, selectedDate) {
  return new Date(isoValue).toISOString().slice(0, 10) === selectedDate;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
