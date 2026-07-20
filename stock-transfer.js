const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
  pendingTransfers: "sweet-shop-pos:pending-transfers",
  transferHistory: "sweet-shop-pos:transfer-history",
  session: "sweet-shop-pos:session",
};

const elements = {
  transferSummary: document.querySelector("#transferSummary"),
  pendingTransfers: document.querySelector("#pendingTransfers"),
};

const state = {
  products: [],
  pendingTransfers: [],
  transferHistory: [],
  role: null,
};

initialize();

async function initialize() {
  await hydrateState();
  await hydrateSession();
  startLiveSync();
  render();
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.products]: [],
    [STORAGE_KEYS.pendingTransfers]: [],
    [STORAGE_KEYS.transferHistory]: [],
    [STORAGE_KEYS.session]: null,
  });

  state.products = stored[STORAGE_KEYS.products];
  state.pendingTransfers = stored[STORAGE_KEYS.pendingTransfers];
  state.transferHistory = stored[STORAGE_KEYS.transferHistory];
  state.role = stored[STORAGE_KEYS.session];
}

async function hydrateSession() {
  try {
    const session = await window.PosDb.getSession();
    state.role = session.user?.role || state.role;
  } catch (error) {
    console.warn("Failed to hydrate stock transfer session", error);
  }
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.products, STORAGE_KEYS.pendingTransfers, STORAGE_KEYS.transferHistory], (values) => {
    state.products = values[STORAGE_KEYS.products] || [];
    state.pendingTransfers = values[STORAGE_KEYS.pendingTransfers] || [];
    state.transferHistory = values[STORAGE_KEYS.transferHistory] || [];
    render();
  });
}

function render() {
  renderSummary();
  renderTransfers();
}

function renderSummary() {
  const pendingCount = state.pendingTransfers.length;
  const totalUnits = state.pendingTransfers.reduce((sum, item) => sum + item.quantity, 0);
  const totalIn = state.pendingTransfers
    .filter((item) => item.transferType === "in")
    .reduce((sum, item) => sum + item.quantity, 0);
  const totalOut = state.pendingTransfers
    .filter((item) => item.transferType === "out")
    .reduce((sum, item) => sum + item.quantity, 0);

  elements.transferSummary.innerHTML = `
    <div class="summary-row">
      <span>Pending Requests</span>
      <strong>${pendingCount}</strong>
    </div>
    <div class="summary-row">
      <span>Total Pending Quantity</span>
      <strong>${formatNumber(totalUnits)}</strong>
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

function renderTransfers() {
  if (!state.pendingTransfers.length) {
    elements.pendingTransfers.innerHTML = `<div class="empty-state">No pending stock transfer requests.</div>`;
    return;
  }

  elements.pendingTransfers.innerHTML = state.pendingTransfers
    .map(
      (transfer) => `
        <article class="order-card transfer-card">
          <div class="order-row">
            <strong>${escapeHtml(transfer.productName)}</strong>
            <strong>${formatNumber(transfer.quantity)} ${escapeHtml(transfer.unit)}</strong>
          </div>
          <div class="order-row muted">
            <span>${transfer.transferType === "out" ? "Item Out" : "Item In"}</span>
            <span>${new Date(transfer.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <div class="order-row muted">
            <span>Requested by ${escapeHtml(transfer.requestedBy)}</span>
            <span>Current stock: ${formatNumber(getCurrentStock(transfer.productId))} ${escapeHtml(transfer.unit)}</span>
          </div>
          <div class="order-row muted">
            <span>Amount: ${formatCurrency(transfer.amount ?? ((transfer.rate || 0) * (transfer.quantity || 0)))}</span>
            <span>Shelf life: ${escapeHtml(transfer.shelfLife || "-")}</span>
          </div>
          <button type="button" class="button accent transfer-accept" data-accept-transfer="${transfer.id}">
            Accept Transfer
          </button>
        </article>
      `
    )
    .join("");

  elements.pendingTransfers.querySelectorAll("[data-accept-transfer]").forEach((button) => {
    button.addEventListener("click", () => acceptStockTransfer(button.dataset.acceptTransfer));
  });
}

function acceptStockTransfer(transferId) {
  const transfer = state.pendingTransfers.find((item) => item.id === transferId);
  if (!transfer) {
    return;
  }

  const product = state.products.find((item) => item.id === transfer.productId);
  if (!product) {
    return;
  }

  if (transfer.transferType === "out" && transfer.quantity > product.stock) {
    window.alert(`Only ${formatNumber(product.stock)} ${product.unit} available in stock.`);
    return;
  }

  const confirmed = window.confirm(
    `Accept ${transfer.transferType === "out" ? "item out" : "item in"} for ${formatNumber(transfer.quantity)} ${transfer.unit} ${transfer.transferType === "out" ? "from" : "to"} ${transfer.productName}?`
  );
  if (!confirmed) {
    return;
  }

  state.products = state.products.map((item) =>
    item.id === transfer.productId
      ? {
          ...item,
          stock: Number(
            (
              item.stock +
              (transfer.transferType === "out" ? -transfer.quantity : transfer.quantity)
            ).toFixed(2)
          ),
        }
      : item
  );
  state.pendingTransfers = state.pendingTransfers.filter((item) => item.id !== transferId);
  state.transferHistory = state.transferHistory.map((item) =>
    item.id === transferId
      ? {
          ...item,
          status: "Accepted",
          acceptedAt: new Date().toISOString(),
          acceptedBy: state.role || "User",
        }
      : item
  );

  persistState(STORAGE_KEYS.products, state.products);
  persistState(STORAGE_KEYS.pendingTransfers, state.pendingTransfers);
  persistState(STORAGE_KEYS.transferHistory, state.transferHistory);
  render();
}

function getCurrentStock(productId) {
  return state.products.find((item) => item.id === productId)?.stock || 0;
}

function persistState(key, value) {
  window.PosDb.save(key, value).catch((error) => {
    console.error(`Failed to save ${key}`, error);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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




