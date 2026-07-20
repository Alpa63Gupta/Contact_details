const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
  session: "sweet-shop-pos:session",
};

const elements = {
  lowStockSummary: document.querySelector("#lowStockSummary"),
  lowStockPageList: document.querySelector("#lowStockPageList"),
};

const state = {
  products: [],
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
    [STORAGE_KEYS.session]: null,
  });

  state.products = stored[STORAGE_KEYS.products].map((product) => ({
    ...product,
    minStock: Number(product.minStock ?? 5),
  }));
  state.role = stored[STORAGE_KEYS.session];
}

async function hydrateSession() {
  try {
    const session = await window.PosDb.getSession();
    state.role = session.user?.role || state.role;
  } catch (error) {
    console.warn("Failed to hydrate low stock session", error);
  }
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.products], (values) => {
    state.products = (values[STORAGE_KEYS.products] || []).map((product) => ({
      ...product,
      minStock: Number(product.minStock ?? 5),
    }));
    render();
  });
}

function render() {
  const lowStockProducts = getLowStockProducts();
  renderSummary(lowStockProducts);
  renderList(lowStockProducts);
}

function getLowStockProducts() {
  return state.products
    .filter((product) => product.stock <= Number(product.minStock ?? 5))
    .sort((left, right) => left.stock - right.stock);
}

function renderSummary(lowStockProducts) {
  const totalShortItems = lowStockProducts.length;
  const criticalItems = lowStockProducts.filter((product) => product.stock === 0).length;

  elements.lowStockSummary.innerHTML = `
    <div class="summary-row">
      <span>Low Stock Items</span>
      <strong>${totalShortItems}</strong>
    </div>
    <div class="summary-row">
      <span>Out Of Stock</span>
      <strong>${criticalItems}</strong>
    </div>
    <div class="summary-row">
      <span>Session</span>
      <strong>${escapeHtml(state.role || "Guest")}</strong>
    </div>
  `;
}

function renderList(lowStockProducts) {
  if (!lowStockProducts.length) {
    elements.lowStockPageList.innerHTML = `<div class="empty-state">No low stock items right now.</div>`;
    return;
  }

  elements.lowStockPageList.innerHTML = lowStockProducts
    .map(
      (product) => `
        <article class="order-card low-stock-card">
          <div class="order-row">
            <strong>${escapeHtml(product.name)}</strong>
            <strong class="text-danger">${formatNumber(product.stock)} ${escapeHtml(product.unit)}</strong>
          </div>
          <div class="order-row muted">
            <span>${escapeHtml(product.category)}</span>
            <span>${formatCurrency(product.price)} / ${escapeHtml(product.unit)}</span>
          </div>
          <div class="order-row muted">
            <span>Minimum stock</span>
            <span>${formatNumber(product.minStock ?? 5)} ${escapeHtml(product.unit)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
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
