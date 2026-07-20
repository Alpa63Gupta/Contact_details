const STORAGE_KEYS = {
  orders: "sweet-shop-pos:orders",
  expenses: "sweet-shop-pos:expenses",
};

const elements = {
  stats: document.querySelector("#todayStats"),
  payments: document.querySelector("#todayPayments"),
  items: document.querySelector("#todayItems"),
};

const state = {
  orders: [],
  expenses: [],
};

initialize();

async function initialize() {
  await hydrateState();
  window.PosDb.watch([STORAGE_KEYS.orders, STORAGE_KEYS.expenses], (values) => {
    state.orders = values[STORAGE_KEYS.orders] || [];
    state.expenses = values[STORAGE_KEYS.expenses] || [];
    render();
  });
  render();
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.orders]: [],
    [STORAGE_KEYS.expenses]: [],
  });
  state.orders = stored[STORAGE_KEYS.orders] || [];
  state.expenses = stored[STORAGE_KEYS.expenses] || [];
}

function render() {
  const orders = state.orders.filter((order) => isToday(order.createdAt));
  const expenses = state.expenses.filter((expense) => isToday(expense.createdAt));
  const totalSale = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalDiscount = orders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const itemStats = getItemStats(orders);
  const qtySold = itemStats.reduce((sum, item) => sum + item.quantity, 0);

  elements.stats.innerHTML = `
    <article class="stat-card"><span>Today's Sales</span><strong>${formatCurrency(totalSale)}</strong></article>
    <article class="stat-card"><span>Orders Today</span><strong>${orders.length}</strong></article>
    <article class="stat-card"><span>Today's Expenses</span><strong>${formatCurrency(totalExpense)}</strong></article>
    <article class="stat-card"><span>Today's Discount</span><strong>${formatCurrency(totalDiscount)}</strong></article>
    <article class="stat-card"><span>Qty Sold</span><strong>${formatNumber(qtySold)}</strong></article>
  `;

  renderPayments(orders);
  renderItems(itemStats);
}

function renderPayments(orders) {
  const totals = orders.reduce((acc, order) => {
    if (order.paymentMethod === "Split Bill" && order.paymentBreakdown) {
      Object.entries(order.paymentBreakdown).forEach(([method, amount]) => {
        acc[method] = (acc[method] || 0) + Number(amount || 0);
      });
      acc["Split Bill"] = (acc["Split Bill"] || 0) + Number(order.total || 0);
      return acc;
    }
    acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + Number(order.total || 0);
    return acc;
  }, {});

  elements.payments.innerHTML = ["Cash", "Card", "UPI", "Credit", "Split Bill"]
    .map((method) => `<article class="stat-card"><span>${escapeHtml(method)}</span><strong>${formatCurrency(totals[method] || 0)}</strong></article>`)
    .join("");
}

function renderItems(items) {
  if (!items.length) {
    elements.items.innerHTML = `<div class="empty-state">No items sold today.</div>`;
    return;
  }
  elements.items.innerHTML = `
    <table class="report-table">
      <thead><tr><th>Item</th><th>Qty</th><th>Sales</th></tr></thead>
      <tbody>
        ${items
          .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${formatNumber(item.quantity)} ${escapeHtml(item.unit)}</td><td>${formatCurrency(item.amount)}</td></tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

function getItemStats(orders) {
  const map = new Map();
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.id || item.name;
      const existing = map.get(key) || { name: item.name, unit: item.unit, quantity: 0, amount: 0 };
      existing.quantity += Number(item.quantity || 0);
      existing.amount += Number(item.amount ?? item.price * item.quantity ?? 0);
      map.set(key, existing);
    });
  });
  return [...map.values()].sort((left, right) => right.quantity - left.quantity);
}

function isToday(value) {
  return getDateKey(value) === getCurrentDateValue();
}

function getDateKey(value) {
  const directDate = String(value || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (directDate) return directDate;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getCurrentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
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
    .replaceAll("'", "&#39;");
}
