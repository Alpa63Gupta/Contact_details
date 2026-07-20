const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
  orders: "sweet-shop-pos:orders",
  expenses: "sweet-shop-pos:expenses",
  session: "sweet-shop-pos:session",
};

const elements = {
  reportFilters: document.querySelector("#reportFilters"),
  reportFromDate: document.querySelector("#reportFromDate"),
  reportToDate: document.querySelector("#reportToDate"),
  clearReportDates: document.querySelector("#clearReportDates"),
  printReport: document.querySelector("#printReport"),
  reportSummary: document.querySelector("#reportSummary"),
  salesBreakdown: document.querySelector("#salesBreakdown"),
  itemQuantityReport: document.querySelector("#itemQuantityReport"),
  expenseDetailsReport: document.querySelector("#expenseDetailsReport"),
  billDetailsReport: document.querySelector("#billDetailsReport"),
};

const state = {
  products: [],
  orders: [],
  expenses: [],
  role: null,
  fromDate: getCurrentDateValue(),
  toDate: getCurrentDateValue(),
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
  elements.reportFilters.addEventListener("submit", (event) => {
    event.preventDefault();
    state.fromDate = elements.reportFromDate.value;
    state.toDate = elements.reportToDate.value;
    render();
  });
  elements.clearReportDates.addEventListener("click", () => {
    state.fromDate = getCurrentDateValue();
    state.toDate = getCurrentDateValue();
    render();
  });
  elements.printReport.addEventListener("click", () => window.print());
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.products]: [],
    [STORAGE_KEYS.orders]: [],
    [STORAGE_KEYS.expenses]: [],
    [STORAGE_KEYS.session]: null,
  });

  state.products = stored[STORAGE_KEYS.products] || [];
  state.orders = stored[STORAGE_KEYS.orders] || [];
  state.expenses = stored[STORAGE_KEYS.expenses] || [];
  state.role = stored[STORAGE_KEYS.session];
}

async function hydrateSession() {
  try {
    const session = await window.PosDb.getSession();
    state.role = session.user?.role || state.role;
  } catch (error) {
    console.warn("Failed to hydrate report session", error);
  }
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.products, STORAGE_KEYS.orders, STORAGE_KEYS.expenses], (values) => {
    state.products = values[STORAGE_KEYS.products] || [];
    state.orders = values[STORAGE_KEYS.orders] || [];
    state.expenses = values[STORAGE_KEYS.expenses] || [];
    render();
  });
}

function render() {
  normalizeDateRange();
  elements.reportFromDate.value = state.fromDate;
  elements.reportToDate.value = state.toDate;

  const orders = getFilteredOrders();
  const expenses = getFilteredExpenses();
  renderSummary(orders, expenses);
  renderSalesBreakdown(orders);
  renderItemQuantityReport(orders);
  renderExpenseDetails(expenses);
  renderBillDetails(orders);
}

function normalizeDateRange() {
  if (state.fromDate && state.toDate && state.fromDate > state.toDate) {
    [state.fromDate, state.toDate] = [state.toDate, state.fromDate];
  }
}

function getFilteredOrders() {
  return state.orders.filter((order) => isWithinRange(order.createdAt));
}

function getFilteredExpenses() {
  return state.expenses.filter((expense) => isWithinRange(expense.createdAt));
}

function isWithinRange(value) {
  if (!value) {
    return false;
  }
  const date = new Date(value).toISOString().slice(0, 10);
  if (state.fromDate && date < state.fromDate) {
    return false;
  }
  if (state.toDate && date > state.toDate) {
    return false;
  }
  return true;
}

function renderSummary(orders, expenses) {
  const subtotal = orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
  const discount = orders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
  const tax = orders.reduce((sum, order) => sum + Number(order.tax || 0), 0);
  const totalSale = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const itemQuantity = getItemStats(orders).reduce((sum, item) => sum + item.quantitySold, 0);

  elements.reportSummary.innerHTML = `
    <article class="stat-card">
      <span>Total Sale</span>
      <strong>${formatCurrency(totalSale)}</strong>
    </article>
    <article class="stat-card">
      <span>Total Expense</span>
      <strong>${formatCurrency(totalExpense)}</strong>
    </article>
    <article class="stat-card">
      <span>Net Amount</span>
      <strong>${formatCurrency(totalSale - totalExpense)}</strong>
    </article>
    <article class="stat-card">
      <span>Bills</span>
      <strong>${orders.length}</strong>
    </article>
    <article class="stat-card">
      <span>Qty Sold</span>
      <strong>${formatNumber(itemQuantity)}</strong>
    </article>
    <article class="stat-card">
      <span>Subtotal</span>
      <strong>${formatCurrency(subtotal)}</strong>
    </article>
    <article class="stat-card">
      <span>Discount</span>
      <strong>${formatCurrency(discount)}</strong>
    </article>
    <article class="stat-card">
      <span>Tax</span>
      <strong>${formatCurrency(tax)}</strong>
    </article>
  `;
}

