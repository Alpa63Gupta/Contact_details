const STORAGE_KEYS = {
  expenses: "sweet-shop-pos:expenses",
  session: "sweet-shop-pos:session",
};

const elements = {
  expenseForm: document.querySelector("#expenseForm"),
  expenseTitle: document.querySelector("#expenseTitle"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expenseNotes: document.querySelector("#expenseNotes"),
  expenseDateFilter: document.querySelector("#expenseDateFilter"),
  clearExpenseDateFilter: document.querySelector("#clearExpenseDateFilter"),
  expenseSummary: document.querySelector("#expenseSummary"),
  expenseList: document.querySelector("#expenseList"),
};

const state = {
  expenses: [],
  role: null,
  selectedDate: "",
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
  elements.expenseForm.addEventListener("submit", handleExpenseSubmit);
  elements.expenseDateFilter.addEventListener("input", (event) => {
    state.selectedDate = event.target.value;
    render();
  });
  elements.clearExpenseDateFilter.addEventListener("click", () => {
    state.selectedDate = "";
    elements.expenseDateFilter.value = "";
    render();
  });
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.expenses]: [],
    [STORAGE_KEYS.session]: null,
  });

  state.expenses = stored[STORAGE_KEYS.expenses];
  state.role = stored[STORAGE_KEYS.session];
}

async function hydrateSession() {
  try {
    const session = await window.PosDb.getSession();
    state.role = session.user?.role || state.role;
  } catch (error) {
    console.warn("Failed to hydrate expense session", error);
  }
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.expenses], (values) => {
    state.expenses = values[STORAGE_KEYS.expenses] || [];
    render();
  });
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  const title = elements.expenseTitle.value.trim();
  const amount = Number(elements.expenseAmount.value);
  const notes = elements.expenseNotes.value.trim();

  if (!title || amount <= 0) {
    return;
  }

  state.expenses.unshift({
    id: crypto.randomUUID(),
    title,
    amount: Number(amount.toFixed(2)),
    notes,
    createdAt: new Date().toISOString(),
    createdBy: state.role || "Cashier",
  });

  persistState(STORAGE_KEYS.expenses, state.expenses);
  elements.expenseForm.reset();
  render();
}

function render() {
  renderSummary();
  renderExpenses();
}

function renderSummary() {
  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  elements.expenseSummary.innerHTML = `
    <div class="summary-row">
      <span>Total Expenses</span>
      <strong>${formatCurrency(totalExpenses)}</strong>
    </div>
    <div class="summary-row">
      <span>Entries</span>
      <strong>${filteredExpenses.length}</strong>
    </div>
    <div class="summary-row">
      <span>Session</span>
      <strong>${escapeHtml(state.role || "Guest")}</strong>
    </div>
  `;
}

function renderExpenses() {
  const filteredExpenses = getFilteredExpenses();

  if (!filteredExpenses.length) {
    elements.expenseList.innerHTML = `<div class="empty-state">No expenses found for the selected date.</div>`;
    return;
  }

  elements.expenseList.innerHTML = filteredExpenses
    .map(
      (expense) => `
        <article class="order-card transfer-card">
          <div class="order-row">
            <strong>${escapeHtml(expense.title)}</strong>
            <strong>${formatCurrency(expense.amount)}</strong>
          </div>
          <div class="order-row muted">
            <span>${escapeHtml(expense.notes || "No notes")}</span>
            <span>${new Date(expense.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <div class="order-row muted">
            <span>Added by ${escapeHtml(expense.createdBy)}</span>
            <button type="button" class="ghost-button" data-remove-expense="${expense.id}">Remove</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.expenseList.querySelectorAll("[data-remove-expense]").forEach((button) => {
    button.addEventListener("click", () => removeExpense(button.dataset.removeExpense));
  });
}

function getFilteredExpenses() {
  if (!state.selectedDate) {
    return state.expenses;
  }

  return state.expenses.filter((expense) => expense.createdAt.slice(0, 10) === state.selectedDate);
}

function removeExpense(expenseId) {
  state.expenses = state.expenses.filter((expense) => expense.id !== expenseId);
  persistState(STORAGE_KEYS.expenses, state.expenses);
  render();
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
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
