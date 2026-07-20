const STORAGE_KEYS = {
  orders: "sweet-shop-pos:orders",
};

const elements = {
  filters: document.querySelector("#recentOrderFilters"),
  date: document.querySelector("#recentOrdersDateFilter"),
  today: document.querySelector("#recentOrdersToday"),
  list: document.querySelector("#orderHistory"),
  dialog: document.querySelector("#recentOrderPrintDialog"),
  printContent: document.querySelector("#recentOrderPrintContent"),
  printNow: document.querySelector("#recentOrderPrintNow"),
  printClose: document.querySelector("#recentOrderPrintClose"),
};

const state = {
  orders: [],
  date: getCurrentDateValue(),
};

initialize();

async function initialize() {
  bindEvents();
  await hydrateState();
  window.PosDb.watch([STORAGE_KEYS.orders], (values) => {
    state.orders = values[STORAGE_KEYS.orders] || [];
    render();
  });
  render();
}

function bindEvents() {
  elements.filters.addEventListener("submit", (event) => {
    event.preventDefault();
    state.date = elements.date.value || getCurrentDateValue();
    render();
  });
  elements.today.addEventListener("click", () => {
    state.date = getCurrentDateValue();
    render();
  });
  elements.printNow.addEventListener("click", () => window.print());
  elements.printClose.addEventListener("click", () => elements.dialog.close());
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.orders]: [],
  });
  state.orders = stored[STORAGE_KEYS.orders] || [];
}

function render() {
  elements.date.value = state.date;
  const orders = state.orders
    .filter((order) => getDateKey(order.createdAt) === state.date)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  if (!orders.length) {
    elements.list.innerHTML = `<div class="empty-state">No orders found for the selected date.</div>`;
    return;
  }

  elements.list.innerHTML = orders
    .map(
      (order) => `
        <article class="order-card">
          <div class="order-row">
            <strong>${escapeHtml(order.invoiceId)}</strong>
            <strong>${formatCurrency(order.total)}</strong>
          </div>
          <div class="order-row muted">
            <span>${escapeHtml(order.customerName || "Walk-in customer")}</span>
            <span>${escapeHtml(order.paymentMethod || "-")}</span>
          </div>
          <div class="order-row muted">
            <span>${formatDateTime(order.createdAt)}</span>
            <span>${(order.items || []).length} items</span>
          </div>
          <div class="order-row">
            <span></span>
            <button type="button" class="ghost-button" data-print-order="${escapeHtml(order.invoiceId)}">Print Bill</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.list.querySelectorAll("[data-print-order]").forEach((button) => {
    button.addEventListener("click", () => openPrintDialog(button.dataset.printOrder));
  });
}

function openPrintDialog(invoiceId) {
  const order = state.orders.find((item) => item.invoiceId === invoiceId);
  if (!order) {
    window.alert("Order not found.");
    return;
  }
  elements.printContent.innerHTML = renderBillMarkup(order);
  elements.dialog.showModal();
}

function renderBillMarkup(order) {
  const rows = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${formatNumber(item.quantity)} ${escapeHtml(item.unit)}</td>
          <td>${formatCurrency(item.amount ?? item.price * item.quantity)}</td>
        </tr>
      `
    )
    .join("");
  return `
    <section class="receipt-copy">
      <div class="receipt-brand">
        <p class="receipt-kicker">Customer Bill</p>
        <h3>Ramesh sweets</h3>
        <p class="receipt-muted">Thank you for shopping with us</p>
      </div>
      <div class="receipt-meta">
        <div class="receipt-meta-row"><span>Invoice</span><strong>${escapeHtml(order.invoiceId)}</strong></div>
        <div class="receipt-meta-row"><span>Date</span><strong>${formatDateTime(order.createdAt)}</strong></div>
        <div class="receipt-meta-row"><span>Customer</span><strong>${escapeHtml(order.customerName || "Walk-in customer")}</strong></div>
        <div class="receipt-meta-row"><span>Payment</span><strong>${escapeHtml(order.paymentMethod || "-")}</strong></div>
      </div>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary-row"><span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong></div>
      <div class="summary-row"><span>Discount</span><strong>${formatCurrency(order.discount)}</strong></div>
      <div class="summary-row summary-total"><span>Total</span><strong>${formatCurrency(order.total)}</strong></div>
      <p class="receipt-footer">Items: ${(order.items || []).length}</p>
    </section>
  `;
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

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("en-IN") : "-";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