function renderSalesBreakdown(orders) {
  const paymentTotals = getPaymentTotals(orders);
  const methods = ["Cash", "Card", "UPI", "Credit", "Split Bill"];

  elements.salesBreakdown.innerHTML = methods
    .map(
      (method) => `
        <article class="summary report-breakdown-card">
          <div class="summary-row">
            <span>${escapeHtml(method)}</span>
            <strong>${formatCurrency(paymentTotals[method] || 0)}</strong>
          </div>
        </article>
      `
    )
    .join("");
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

function renderItemQuantityReport(orders) {
  const itemStats = getItemStats(orders);
  if (!itemStats.length) {
    elements.itemQuantityReport.innerHTML = `<div class="empty-state">No item sales found for this date range.</div>`;
    return;
  }

  elements.itemQuantityReport.innerHTML = `
    <div class="report-compact-grid item-sold-grid">
      ${itemStats
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
                <span>Stock</span>
                <strong>${formatNumber(item.currentStock)} ${escapeHtml(item.unit)}</strong>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function getItemStats(orders) {
  const salesByItem = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const existing = salesByItem.get(item.id || item.name) || {
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantitySold: 0,
        salesAmount: 0,
      };
      existing.quantitySold += Number(item.quantity || 0);
      existing.salesAmount += Number(item.amount ?? item.price * item.quantity ?? 0);
      salesByItem.set(item.id || item.name, existing);
    });
  });

  return [...salesByItem.values()]
    .map((item) => {
      const product = state.products.find((productItem) => productItem.id === item.id);
      return {
        ...item,
        category: product?.category || "Unknown",
        currentStock: Number(product?.stock || 0),
      };
    })
    .sort((left, right) => right.quantitySold - left.quantitySold);
}

function renderExpenseDetails(expenses) {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  if (!expenses.length) {
    elements.expenseDetailsReport.innerHTML = `<div class="empty-state">No expenses found for this date range.</div>`;
    return;
  }

  elements.expenseDetailsReport.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Expense</th>
          <th>Notes</th>
          <th>Added By</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${expenses
          .map(
            (expense) => `
              <tr>
                <td>${formatDateTime(expense.createdAt)}</td>
                <td>${escapeHtml(expense.title)}</td>
                <td>${escapeHtml(expense.notes || "No notes")}</td>
                <td>${escapeHtml(expense.createdBy || "Unknown")}</td>
                <td>${formatCurrency(expense.amount)}</td>
              </tr>
            `
          )
          .join("")}
        <tr>
          <td colspan="4"><strong>Total Expense</strong></td>
          <td><strong>${formatCurrency(total)}</strong></td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderBillDetails(orders) {
  if (!orders.length) {
    elements.billDetailsReport.innerHTML = `<div class="empty-state">No bills found for this date range.</div>`;
    return;
  }

  elements.billDetailsReport.innerHTML = `
    <div class="report-compact-grid bill-detail-grid">
      ${orders
        .map(
          (order) => `
            <article class="report-mini-card bill-mini-card">
              <div class="report-mini-card__title">
                <strong>${escapeHtml(order.invoiceId || "-")}</strong>
                <span>${formatDateTime(order.createdAt)}</span>
              </div>
              <div class="report-mini-pairs">
                <span>Customer</span>
                <strong>${escapeHtml(order.customerName || "Walk-in")}</strong>
                <span>Payment</span>
                <strong>${escapeHtml(getPaymentText(order))}</strong>
                <span>Subtotal</span>
                <strong>${formatCurrency(order.subtotal)}</strong>
                <span>Discount</span>
                <strong>${formatCurrency(order.discount)}</strong>
                <span>Tax</span>
                <strong>${formatCurrency(order.tax)}</strong>
                <span>Total</span>
                <strong>${formatCurrency(order.total)}</strong>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function getPaymentText(order) {
  if (order.paymentMethod !== "Split Bill" || !order.paymentBreakdown) {
    return order.paymentMethod || "-";
  }
  const details = Object.entries(order.paymentBreakdown)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([method, amount]) => `${method}: ${formatCurrency(amount)}`)
    .join(", ");
  return details ? `Split Bill (${details})` : "Split Bill";
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
