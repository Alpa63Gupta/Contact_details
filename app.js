const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
  orders: "sweet-shop-pos:orders",
  expenses: "sweet-shop-pos:expenses",
  session: "sweet-shop-pos:session",
  pendingTransfers: "sweet-shop-pos:pending-transfers",
  transferHistory: "sweet-shop-pos:transfer-history",
  cart: "sweet-shop-pos:cart",
  search: "sweet-shop-pos:search",
  activeCategory: "sweet-shop-pos:active-category",
  customerName: "sweet-shop-pos:customer-name",
  discount: "sweet-shop-pos:discount",
  taxRate: "sweet-shop-pos:tax-rate",
  paymentMethod: "sweet-shop-pos:payment-method",
  posSidebarCollapsed: "sweet-shop-pos:pos-sidebar-collapsed",
  theme: "sweet-shop-pos:theme",
};

const GST_RATE = 5;
const GST_HALF_RATE = GST_RATE / 2;

const seedProducts = [
  { id: crypto.randomUUID(), name: "Kaju Katli", hindiName: "à¤•à¤¾à¤œà¥‚ à¤•à¤¤à¤²à¥€", category: "Sweets", tokenDepartment: "Sweets Counter", unit: "kg", price: 920, stock: 18, minStock: 5 },
  { id: crypto.randomUUID(), name: "Gulab Jamun", hindiName: "à¤—à¥à¤²à¤¾à¤¬ à¤œà¤¾à¤®à¥à¤¨", category: "Sweets", tokenDepartment: "Sweets Counter", unit: "kg", price: 380, stock: 24, minStock: 5 },
  { id: crypto.randomUUID(), name: "Rasgulla Tin", hindiName: "à¤°à¤¸à¤—à¥à¤²à¥à¤²à¤¾ à¤Ÿà¤¿à¤¨", category: "Gift Packs", tokenDepartment: "Packing Counter", unit: "box", price: 210, stock: 30, minStock: 5 },
  { id: crypto.randomUUID(), name: "Motichoor Ladoo", hindiName: "à¤®à¥‹à¤¤à¥€à¤šà¥‚à¤° à¤²à¤¡à¥à¤¡à¥‚", category: "Sweets", tokenDepartment: "Sweets Counter", unit: "kg", price: 460, stock: 16, minStock: 5 },
  { id: crypto.randomUUID(), name: "Samosa", hindiName: "à¤¸à¤®à¥‹à¤¸à¤¾", category: "Snacks", tokenDepartment: "Snacks Counter", unit: "piece", price: 18, stock: 160, minStock: 20 },
  { id: crypto.randomUUID(), name: "Dry Fruit Box", hindiName: "à¤¡à¥à¤°à¤¾à¤ˆ à¤«à¥à¤°à¥‚à¤Ÿ à¤¬à¥‰à¤•à¥à¤¸", category: "Gift Packs", tokenDepartment: "Packing Counter", unit: "box", price: 650, stock: 12, minStock: 4 },
];

const state = {
  products: [...seedProducts],
  orders: [],
  expenses: [],
  pendingTransfers: [],
  transferHistory: [],
  outlets: [],
  activeOutletId: window.PosDb?.getActiveOutletId?.() || "main",
  cart: [],
  search: "",
  activeCategory: "All",
  pendingProductId: null,
  role: null,
  customerName: "",
  discount: "0",
  taxRate: "0",
  paymentMethod: "Cash",
  recentOrdersDateFilter: new Date().toISOString().slice(0, 10),
  adminDateFilter: new Date().toISOString().slice(0, 10),
  ownerDateFilter: new Date().toISOString().slice(0, 10),
  editingOrderInvoiceId: null,
  ownerEmployees: [],
  editingEmployeeUsername: null,
  activeReceiptOrder: null,
  activeReceiptMode: "bill",
  allowTokenPrint: true,
  tokenPrintQueue: [],
  tokenPrintOrder: null,
  tokenPrintIndex: 0,
  currentView: "login",
  serverInfo: null,
  posSidebarCollapsed: false,
  ownerActiveSection: "snapshot",
  theme: window.localStorage.getItem("sweet-shop-pos:theme") || "light",
  splitPayments: {
    Cash: "0",
    Card: "0",
    UPI: "0",
    Credit: "0",
  },
};

const elements = {
  loginScreen: document.querySelector("#loginScreen"),
  loginMessage: document.querySelector("#loginMessage"),
  ownerPassword: document.querySelector("#ownerPassword"),
  adminPassword: document.querySelector("#adminPassword"),
  cashierPassword: document.querySelector("#cashierPassword"),
  cashierOutletSelect: document.querySelector("#cashierOutletSelect"),
  loginOwner: document.querySelector("#loginOwner"),
  loginAdmin: document.querySelector("#loginAdmin"),
  loginCashier: document.querySelector("#loginCashier"),
  logoutButton: document.querySelector("#logoutButton"),
  userRole: document.querySelector("#userRole"),
  posOutletName: document.querySelector("#posOutletName"),
  posBackDashboard: document.querySelector("#posBackDashboard"),
  appLayout: document.querySelector("#appLayout"),
  adminLayout: document.querySelector("#adminLayout"),
  ownerLayout: document.querySelector("#ownerLayout"),
  adminLogoutButton: document.querySelector("#adminLogoutButton"),
  ownerLogoutButton: document.querySelector("#ownerLogoutButton"),
  adminMenu: document.querySelector("#adminMenu"),
  adminStockChecking: document.querySelector("#adminStockChecking"),
  adminLowStock: document.querySelector("#adminLowStock"),
  adminStockTransfer: document.querySelector("#adminStockTransfer"),
  adminLedger: document.querySelector("#adminLedger"),
  adminBackup: document.querySelector("#adminBackup"),
  adminRestore: document.querySelector("#adminRestore"),
  adminRestoreFile: document.querySelector("#adminRestoreFile"),
  adminOutletSelect: document.querySelector("#adminOutletSelect"),
  adminOutletName: document.querySelector("#adminOutletName"),
  adminAddOutlet: document.querySelector("#adminAddOutlet"),
  adminDateFilter: document.querySelector("#adminDateFilter"),
  adminOrders: document.querySelector("#adminOrders"),
  ownerViewPos: document.querySelector("#ownerViewPos"),
  ownerEmployeesButton: document.querySelector("#ownerEmployeesButton"),
  ownerMenu: document.querySelector("#ownerMenu"),
  ownerLowStock: document.querySelector("#ownerLowStock"),
  ownerStockTransfer: document.querySelector("#ownerStockTransfer"),
  ownerExpense: document.querySelector("#ownerExpense"),
  ownerStockHistory: document.querySelector("#ownerStockHistory"),
  ownerReports: document.querySelector("#ownerReports"),
  ownerLedger: document.querySelector("#ownerLedger"),
  ownerTodayGlance: document.querySelector("#ownerTodayGlance"),
  ownerRecentBillEdit: document.querySelector("#ownerRecentBillEdit"),
  ownerTodayReport: document.querySelector("#ownerTodayReport"),
  ownerBackup: document.querySelector("#ownerBackup"),
  ownerRestore: document.querySelector("#ownerRestore"),
  ownerRestoreFile: document.querySelector("#ownerRestoreFile"),
  ownerOutletSelect: document.querySelector("#ownerOutletSelect"),
  ownerOutletName: document.querySelector("#ownerOutletName"),
  ownerAddOutlet: document.querySelector("#ownerAddOutlet"),
  posNavRecentOrders: document.querySelector("#posNavRecentOrders"),
  posLowStock: document.querySelector("#posLowStock"),
  posExpense: document.querySelector("#posExpense"),
  posReports: document.querySelector("#posReports"),
  posStockTransfer: document.querySelector("#posStockTransfer"),
  posStockReceiveHistory: document.querySelector("#posStockReceiveHistory"),
  posStockTransferCount: document.querySelector("#posStockTransferCount"),
  ownerDateFilter: document.querySelector("#ownerDateFilter"),
  ownerStats: document.querySelector("#ownerStats"),
  ownerPayments: document.querySelector("#ownerPayments"),
  ownerTransfers: document.querySelector("#ownerTransfers"),
  ownerEmployeeForm: document.querySelector("#ownerEmployeeForm"),
  ownerEmployeeName: document.querySelector("#ownerEmployeeName"),
  ownerEmployeeAccess: document.querySelector("#ownerEmployeeAccess"),
  ownerEmployeePassword: document.querySelector("#ownerEmployeePassword"),
  ownerEmployeeUsername: document.querySelector("#ownerEmployeeUsername"),
  ownerEmployeeSubmit: document.querySelector("#ownerEmployeeSubmit"),
  ownerEmployeeCancelEdit: document.querySelector("#ownerEmployeeCancelEdit"),
  ownerEmployees: document.querySelector("#ownerEmployees"),
  ownerReportSummary: document.querySelector("#ownerReportSummary"),
  ownerTopItems: document.querySelector("#ownerTopItems"),
  ownerItemReport: document.querySelector("#ownerItemReport"),
  ownerReportsSection: document.querySelector("#ownerReportsSection"),
  ownerOrders: document.querySelector("#ownerOrders"),
  serverInfo: document.querySelector("#serverInfo"),
  ownerServerInfo: document.querySelector("#ownerServerInfo"),
  recentOrdersPanel: document.querySelector("#recentOrdersPanel"),
  searchInput: document.querySelector("#searchInput"),
  posSidebarToggle: document.querySelector("#posSidebarToggle"),
  categoryFilters: document.querySelector("#categoryFilters"),
  catalog: document.querySelector("#catalog"),
  cartItems: document.querySelector("#cartItems"),
  discount: document.querySelector("#discount"),
  taxRate: document.querySelector("#taxRate"),
  paymentMethod: document.querySelector("#paymentMethod"),
  splitPaymentSection: document.querySelector("#splitPaymentSection"),
  splitCash: document.querySelector("#splitCash"),
  splitCard: document.querySelector("#splitCard"),
  splitUpi: document.querySelector("#splitUpi"),
  splitCredit: document.querySelector("#splitCredit"),
  splitPaymentSummary: document.querySelector("#splitPaymentSummary"),
  customerName: document.querySelector("#customerName"),
  clearCart: document.querySelector("#clearCart"),
  checkoutButton: document.querySelector("#checkoutButton"),
  summary: document.querySelector("#summary"),
  stats: document.querySelector("#stats"),
  posPaymentBreakdown: document.querySelector("#posPaymentBreakdown"),
  recentOrdersDateFilter: document.querySelector("#recentOrdersDateFilter"),
  orderHistory: document.querySelector("#orderHistory"),
  receiptDialog: document.querySelector("#receiptDialog"),
  receiptContent: document.querySelector("#receiptContent"),
  printReceipt: document.querySelector("#printReceipt"),
  printToken: document.querySelector("#printToken"),
  closeReceipt: document.querySelector("#closeReceipt"),
  confirmationDialog: document.querySelector("#confirmationDialog"),
  confirmationContent: document.querySelector("#confirmationContent"),
  confirmationPrint: document.querySelector("#confirmationPrint"),
  confirmationPrintToken: document.querySelector("#confirmationPrintToken"),
  confirmationClose: document.querySelector("#confirmationClose"),
  addItemDialog: document.querySelector("#addItemDialog"),
  addItemForm: document.querySelector("#addItemForm"),
  cancelAddItem: document.querySelector("#cancelAddItem"),
  selectedProductText: document.querySelector("#selectedProductText"),
  dialogAmount: document.querySelector("#dialogAmount"),
  dialogQuantity: document.querySelector("#dialogQuantity"),
  calculatedQuantity: document.querySelector("#calculatedQuantity"),
  stockTransferDialog: document.querySelector("#stockTransferDialog"),
  stockTransferForm: document.querySelector("#stockTransferForm"),
  cancelStockTransfer: document.querySelector("#cancelStockTransfer"),
  stockTransferItem: document.querySelector("#stockTransferItem"),
  stockTransferItemList: document.querySelector("#stockTransferItemList"),
  stockTransferType: document.querySelector("#stockTransferType"),
  stockTransferQuantity: document.querySelector("#stockTransferQuantity"),
  stockTransferShelfLifeWrap: document.querySelector("#stockTransferShelfLifeWrap"),
  stockTransferShelfLife: document.querySelector("#stockTransferShelfLife"),
  stockTransferDateFilter: document.querySelector("#stockTransferDateFilter"),
  stockTransferHistory: document.querySelector("#stockTransferHistory"),
  ownerEmployeeDialog: document.querySelector("#ownerEmployeeDialog"),
  ownerEmployeeDialogClose: document.querySelector("#ownerEmployeeDialogClose"),
  ownerTodayReportDialog: document.querySelector("#ownerTodayReportDialog"),
  ownerTodayReportForm: document.querySelector("#ownerTodayReportForm"),
  ownerTodayReportDate: document.querySelector("#ownerTodayReportDate"),
  ownerTodayReportToday: document.querySelector("#ownerTodayReportToday"),
  ownerTodayReportCancel: document.querySelector("#ownerTodayReportCancel"),
  ownerEditOrderDialog: document.querySelector("#ownerEditOrderDialog"),
  ownerEditOrderForm: document.querySelector("#ownerEditOrderForm"),
  ownerEditOrderCancel: document.querySelector("#ownerEditOrderCancel"),
  ownerEditOrderInvoiceId: document.querySelector("#ownerEditOrderInvoiceId"),
  ownerEditCustomerName: document.querySelector("#ownerEditCustomerName"),
  ownerEditPaymentMethod: document.querySelector("#ownerEditPaymentMethod"),
  ownerEditDiscount: document.querySelector("#ownerEditDiscount"),
  ownerEditTaxRate: document.querySelector("#ownerEditTaxRate"),
  ownerEditOrderSummary: document.querySelector("#ownerEditOrderSummary"),
  ownerDeleteBill: document.querySelector("#ownerDeleteBill"),
};

initialize();

async function initialize() {
  applyTheme();
  bindEvents();
  await hydrateState();
  startLiveSync();
  await fetchOwnerEmployees();
  await fetchServerInfo();
  render();
}

function bindEvents() {
  elements.loginOwner.addEventListener("click", () => login("Owner", elements.ownerPassword.value));
  elements.loginAdmin.addEventListener("click", () => login("Admin", elements.adminPassword.value));
  elements.loginCashier.addEventListener("click", () => login("Cashier", elements.cashierPassword.value));
  elements.cashierOutletSelect.addEventListener("change", (event) => {
    state.activeOutletId = window.PosDb.setActiveOutletId(event.target.value);
  });
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", toggleTheme);
  });
  elements.logoutButton.addEventListener("click", logout);
  elements.posBackDashboard.addEventListener("click", returnToRoleDashboard);
  elements.adminLogoutButton.addEventListener("click", logout);
  elements.ownerLogoutButton.addEventListener("click", logout);
  elements.adminMenu.addEventListener("click", openAdminMenuPage);
  elements.adminStockChecking.addEventListener("click", openStockCheckingPage);
  elements.adminLowStock.addEventListener("click", openLowStockPage);
  elements.adminStockTransfer.addEventListener("click", openStockTransferDialog);
  elements.adminLedger.addEventListener("click", openLedgerPage);
  elements.adminBackup.addEventListener("click", downloadDatabaseBackup);
  elements.adminRestore.addEventListener("click", () => elements.adminRestoreFile.click());
  elements.adminRestoreFile.addEventListener("change", restoreDatabaseBackup);
  elements.adminOutletSelect.addEventListener("change", (event) => switchOutlet(event.target.value));
  elements.adminAddOutlet.addEventListener("click", () => createOutletFromInput(elements.adminOutletName));
  elements.adminDateFilter.addEventListener("input", (event) => {
    state.adminDateFilter = event.target.value || getCurrentDateValue();
    renderAdmin();
  });
  elements.ownerViewPos.addEventListener("click", openPosFromOwner);
  elements.ownerEmployeesButton.addEventListener("click", openOwnerEmployeeDialog);
  elements.ownerMenu.addEventListener("click", openAdminMenuPage);
  elements.ownerLowStock.addEventListener("click", openLowStockPage);
  elements.ownerStockTransfer.addEventListener("click", openStockTransferDialog);
  elements.ownerExpense.addEventListener("click", openExpensePage);
  elements.ownerStockHistory.addEventListener("click", openStockReceiveHistoryPage);
  elements.ownerReports.addEventListener("click", () => showOwnerSection("reports"));
  elements.ownerLedger.addEventListener("click", openLedgerPage);
  elements.ownerTodayGlance.addEventListener("click", openPosTodayGlancePage);
  elements.ownerRecentBillEdit.addEventListener("click", () => showOwnerSection("recentBills"));
  elements.ownerTodayReport.addEventListener("click", openTodayAllReportDialog);
  document.querySelectorAll("[data-owner-section-button]").forEach((button) => {
    button.addEventListener("click", () => showOwnerSection(button.dataset.ownerSectionButton));
  });
  elements.ownerBackup.addEventListener("click", downloadDatabaseBackup);
  elements.ownerRestore.addEventListener("click", () => elements.ownerRestoreFile.click());
  elements.ownerRestoreFile.addEventListener("change", restoreDatabaseBackup);
  elements.ownerOutletSelect.addEventListener("change", (event) => switchOutlet(event.target.value));
  elements.ownerAddOutlet.addEventListener("click", () => createOutletFromInput(elements.ownerOutletName));
  elements.ownerEmployeeForm.addEventListener("submit", handleOwnerEmployeeSubmit);
  elements.ownerEmployeeDialogClose.addEventListener("click", closeOwnerEmployeeDialog);
  elements.ownerEmployeeCancelEdit.addEventListener("click", resetOwnerEmployeeForm);
  elements.ownerTodayReportForm.addEventListener("submit", handleTodayAllReportSubmit);
  elements.ownerTodayReportToday.addEventListener("click", () => {
    elements.ownerTodayReportDate.value = getCurrentDateValue();
  });
  elements.ownerTodayReportCancel.addEventListener("click", () => elements.ownerTodayReportDialog.close());
  elements.ownerDateFilter.addEventListener("input", (event) => {
    state.ownerDateFilter = event.target.value || getCurrentDateValue();
    renderOwner();
  });
  elements.posNavRecentOrders.addEventListener("click", openPosRecentOrdersPage);
  elements.posLowStock.addEventListener("click", openLowStockPage);
  elements.posExpense.addEventListener("click", openExpensePage);
  elements.posReports.addEventListener("click", openReportsPage);
  elements.posStockTransfer.addEventListener("click", openStockTransferPage);
  elements.posStockReceiveHistory.addEventListener("click", openStockReceiveHistoryPage);
  elements.posSidebarToggle.addEventListener("click", togglePosSidebar);
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    persistState(STORAGE_KEYS.search, state.search);
    renderCatalog();
  });
  elements.discount.addEventListener("input", (event) => {
    state.discount = event.target.value || "0";
    persistState(STORAGE_KEYS.discount, state.discount);
    renderSummary();
  });
  elements.taxRate.addEventListener("input", (event) => {
    state.taxRate = event.target.value || "0";
    persistState(STORAGE_KEYS.taxRate, state.taxRate);
    renderSummary();
  });
  elements.paymentMethod.addEventListener("change", (event) => {
    state.paymentMethod = event.target.value || "Cash";
    persistState(STORAGE_KEYS.paymentMethod, state.paymentMethod);
    renderSummary();
  });
  [elements.splitCash, elements.splitCard, elements.splitUpi, elements.splitCredit].forEach((input) => {
    input.addEventListener("input", renderSummary);
  });
  elements.customerName.addEventListener("input", (event) => {
    state.customerName = event.target.value;
    persistState(STORAGE_KEYS.customerName, state.customerName);
  });
  elements.recentOrdersDateFilter?.addEventListener("input", (event) => {
    state.recentOrdersDateFilter = event.target.value || getCurrentDateValue();
    renderOrders();
  });
  elements.clearCart.addEventListener("click", clearCart);
  elements.checkoutButton.addEventListener("click", completeSale);
  elements.printReceipt.addEventListener("click", () => printReceiptForMode("bill"));
  elements.printToken.addEventListener("click", () => printReceiptForMode("token"));
  window.addEventListener("afterprint", handleAfterPrint);
  elements.closeReceipt.addEventListener("click", () => elements.receiptDialog.close());
  elements.confirmationPrint.addEventListener("click", () => {
      elements.confirmationDialog.close();
      printReceiptForMode("bill");
    });
  elements.confirmationPrintToken.addEventListener("click", () => {
      elements.confirmationDialog.close();
      printReceiptForMode("token");
    });
  elements.confirmationClose.addEventListener("click", () => elements.confirmationDialog.close());
  elements.addItemForm.addEventListener("submit", handleAddItemSubmit);
  elements.cancelAddItem.addEventListener("click", closeAddItemDialog);
  elements.stockTransferForm.addEventListener("submit", handleStockTransferSubmit);
  elements.cancelStockTransfer.addEventListener("click", closeStockTransferDialog);
  elements.stockTransferType.addEventListener("change", syncStockTransferShelfLife);
  elements.stockTransferDateFilter.addEventListener("input", renderStockTransferHistory);
  elements.ownerEditOrderForm.addEventListener("submit", handleOwnerOrderEditSubmit);
  elements.ownerEditOrderCancel.addEventListener("click", closeOwnerEditOrderDialog);
  elements.ownerDeleteBill.addEventListener("click", deleteOwnerBill);
  [elements.ownerEditDiscount, elements.ownerEditTaxRate].forEach((input) => {
    input.addEventListener("input", renderOwnerEditOrderSummary);
  });
  elements.dialogAmount.addEventListener("input", () => syncDialogFields("amount"));
  elements.dialogQuantity.addEventListener("input", () => syncDialogFields("quantity"));
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  window.localStorage.setItem(STORAGE_KEYS.theme, state.theme);
  applyTheme();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
  });
}

async function hydrateState() {
  await hydrateOutlets();
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.products]: seedProducts,
    [STORAGE_KEYS.orders]: [],
    [STORAGE_KEYS.expenses]: [],
    [STORAGE_KEYS.pendingTransfers]: [],
    [STORAGE_KEYS.transferHistory]: [],
    [STORAGE_KEYS.cart]: [],
    [STORAGE_KEYS.search]: "",
    [STORAGE_KEYS.activeCategory]: "All",
    [STORAGE_KEYS.session]: null,
    [STORAGE_KEYS.customerName]: "",
    [STORAGE_KEYS.discount]: "0",
  [STORAGE_KEYS.taxRate]: "0",
    [STORAGE_KEYS.paymentMethod]: "Cash",
    [STORAGE_KEYS.posSidebarCollapsed]: false,
  });

  state.products = stored[STORAGE_KEYS.products].map((product) => ({
    ...product,
    minStock: Number(product.minStock ?? 5),
  }));
  state.orders = stored[STORAGE_KEYS.orders];
  state.expenses = stored[STORAGE_KEYS.expenses];
  state.pendingTransfers = stored[STORAGE_KEYS.pendingTransfers];
  state.transferHistory = stored[STORAGE_KEYS.transferHistory];
  state.cart = stored[STORAGE_KEYS.cart];
  state.search = stored[STORAGE_KEYS.search];
  state.activeCategory = stored[STORAGE_KEYS.activeCategory];
  state.role = null;
  state.currentView = "login";
  state.customerName = stored[STORAGE_KEYS.customerName];
  state.discount = String(stored[STORAGE_KEYS.discount] ?? "0");
  state.taxRate = String(stored[STORAGE_KEYS.taxRate] ?? "0");
  state.paymentMethod = stored[STORAGE_KEYS.paymentMethod] || "Cash";
  state.posSidebarCollapsed = Boolean(stored[STORAGE_KEYS.posSidebarCollapsed]);
}

async function hydrateOutlets() {
  try {
    state.outlets = await window.PosDb.getOutlets();
    state.activeOutletId = window.PosDb.getActiveOutletId();
  } catch (error) {
    console.warn("Failed to load outlets", error);
    state.outlets = [{ id: "main", name: "Main Outlet" }];
    state.activeOutletId = "main";
  }
}

function startLiveSync() {
  window.PosDb.watch(
    [
      STORAGE_KEYS.products,
      STORAGE_KEYS.orders,
      STORAGE_KEYS.expenses,
      STORAGE_KEYS.pendingTransfers,
      STORAGE_KEYS.transferHistory,
    ],
    (values) => {
      state.products = (values[STORAGE_KEYS.products] || []).map((product) => ({
        ...product,
        minStock: Number(product.minStock ?? 5),
      }));
      state.orders = values[STORAGE_KEYS.orders] || [];
      state.expenses = values[STORAGE_KEYS.expenses] || [];
      state.pendingTransfers = values[STORAGE_KEYS.pendingTransfers] || [];
      state.transferHistory = values[STORAGE_KEYS.transferHistory] || [];
      render();
    }
  );
}

async function fetchServerInfo() {
  if (!["Admin", "Owner"].includes(state.role)) {
    state.serverInfo = null;
    return;
  }

  try {
    const response = await window.PosDb.getServerInfo();
    state.serverInfo = response;
  } catch (error) {
    console.warn("Failed to fetch server info", error);
    state.serverInfo = null;
  }
}

async function fetchOwnerEmployees() {
  if (state.role !== "Owner") {
    state.ownerEmployees = [];
    return;
  }

  try {
    const response = await window.PosDb.getOwnerEmployees();
    state.ownerEmployees = response.employees || [];
    renderOwnerEmployees();
  } catch (error) {
    console.warn("Failed to fetch owner employees", error);
  }
}

function renderServerInfo() {
  if (!elements.serverInfo || !elements.ownerServerInfo) {
    return;
  }

  if (!state.serverInfo) {
    const unavailableMarkup = `
      <div class="summary-row">
        <span>Status</span>
        <strong>Server info unavailable</strong>
      </div>
    `;
    elements.serverInfo.innerHTML = unavailableMarkup;
    elements.ownerServerInfo.innerHTML = unavailableMarkup;
    return;
  }

  const networkText = (state.serverInfo.networkUrls || []).length
    ? state.serverInfo.networkUrls.map((url) => `<div>${escapeHtml(url)}</div>`).join("")
    : "<div>No LAN URL detected</div>";

  const serverMarkup = `
    <div class="summary-row">
      <span>Local URL</span>
      <strong>${escapeHtml(state.serverInfo.localUrl)}</strong>
    </div>
    <div class="summary-row server-info-block">
      <span>LAN URLs</span>
      <strong>${networkText}</strong>
    </div>
  `;
  elements.serverInfo.innerHTML = serverMarkup;
  elements.ownerServerInfo.innerHTML = serverMarkup;
}

async function downloadDatabaseBackup() {
  if (!requireAdmin()) {
    return;
  }

  try {
    const sql = await window.PosDb.downloadBackup();
    const blob = new Blob([sql], { type: "application/sql" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `sweet-shop-pos-backup-${new Date().toISOString().slice(0, 10)}.sql`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    window.alert("Backup failed.");
  }
}

async function restoreDatabaseBackup(event) {
  if (!requireAdmin()) {
    return;
  }

  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const confirmed = window.confirm(
    "Restore will overwrite database objects from the selected SQL backup. Continue?"
  );
  if (!confirmed) {
    event.target.value = "";
    return;
  }

  try {
    const sql = await file.text();
    await window.PosDb.restoreBackup(sql);
    await hydrateState();
    await fetchServerInfo();
    render();
    window.alert("Database restored.");
  } catch (error) {
    window.alert("Restore failed.");
  } finally {
    event.target.value = "";
  }
}

function render() {
  syncFormFields();
  renderAuth();
  renderOutletControls();
  renderFilters();
  renderCatalog();
  renderCart();
  renderSummary();
  renderStats();
  renderPosPaymentBreakdown();
  renderOrders();
  renderAdmin();
  renderOwner();
  renderPendingTransfers();
  renderStockTransferHistory();
  renderServerInfo();
}

function renderOutletControls() {
  const outlets = state.outlets.length ? state.outlets : [{ id: "main", name: "Main Outlet" }];
  const activeOutlet = outlets.find((outlet) => outlet.id === state.activeOutletId) || outlets[0];
  const options = outlets
    .map((outlet) => `<option value="${escapeHtml(outlet.id)}">${escapeHtml(outlet.name)}</option>`)
    .join("");

  [elements.cashierOutletSelect, elements.adminOutletSelect, elements.ownerOutletSelect].forEach((select) => {
    if (!select) {
      return;
    }
    select.innerHTML = options;
    select.value = activeOutlet.id;
  });

  if (elements.posOutletName) {
    elements.posOutletName.textContent = activeOutlet ? `Outlet: ${activeOutlet.name}` : "";
  }
}

async function switchOutlet(outletId) {
  const previousRole = state.role;
  const previousView = state.currentView;
  window.PosDb.setActiveOutletId(outletId);
  await hydrateState();
  state.role = previousRole;
  state.currentView = previousView;
  state.cart = [];
  await window.PosDb.save(STORAGE_KEYS.cart, state.cart);
  render();
}

async function createOutletFromInput(input) {
  const name = input.value.trim();
  if (!name) {
    window.alert("Enter outlet name.");
    return;
  }

  try {
    const outlet = await window.PosDb.createOutlet(name);
    input.value = "";
    await switchOutlet(outlet.id);
  } catch (error) {
    window.alert(error.message || "Could not create outlet.");
  }
}

async function login(role, password) {
  try {
    if (role === "Cashier" && elements.cashierOutletSelect.value) {
      state.activeOutletId = window.PosDb.setActiveOutletId(elements.cashierOutletSelect.value);
    }
    const session = await window.PosDb.login(role, password);
    const nextRole = session.user?.role || null;
    state.role = nextRole;
    state.currentView = nextRole;
    persistState(STORAGE_KEYS.session, nextRole);
    await hydrateState();
    state.role = nextRole;
    state.currentView = nextRole || "login";
    clearLoginInputs();
    showLoginMessage("");
    await fetchOwnerEmployees();
    await fetchServerInfo();
    render();
  } catch (error) {
    showLoginMessage("Wrong password.");
  }
}

async function logout() {
  try {
    await window.PosDb.logout();
  } catch (error) {
    console.warn("Logout failed", error);
  }
  state.role = null;
  state.currentView = "login";
  state.serverInfo = null;
  persistState(STORAGE_KEYS.session, null);
  renderAuth();
}

function renderAuth() {
  const loggedIn = Boolean(state.role);
  const viewingPos = loggedIn && (state.role === "Cashier" || state.currentView === "POS");
  const viewingAdmin = loggedIn && state.role === "Admin" && state.currentView !== "POS";
  const viewingOwner = loggedIn && state.role === "Owner" && state.currentView !== "POS";
  elements.loginScreen.hidden = loggedIn;
  elements.appLayout.hidden = !viewingPos;
  elements.adminLayout.hidden = !viewingAdmin;
  elements.ownerLayout.hidden = !viewingOwner;
  elements.loginScreen.style.display = loggedIn ? "none" : "grid";
  elements.appLayout.style.display = viewingPos ? "grid" : "none";
  elements.adminLayout.style.display = viewingAdmin ? "grid" : "none";
  elements.ownerLayout.style.display = viewingOwner ? "grid" : "none";
  elements.userRole.textContent = loggedIn ? `${state.role} Login` : "";
  elements.posBackDashboard.hidden = !loggedIn || !["Admin", "Owner"].includes(state.role) || state.currentView !== "POS";
  elements.appLayout.classList.toggle("sidebar-collapsed", state.posSidebarCollapsed);
  renderPosSidebarToggle();
}

function renderPosSidebarToggle() {
  if (!elements.posSidebarToggle) {
    return;
  }

  elements.posSidebarToggle.textContent = state.posSidebarCollapsed ? "â˜°" : "Ã—";
  elements.posSidebarToggle.setAttribute(
    "aria-label",
    state.posSidebarCollapsed ? "Open quick actions" : "Hide quick actions"
  );
}

function openPosFromAdmin() {
  if (!["Admin", "Owner"].includes(state.role)) {
    return;
  }
  state.currentView = "POS";
  elements.userRole.textContent = `${state.role} Session`;
  renderAuth();
}

function openPosFromOwner() {
  openPosFromAdmin();
}

function returnToRoleDashboard() {
  if (!["Admin", "Owner"].includes(state.role)) {
    return;
  }

  state.currentView = state.role;
  renderAuth();
}

function togglePosSidebar() {
  state.posSidebarCollapsed = !state.posSidebarCollapsed;
  persistState(STORAGE_KEYS.posSidebarCollapsed, state.posSidebarCollapsed);
  renderAuth();
}

function showLoginMessage(message) {
  elements.loginMessage.hidden = !message;
  elements.loginMessage.textContent = message;
}

function clearLoginInputs() {
  elements.ownerPassword.value = "";
  elements.adminPassword.value = "";
  elements.cashierPassword.value = "";
}

function requireAdmin() {
  if (!["Admin", "Owner"].includes(state.role)) {
    window.alert("Admin or Owner access required.");
    return false;
  }
  return true;
}

function clearAllOrders() {
  if (!requireAdmin()) {
    return;
  }
  state.orders = [];
  persistState(STORAGE_KEYS.orders, state.orders);
  renderOrders();
}

function renderFilters() {
  const categories = ["All", ...new Set(state.products.map((product) => product.category))];
  const buttonsMarkup = categories
    .map(
      (category) => `
        <button
          type="button"
          class="filter-button ${category === state.activeCategory ? "active" : ""}"
          data-category="${escapeHtml(category)}"
        >
          ${escapeHtml(category)}
        </button>
      `
    )
    .join("");

  elements.categoryFilters.innerHTML = buttonsMarkup;
  bindCategoryButtons(elements.categoryFilters);
}

function bindCategoryButtons(container) {
  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      persistState(STORAGE_KEYS.activeCategory, state.activeCategory);
      renderCatalog();
      renderFilters();
    });
  });
}

function renderCatalog() {
  const products = state.products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(state.search) ||
      product.category.toLowerCase().includes(state.search);
    const matchesCategory =
      state.activeCategory === "All" || product.category === state.activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (!products.length) {
    elements.catalog.innerHTML = `<div class="empty-state">No matching products found.</div>`;
    return;
  }

  elements.catalog.innerHTML = products
    .map(
      (product) => `
        <article class="product-card">
          <span class="product-tag">${escapeHtml(product.category)}</span>
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <div class="product-meta">
              <span>${formatCurrency(product.price)} / ${escapeHtml(product.unit)}</span>
              <span class="${product.stock > 0 ? "text-success" : "text-danger"}">
                Stock: ${formatNumber(product.stock)} ${escapeHtml(product.unit)}
              </span>
            </div>
          </div>
          <div class="product-actions">
            <button type="button" class="button" data-add="${product.id}">Add</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.catalog.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => openAddItemDialog(button.dataset.add));
  });
}

function openAddItemDialog(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  state.pendingProductId = productId;
  elements.selectedProductText.textContent = `${product.name} - Default rate ${formatCurrency(product.price)} per ${product.unit}`;
  elements.dialogAmount.value = "";
  elements.dialogQuantity.value = "";
  renderCalculatedQuantity();
  elements.addItemDialog.showModal();
}

function openStockTransferDialog() {
  if (!requireAdmin()) {
    return;
  }

  elements.stockTransferItemList.innerHTML = state.products
    .map(
      (product) =>
          `<option value="${escapeHtml(product.name)}" label="${escapeHtml(`${product.name} (${formatNumber(product.stock)} ${product.unit})`)}"></option>`
    )
    .join("");
  elements.stockTransferItem.value = "";
  elements.stockTransferType.value = "in";
  elements.stockTransferQuantity.value = "";
  elements.stockTransferShelfLife.value = "";
  elements.stockTransferDateFilter.value = "";
  syncStockTransferShelfLife();
  renderStockTransferHistory();
  elements.stockTransferDialog.showModal();
}

function closeStockTransferDialog() {
  elements.stockTransferDialog.close();
}

function scrollToSection(element) {
  if (!element) {
    return;
  }
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openStockTransferPage() {
  window.location.href = "stock-transfer.html";
}

function openStockReceiveHistoryPage() {
  window.location.href = "stock-receive-history.html";
}

function openExpensePage() {
  window.location.href = "expense.html";
}

function openReportsPage() {
  window.location.href = "reports.html";
}

function openPosTodayGlancePage() {
  window.location.href = "pos-today.html";
}

function openPosRecentOrdersPage() {
  window.location.href = "pos-recent-orders.html";
}

function openLedgerPage() {
  window.location.href = "ledger.html";
}

function openTodayAllReportDialog() {
  elements.ownerTodayReportDate.value = getCurrentDateValue();
  elements.ownerTodayReportDialog.showModal();
}

function handleTodayAllReportSubmit(event) {
  event.preventDefault();
  const reportDate = elements.ownerTodayReportDate.value || getCurrentDateValue();
  elements.ownerTodayReportDialog.close();
  window.location.href = `today-report.html?date=${encodeURIComponent(reportDate)}&pdf=1`;
}

function openAdminMenuPage() {
  window.location.href = "admin-menu.html";
}

function openLowStockPage() {
  window.location.href = "low-stock.html";
}

function openStockCheckingPage() {
  window.location.href = "stock-checking.html";
}

function handleStockTransferSubmit(event) {
  event.preventDefault();

  if (!requireAdmin()) {
    return;
  }

  const itemQuery = elements.stockTransferItem.value.trim();
  const transferType = elements.stockTransferType.value;
  const quantityToAdd = Number(elements.stockTransferQuantity.value);
  const shelfLife = transferType === "in" ? elements.stockTransferShelfLife.value.trim() : "";
  const product = resolveStockTransferProduct(itemQuery);

  if (!product || quantityToAdd <= 0) {
    if (!product) {
      window.alert("Choose a valid item from the stock list.");
    }
    return;
  }

  if (transferType === "out" && quantityToAdd > product.stock) {
    window.alert(`Only ${formatNumber(product.stock)} ${product.unit} available in stock.`);
    return;
  }

  const confirmed = window.confirm(
    `Send stock ${transferType === "in" ? "in" : "out"} request for ${formatNumber(quantityToAdd)} ${product.unit} ${transferType === "in" ? "to" : "from"} ${product.name}?`
  );
  if (!confirmed) {
    return;
  }

  const transferId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const quantity = Number(quantityToAdd.toFixed(2));
  const rate = Number(product.price || 0);
  const amount = Number((rate * quantityToAdd).toFixed(2));
  const transferPayload = {
    id: transferId,
    productId: product.id,
    productName: product.name,
    quantity,
    unit: product.unit,
    rate,
    amount,
    shelfLife,
    transferType,
    createdAt,
    requestedBy: state.role || "Admin",
  };

  state.pendingTransfers.unshift(transferPayload);
  state.transferHistory.unshift({
    ...transferPayload,
    status: "Pending",
    acceptedAt: null,
    acceptedBy: null,
  });

  persistState(STORAGE_KEYS.pendingTransfers, state.pendingTransfers);
  persistState(STORAGE_KEYS.transferHistory, state.transferHistory);
  printStockTransferSlip(transferPayload);
  closeStockTransferDialog();
  render();
}

function syncStockTransferShelfLife() {
  const isStockIn = elements.stockTransferType.value === "in";
  elements.stockTransferShelfLifeWrap.hidden = !isStockIn;
  elements.stockTransferShelfLife.disabled = !isStockIn;
  if (!isStockIn) {
    elements.stockTransferShelfLife.value = "";
  }
}

function printStockTransferSlip(transfer) {
  const bytes = buildStockTransferSlipPdf(transfer);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.className = "print-frame";
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.border = "0";
  frame.onload = () => {
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        frame.remove();
      }, 1000);
    }, 300);
  };
  document.body.appendChild(frame);
  frame.src = url;
}

function buildStockTransferSlipPdf(transfer) {
  const pageWidth = 141.73;
  const margin = 1.5;
  const lineGap = 2;
  const textLines = [
    ...wrapStockTransferPdfLine(transfer.productName, 30).slice(0, 4).map((text) => ({ text, size: 11 })),
    { text: `Qty: ${formatNumber(transfer.quantity)} ${transfer.unit}`, size: 8 },
    { text: `Life: ${transfer.shelfLife || "-"}`, size: 8 },
  ];
  const pageHeight = 141.73;
  let y = pageHeight - margin - textLines[0].size;
  const lines = textLines.map((line) => {
    const positionedLine = { ...line, text: sanitizeStockTransferPdfText(line.text), x: margin, y };
    y -= line.size + lineGap;
    return positionedLine;
  });

  return createStockTransferPdfBytes(lines, pageWidth, pageHeight);
}

function createStockTransferPdfBytes(lines, pageWidth, pageHeight) {
  const stream = lines
    .map((line) => `BT /F1 ${line.size} Tf ${line.x} ${line.y} Td (${escapeStockTransferPdfString(line.text)}) Tj ET`)
    .join("\n");
  const objects = [
    "",
    "<< /Type /Catalog /Pages 2 0 R /PageLayout /SinglePage /ViewerPreferences << /PrintScaling /None >> >>",
    "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Rotate 0 /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>`,
  ];
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

function wrapStockTransferPdfLine(value, maxLength) {
  const words = sanitizeStockTransferPdfText(value).split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : ["-"];
}

function sanitizeStockTransferPdfText(value) {
  return String(value || "-").replace(/[^\x20-\x7E]/g, "?");
}

function escapeStockTransferPdfString(value) {
  return sanitizeStockTransferPdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
function resolveStockTransferProduct(query) {
  if (!query) {
    return null;
  }

  const normalizedQuery = query.toLowerCase();
  const exactMatch = state.products.find((item) => item.name.trim().toLowerCase() === normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatches = state.products.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  return null;
}

function renderPendingTransfers() {
  const pendingCount = state.pendingTransfers.length;
  elements.posStockTransferCount.hidden = pendingCount === 0;
  elements.posStockTransferCount.textContent = String(pendingCount);
}

function renderStockTransferHistory() {
  if (!elements.stockTransferHistory) {
    return;
  }

  const selectedDate = elements.stockTransferDateFilter.value;
  const filteredEntries = selectedDate
    ? state.transferHistory.filter((entry) => matchesDate(entry.createdAt, selectedDate))
    : state.transferHistory;

  if (!filteredEntries.length) {
    elements.stockTransferHistory.innerHTML = `<div class="empty-state">No stock transfer entries for the selected date.</div>`;
    return;
  }

  elements.stockTransferHistory.innerHTML = filteredEntries
    .slice(0, 30)
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
            <span>Amount: ${formatCurrency(entry.amount ?? ((entry.rate || 0) * (entry.quantity || 0)))}</span>
            <span>Shelf life: ${escapeHtml(entry.shelfLife || "-")}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function closeAddItemDialog() {
  state.pendingProductId = null;
  elements.addItemDialog.close();
}

function syncDialogFields(source) {
  const product = state.products.find((item) => item.id === state.pendingProductId);
  if (!product || product.price <= 0) {
    renderCalculatedQuantity();
    return;
  }

  if (source === "amount") {
    const amount = Number(elements.dialogAmount.value) || 0;
    const quantity = amount / product.price;
    elements.dialogQuantity.value = quantity > 0 ? quantity.toFixed(4) : "";
  }

  if (source === "quantity") {
    const quantity = Number(elements.dialogQuantity.value) || 0;
    const amount = quantity * product.price;
    elements.dialogAmount.value = quantity > 0 ? amount.toFixed(2) : "";
  }

  renderCalculatedQuantity();
}

function renderCalculatedQuantity() {
  const quantity = Number(elements.dialogQuantity.value) || 0;
  const product = state.products.find((item) => item.id === state.pendingProductId);
  elements.calculatedQuantity.textContent = product ? `${formatNumber(quantity)} ${product.unit}` : formatNumber(quantity);
}

function handleAddItemSubmit(event) {
  event.preventDefault();

  if (!state.pendingProductId) {
    return;
  }

  const amount = Number(elements.dialogAmount.value);
  const quantity = Number(elements.dialogQuantity.value);
  const product = state.products.find((item) => item.id === state.pendingProductId);
  const price = product?.price || 0;

  addToCart(state.pendingProductId, quantity, price);
}

function addToCart(productId, quantity, price) {
  const product = state.products.find((item) => item.id === productId);
  if (!product || quantity <= 0 || price <= 0) {
    return;
  }

  const existing = state.cart.find((item) => item.id === productId);
  const requested = (existing?.quantity || 0) + quantity;
  if (requested > product.stock) {
    window.alert(`Only ${formatNumber(product.stock)} ${product.unit} in stock.`);
    return;
  }

  if (existing) {
    existing.quantity = requested;
    existing.amount = Number((existing.amount + quantity * price).toFixed(2));
    existing.price = requested > 0 ? Number((existing.amount / existing.quantity).toFixed(2)) : price;
    existing.hindiName = product.hindiName || existing.hindiName || getDefaultHindiName(product.name);
    existing.category = product.category || existing.category || "";
    existing.tokenDepartment = product.tokenDepartment || existing.tokenDepartment || product.category || "Counter";
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      hindiName: product.hindiName || getDefaultHindiName(product.name),
      category: product.category,
      tokenDepartment: product.tokenDepartment || product.category || "Counter",
      unit: product.unit,
      price,
      amount: Number((quantity * price).toFixed(2)),
      quantity,
    });
  }

  closeAddItemDialog();
  renderCart();
  renderSummary();
}

function renderCart() {
  persistState(STORAGE_KEYS.cart, state.cart);

  if (!state.cart.length) {
    elements.cartItems.className = "cart-items empty-state";
    elements.cartItems.textContent = "Add products to start billing.";
    return;
  }

  elements.cartItems.className = "cart-items";
  elements.cartItems.innerHTML = state.cart
    .map((item) => {
      const lineTotal = item.amount ?? item.price * item.quantity;
      return `
        <article class="cart-item">
          <div class="cart-row">
            <strong>${escapeHtml(item.name)}</strong>
            <strong>${formatCurrency(lineTotal)}</strong>
          </div>
          <div class="cart-row muted">
            <span>${formatCurrency(item.price)} / ${escapeHtml(item.unit)}</span>
            <span>${formatNumber(item.quantity)} ${escapeHtml(item.unit)}</span>
          </div>
          <div class="cart-controls">
            <button type="button" class="mini-button" data-change="${item.id}" data-delta="-0.25">-</button>
            <button type="button" class="mini-button" data-change="${item.id}" data-delta="0.25">+</button>
            <button type="button" class="ghost-button" data-remove="${item.id}">Remove</button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.cartItems.querySelectorAll("[data-change]").forEach((button) => {
    button.addEventListener("click", () => updateCartQuantity(button.dataset.change, Number(button.dataset.delta)));
  });

  elements.cartItems.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(button.dataset.remove));
  });
}

function updateCartQuantity(productId, delta) {
  const cartItem = state.cart.find((item) => item.id === productId);
  const product = state.products.find((item) => item.id === productId);
  if (!cartItem || !product) {
    return;
  }

  const nextQty = Number((cartItem.quantity + delta).toFixed(2));
  if (nextQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (nextQty > product.stock) {
    window.alert(`Only ${formatNumber(product.stock)} ${product.unit} in stock.`);
    return;
  }

  const unitPrice = cartItem.price;
  cartItem.quantity = nextQty;
  cartItem.amount = Number((unitPrice * nextQty).toFixed(2));
  renderCart();
  renderSummary();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  renderCart();
  renderSummary();
}

function clearCart() {
  state.cart = [];
  renderCart();
  renderSummary();
}

function renderSummary() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.amount ?? item.price * item.quantity), 0);
  const discount = Number(elements.discount.value) || 0;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const total = taxableAmount;
  const gst = getIncludedGstBreakdown(total);
  const splitPayments = getSplitPayments();
  const splitTotal = Object.values(splitPayments).reduce((sum, amount) => sum + amount, 0);
  const splitRemaining = Number((total - splitTotal).toFixed(2));
  const isSplitBill = elements.paymentMethod.value === "Split Bill";

  state.splitPayments = {
    Cash: String(splitPayments.Cash),
    Card: String(splitPayments.Card),
    UPI: String(splitPayments.UPI),
    Credit: String(splitPayments.Credit),
  };

  elements.splitPaymentSection.hidden = !isSplitBill;
  if (isSplitBill) {
    elements.splitPaymentSummary.innerHTML = `
      <div class="summary-row">
        <span>Paid So Far</span>
        <strong>${formatCurrency(splitTotal)}</strong>
      </div>
      <div class="summary-row ${splitRemaining === 0 ? "text-success" : "text-danger"}">
        <span>Remaining</span>
        <strong>${formatCurrency(splitRemaining)}</strong>
      </div>
    `;
  }

  elements.summary.innerHTML = `
    <div class="summary-row">
      <span>Subtotal</span>
      <strong>${formatCurrency(subtotal)}</strong>
    </div>
    <div class="summary-row">
      <span>Discount</span>
      <strong>${formatCurrency(discount)}</strong>
    </div>
    <div class="summary-row">
      <span>CGST (${GST_HALF_RATE}%)</span>
      <strong>${formatCurrency(gst.cgst)}</strong>
    </div>
    <div class="summary-row">
      <span>SGST (${GST_HALF_RATE}%)</span>
      <strong>${formatCurrency(gst.sgst)}</strong>
    </div>
    <div class="summary-row summary-total">
      <span>Total</span>
      <strong>${formatCurrency(total)}</strong>
    </div>
  `;
}

function renderStats() {
  if (!elements.stats) {
    return;
  }

  const todaysOrders = state.orders.filter((order) => isToday(order.createdAt));
  const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.total, 0);
  const todaysDiscount = todaysOrders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
  const todaysExpenses = state.expenses
    .filter((expense) => isToday(expense.createdAt))
    .reduce((sum, expense) => sum + expense.amount, 0);

  elements.stats.innerHTML = `
    <article class="stat-card">
      <span>Today's Sales</span>
      <strong>${formatCurrency(todaysRevenue)}</strong>
    </article>
    <article class="stat-card">
      <span>Orders Today</span>
      <strong>${todaysOrders.length}</strong>
    </article>
    <article class="stat-card">
      <span>Today's Expenses</span>
      <strong>${formatCurrency(todaysExpenses)}</strong>
    </article>
    <article class="stat-card">
      <span>Today's Discount</span>
      <strong>${formatCurrency(todaysDiscount)}</strong>
    </article>
    <article class="stat-card">
      <span>Total Orders</span>
      <strong>${state.orders.length}</strong>
    </article>
  `;
}

function renderPosPaymentBreakdown() {
  if (!elements.posPaymentBreakdown) {
    return;
  }

  const todaysOrders = state.orders.filter((order) => isToday(order.createdAt));
  const paymentTotals = todaysOrders.reduce((acc, order) => {
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

  elements.posPaymentBreakdown.innerHTML = ["Cash", "Card", "UPI", "Credit", "Split Bill"]
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

function renderOwner() {
  if (!elements.ownerStats) {
    return;
  }

  const filteredOrders = getOwnerFilteredOrders();
  const filteredExpenses = getOwnerFilteredExpenses();
  const filteredTransfers = getOwnerFilteredTransferEntries();
  const totalSale = state.orders.reduce((sum, order) => sum + order.total, 0);
  const filteredSale = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const filteredDiscount = filteredOrders.reduce((sum, order) => sum + Number(order.discount || 0), 0);
  const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const itemIn = filteredTransfers
    .filter((entry) => entry.transferType === "in" && entry.status === "Accepted")
    .reduce((sum, entry) => sum + entry.quantity, 0);
  const itemOut = filteredTransfers
    .filter((entry) => entry.transferType === "out" && entry.status === "Accepted")
    .reduce((sum, entry) => sum + entry.quantity, 0);
  const pendingTransfers = filteredTransfers.filter((entry) => entry.status === "Pending").length;
  const paymentTotals = filteredOrders.reduce((acc, order) => {
    if (order.paymentMethod === "Split Bill" && order.paymentBreakdown) {
      Object.entries(order.paymentBreakdown).forEach(([method, amount]) => {
        acc[method] = (acc[method] || 0) + amount;
      });
      acc["Split Bill"] = (acc["Split Bill"] || 0) + order.total;
      return acc;
    }

    acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + order.total;
    return acc;
  }, {});
  const paymentCards = ["Cash", "Card", "UPI", "Credit", "Split Bill"]
    .map(
      (method) => `
        <article class="stat-card">
          <span>${escapeHtml(method)}</span>
          <strong>${formatCurrency(paymentTotals[method] || 0)}</strong>
        </article>
      `
    )
    .join("");

  elements.ownerStats.innerHTML = `
    <article class="stat-card">
      <span>Total Sale</span>
      <strong>${formatCurrency(totalSale)}</strong>
    </article>
    <article class="stat-card">
      <span>${state.ownerDateFilter ? "Filtered Sale" : "Today Sale"}</span>
      <strong>${formatCurrency(filteredSale)}</strong>
    </article>
    <article class="stat-card">
      <span>Expenses</span>
      <strong>${formatCurrency(expenseTotal)}</strong>
    </article>
    <article class="stat-card">
      <span>Today Bills</span>
      <strong>${filteredOrders.length}</strong>
    </article>
    <article class="stat-card">
      <span>Discount</span>
      <strong>${formatCurrency(filteredDiscount)}</strong>
    </article>
    <article class="stat-card">
      <span>Item In</span>
      <strong>${formatNumber(itemIn)}</strong>
    </article>
    ${paymentCards}
  `;

  elements.ownerPayments.innerHTML = paymentCards;

  elements.ownerTransfers.innerHTML = `
    <article class="stat-card">
      <span>Accepted Item In</span>
      <strong>${formatNumber(itemIn)}</strong>
    </article>
    <article class="stat-card">
      <span>Accepted Item Out</span>
      <strong>${formatNumber(itemOut)}</strong>
    </article>
    <article class="stat-card">
      <span>Pending Requests</span>
      <strong>${pendingTransfers}</strong>
    </article>
    <article class="stat-card">
      <span>Total Entries</span>
      <strong>${filteredTransfers.length}</strong>
    </article>
  `;

  renderOwnerEmployees();
  renderOwnerReports(filteredOrders);

  if (!elements.ownerOrders) {
    applyOwnerSectionVisibility();
    return;
  }

  if (!filteredOrders.length) {
    elements.ownerOrders.innerHTML = `<div class="empty-state">No orders found for the selected date.</div>`;
    applyOwnerSectionVisibility();
    return;
  }

  elements.ownerOrders.innerHTML = filteredOrders
    .slice(0, 12)
    .map(
      (order) => `
        <article class="order-card">
          <div class="order-row">
            <strong>${escapeHtml(order.invoiceId)}</strong>
            <strong>${formatCurrency(order.total)}</strong>
          </div>
          <div class="order-row muted">
            <span>${escapeHtml(order.customerName || "Walk-in customer")}</span>
            <span>${escapeHtml(order.paymentMethod)}</span>
          </div>
          <div class="order-row muted">
            <span>${new Date(order.createdAt).toLocaleString("en-IN")}</span>
            <span>${order.items.length} items</span>
          </div>
          <div class="order-row">
            <button type="button" class="ghost-button" data-owner-edit-order="${escapeHtml(order.invoiceId)}">Edit Bill</button>
            <button type="button" class="ghost-button" data-owner-reprint-order="${escapeHtml(order.invoiceId)}">Reprint</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.ownerOrders.querySelectorAll("[data-owner-edit-order]").forEach((button) => {
    button.addEventListener("click", () => openOwnerEditOrderDialog(button.dataset.ownerEditOrder));
  });
  elements.ownerOrders.querySelectorAll("[data-owner-reprint-order]").forEach((button) => {
    button.addEventListener("click", () => reprintOrder(button.dataset.ownerReprintOrder));
  });

  applyOwnerSectionVisibility();
}

function showOwnerSection(sectionName) {
  state.ownerActiveSection = sectionName || "snapshot";
  applyOwnerSectionVisibility();
}

function applyOwnerSectionVisibility() {
  document.querySelectorAll("[data-owner-section]").forEach((section) => {
    section.hidden = section.dataset.ownerSection !== state.ownerActiveSection;
  });
  document.querySelectorAll("[data-owner-section-button]").forEach((button) => {
    button.classList.toggle("active", button.dataset.ownerSectionButton === state.ownerActiveSection);
  });
}

function renderAdmin() {
  if (!elements.adminOrders) {
    return;
  }

  const transferEntries = state.transferHistory.filter((entry) =>
    matchesDate(entry.acceptedAt || entry.createdAt, state.adminDateFilter || getCurrentDateValue())
  );

  if (!transferEntries.length) {
    elements.adminOrders.innerHTML = `<div class="empty-state">No stock transfer entries found for the selected date.</div>`;
    return;
  }

  elements.adminOrders.innerHTML = transferEntries
    .sort((left, right) => new Date(right.acceptedAt || right.createdAt) - new Date(left.acceptedAt || left.createdAt))
    .slice(0, 12)
    .map(
      (entry) => `
        <article class="order-card">
          <div class="order-row">
            <strong>${escapeHtml(entry.productName)}</strong>
            <strong>${formatNumber(entry.quantity)} ${escapeHtml(entry.unit)}</strong>
          </div>
          <div class="order-row muted">
            <span>${entry.transferType === "out" ? "Item Out" : "Item In"}</span>
            <span>${escapeHtml(entry.status || "Pending")}</span>
          </div>
          <div class="order-row muted">
            <span>${new Date(entry.acceptedAt || entry.createdAt).toLocaleString("en-IN")}</span>
            <span>${escapeHtml(entry.requestedBy || "Admin")}</span>
          </div>
          <div class="order-row muted">
            <span>${entry.acceptedBy ? `Accepted by ${escapeHtml(entry.acceptedBy)}` : "Not accepted yet"}</span>
            <span>${escapeHtml(entry.id || "")}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderOwnerEmployees() {
  if (!elements.ownerEmployees) {
    return;
  }

  if (!state.ownerEmployees.length) {
    elements.ownerEmployees.innerHTML = `<div class="empty-state">No employees added yet.</div>`;
    return;
  }

  elements.ownerEmployees.innerHTML = state.ownerEmployees
    .map(
      (employee) => `
        <article class="order-card">
          <div class="order-row">
            <strong>${escapeHtml(employee.display_name || employee.username)}</strong>
            <strong>${escapeHtml(employee.access_scope || employee.role)}</strong>
          </div>
          <div class="order-row muted">
            <span>Login ID</span>
            <span>${escapeHtml(employee.username)}</span>
          </div>
          <div class="order-row muted">
            <span>Updated</span>
            <span>${new Date(employee.updated_at).toLocaleString("en-IN")}</span>
          </div>
          <div class="receipt-actions">
            <button type="button" class="ghost-button" data-owner-edit-employee="${escapeHtml(employee.username)}">Edit</button>
            <button type="button" class="ghost-button" data-owner-delete-employee="${escapeHtml(employee.username)}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.ownerEmployees.querySelectorAll("[data-owner-edit-employee]").forEach((button) => {
    button.addEventListener("click", () => openOwnerEmployeeEdit(button.dataset.ownerEditEmployee));
  });
  elements.ownerEmployees.querySelectorAll("[data-owner-delete-employee]").forEach((button) => {
    button.addEventListener("click", () => deleteOwnerEmployee(button.dataset.ownerDeleteEmployee));
  });
}

function openOwnerEmployeeDialog() {
  if (!state.editingEmployeeUsername) {
    resetOwnerEmployeeForm();
  }
  if (elements.ownerEmployeeDialog?.showModal) {
    elements.ownerEmployeeDialog.showModal();
  }
}

function closeOwnerEmployeeDialog() {
  elements.ownerEmployeeDialog?.close();
  resetOwnerEmployeeForm();
}

function resetOwnerEmployeeForm() {
  state.editingEmployeeUsername = null;
  elements.ownerEmployeeForm.reset();
  elements.ownerEmployeeUsername.value = "";
  elements.ownerEmployeeSubmit.textContent = "Add Employee";
  elements.ownerEmployeeCancelEdit.hidden = true;
  elements.ownerEmployeePassword.required = true;
}

function openOwnerEmployeeEdit(username) {
  const employee = state.ownerEmployees.find((entry) => entry.username === username);
  if (!employee) {
    return;
  }

  state.editingEmployeeUsername = employee.username;
  elements.ownerEmployeeUsername.value = employee.username;
  elements.ownerEmployeeName.value = employee.display_name || "";
  elements.ownerEmployeeAccess.value = employee.access_scope || "Cashier";
  elements.ownerEmployeePassword.value = "";
  elements.ownerEmployeePassword.required = false;
  elements.ownerEmployeeSubmit.textContent = "Save Changes";
  elements.ownerEmployeeCancelEdit.hidden = false;
  openOwnerEmployeeDialog();
}

async function deleteOwnerEmployee(username) {
  if (state.role !== "Owner") {
    window.alert("Owner access required.");
    return;
  }

  const employee = state.ownerEmployees.find((entry) => entry.username === username);
  if (!employee) {
    return;
  }

  if (!window.confirm(`Delete employee ${employee.display_name || employee.username}?`)) {
    return;
  }

  try {
    await window.PosDb.deleteOwnerEmployee(username);
    if (state.editingEmployeeUsername === username) {
      resetOwnerEmployeeForm();
    }
    await fetchOwnerEmployees();
  } catch (error) {
    window.alert("Failed to delete employee.");
  }
}

async function handleOwnerEmployeeSubmit(event) {
  event.preventDefault();

  if (state.role !== "Owner") {
    window.alert("Owner access required.");
    return;
  }

  const name = elements.ownerEmployeeName.value.trim();
  const access = elements.ownerEmployeeAccess.value;
  const password = elements.ownerEmployeePassword.value;
  if (!name || (!state.editingEmployeeUsername && !password)) {
    return;
  }

  try {
    if (state.editingEmployeeUsername) {
      await window.PosDb.updateOwnerEmployee(state.editingEmployeeUsername, { name, access, password });
    } else {
      await window.PosDb.createOwnerEmployee({ name, access, password });
    }
    resetOwnerEmployeeForm();
    await fetchOwnerEmployees();
  } catch (error) {
    window.alert(state.editingEmployeeUsername ? "Failed to update employee." : "Failed to add employee.");
  }
}

function renderOwnerReports(filteredOrders) {
  const itemStats = getItemSalesStats(filteredOrders);
  const totalQuantitySold = itemStats.reduce((sum, item) => sum + item.quantitySold, 0);
  const averageOrderValue = filteredOrders.length
    ? filteredOrders.reduce((sum, order) => sum + order.total, 0) / filteredOrders.length
    : 0;
  const uniqueItemsSold = itemStats.length;
  const topItem = itemStats[0] || null;

  elements.ownerReportSummary.innerHTML = `
    <article class="stat-card">
      <span>Quantity Sold</span>
      <strong>${formatNumber(totalQuantitySold)}</strong>
    </article>
    <article class="stat-card">
      <span>Unique Items Sold</span>
      <strong>${uniqueItemsSold}</strong>
    </article>
    <article class="stat-card">
      <span>Average Bill Value</span>
      <strong>${formatCurrency(averageOrderValue)}</strong>
    </article>
    <article class="stat-card">
      <span>Most Selling Item</span>
      <strong>${escapeHtml(topItem ? topItem.name : "No sales")}</strong>
    </article>
  `;

  if (!itemStats.length) {
    elements.ownerTopItems.innerHTML = `<div class="empty-state">No item sales for the selected date.</div>`;
    elements.ownerItemReport.innerHTML = `<div class="empty-state">No item sales report for the selected date.</div>`;
    return;
  }

  elements.ownerTopItems.innerHTML = itemStats
    .slice(0, 5)
    .map(
      (item, index) => `
        <article class="order-card">
          <div class="order-row">
            <strong>#${index + 1} ${escapeHtml(item.name)}</strong>
            <strong>${formatNumber(item.quantitySold)} ${escapeHtml(item.unit)}</strong>
          </div>
          <div class="order-row muted">
            <span>Sales Amount</span>
            <span>${formatCurrency(item.salesAmount)}</span>
          </div>
          <div class="order-row muted">
            <span>Daily Requirement</span>
            <span>${formatNumber(item.dailyRequirement)} ${escapeHtml(item.unit)}</span>
          </div>
        </article>
      `
    )
    .join("");

  elements.ownerItemReport.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Sold Qty</th>
          <th>Sales Amount</th>
          <th>Daily Requirement</th>
          <th>Current Stock</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${itemStats
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${formatNumber(item.quantitySold)} ${escapeHtml(item.unit)}</td>
                <td>${formatCurrency(item.salesAmount)}</td>
                <td>${formatNumber(item.dailyRequirement)} ${escapeHtml(item.unit)}</td>
                <td>${formatNumber(item.currentStock)} ${escapeHtml(item.unit)}</td>
                <td>${escapeHtml(item.currentStock <= item.dailyRequirement ? "Restock Soon" : "Healthy")}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function getItemSalesStats(filteredOrders) {
  const salesByItem = new Map();

  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      const existing = salesByItem.get(item.id) || {
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantitySold: 0,
        salesAmount: 0,
      };

      existing.quantitySold += Number(item.quantity || 0);
      existing.salesAmount += Number(item.amount ?? (item.price * item.quantity) ?? 0);
      salesByItem.set(item.id, existing);
    });
  });

  return [...salesByItem.values()]
    .map((item) => {
      const product = state.products.find((productItem) => productItem.id === item.id);
      return {
        ...item,
        currentStock: Number(product?.stock ?? 0),
        dailyRequirement: getDailyRequirement(item.id),
      };
    })
    .sort((left, right) => right.quantitySold - left.quantitySold);
}

function getDailyRequirement(productId) {
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return date.toISOString().slice(0, 10);
  });

  const totalQuantity = state.orders.reduce((sum, order) => {
    if (!lastSevenDays.includes(new Date(order.createdAt).toISOString().slice(0, 10))) {
      return sum;
    }

    const soldItem = order.items.find((item) => item.id === productId);
    return sum + Number(soldItem?.quantity || 0);
  }, 0);

  return Number((totalQuantity / 7).toFixed(2));
}

function getOwnerFilteredOrders() {
  return state.orders.filter((order) =>
    matchesDate(order.createdAt, state.ownerDateFilter || getCurrentDateValue())
  );
}

function getAdminFilteredOrders() {
  return state.orders.filter((order) =>
    matchesDate(order.createdAt, state.adminDateFilter || getCurrentDateValue())
  );
}

function getOwnerFilteredExpenses() {
  return state.expenses.filter((expense) =>
    matchesDate(expense.createdAt, state.ownerDateFilter || getCurrentDateValue())
  );
}

function getOwnerFilteredTransferEntries() {
  return state.transferHistory.filter((entry) =>
    matchesDate(entry.acceptedAt || entry.createdAt, state.ownerDateFilter || getCurrentDateValue())
  );
}

function getLowStockProducts() {
  return state.products
    .filter((product) => product.stock <= Number(product.minStock ?? 5))
    .sort((left, right) => left.stock - right.stock);
}

function renderOrders() {
  if (!elements.orderHistory) {
    return;
  }

  const filteredOrders = state.orders.filter((order) =>
    matchesDate(order.createdAt, state.recentOrdersDateFilter || getCurrentDateValue())
  );

  if (!filteredOrders.length) {
    elements.orderHistory.innerHTML = `<div class="empty-state">No orders found for the selected date.</div>`;
    return;
  }

  elements.orderHistory.innerHTML = filteredOrders
    .slice(0, 8)
    .map(
      (order) => `
        <article class="order-card">
          <div class="order-row">
            <strong>${escapeHtml(order.invoiceId)}</strong>
            <strong>${formatCurrency(order.total)}</strong>
          </div>
          <div class="order-row muted">
            <span>${escapeHtml(order.customerName || "Walk-in customer")}</span>
            <span>${escapeHtml(order.paymentMethod)}</span>
          </div>
          <div class="order-row muted">
            <span>${new Date(order.createdAt).toLocaleString("en-IN")}</span>
            <span>${order.items.length} items</span>
          </div>
          <div class="order-row">
            <span></span>
            <button type="button" class="ghost-button" data-reprint-order="${escapeHtml(order.invoiceId)}">Reprint</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.orderHistory.querySelectorAll("[data-reprint-order]").forEach((button) => {
    button.addEventListener("click", () => reprintOrder(button.dataset.reprintOrder));
  });
}

async function completeSale() {
  if (!state.cart.length) {
    window.alert("Cart is empty.");
    return;
  }

  const subtotal = state.cart.reduce((sum, item) => sum + (item.amount ?? item.price * item.quantity), 0);
  const discount = Number(elements.discount.value) || 0;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const total = taxableAmount;
  const gst = getIncludedGstBreakdown(total);
  const paymentMethod = elements.paymentMethod.value;
  const splitPayments = getSplitPayments();
  const splitTotal = Object.values(splitPayments).reduce((sum, amount) => sum + amount, 0);

  if (paymentMethod === "Split Bill") {
    if (Math.abs(splitTotal - total) > 0.01) {
      window.alert("Split payment total must match the full bill amount.");
      return;
    }
  }

  const order = {
    customerName: elements.customerName.value.trim(),
    paymentMethod,
    paymentBreakdown: paymentMethod === "Split Bill" ? splitPayments : null,
    items: state.cart.map(enrichOrderItemForToken),
    subtotal,
    discount,
    taxRate: GST_RATE,
    tax: gst.total,
    cgst: gst.cgst,
    sgst: gst.sgst,
    gstIncluded: true,
    total,
  };

  try {
    const response = await window.PosDb.completeOrder(order);
    const completedOrder = response.order;
    state.products = (response.products || []).map((product) => ({
      ...product,
      minStock: Number(product.minStock ?? 5),
    }));
    state.orders = response.orders || [];
    persistState(STORAGE_KEYS.products, state.products);
    persistState(STORAGE_KEYS.orders, state.orders);

    showReceipt(completedOrder, "bill", { allowTokenPrint: true });
    showConfirmation(completedOrder);
    clearCart();
    state.customerName = "";
    state.discount = "0";
    state.taxRate = String(GST_RATE);
    state.paymentMethod = "Cash";
    resetSplitPayments();
    persistState(STORAGE_KEYS.customerName, state.customerName);
    persistState(STORAGE_KEYS.discount, state.discount);
    persistState(STORAGE_KEYS.taxRate, state.taxRate);
    persistState(STORAGE_KEYS.paymentMethod, state.paymentMethod);
    render();
  } catch (error) {
    window.alert(error.message || "Sale failed.");
  }
}

function enrichOrderItemForToken(item) {
  const product = state.products.find((productItem) => productItem.id === item.id);
  return {
    ...item,
    hindiName: item.hindiName || product?.hindiName || getDefaultHindiName(item.name),
    category: item.category || product?.category || "",
    tokenDepartment: item.tokenDepartment || product?.tokenDepartment || product?.category || "Counter",
  };
}

function getIncludedGstBreakdown(total) {
  const taxableValue = Number(total || 0) / (1 + GST_RATE / 100);
  const cgst = Number((taxableValue * (GST_HALF_RATE / 100)).toFixed(2));
  const sgst = Number((taxableValue * (GST_HALF_RATE / 100)).toFixed(2));
  return {
    cgst,
    sgst,
    total: Number((cgst + sgst).toFixed(2)),
  };
}

function getOrderGstBreakdown(order) {
  if (Number.isFinite(Number(order.cgst)) && Number.isFinite(Number(order.sgst))) {
    return {
      cgst: Number(order.cgst || 0),
      sgst: Number(order.sgst || 0),
      total: Number(order.tax || 0),
    };
  }
  return getIncludedGstBreakdown(order.total);
}

function showReceipt(order, mode = "bill", options = {}) {
  state.activeReceiptOrder = order;
  state.activeReceiptMode = mode;
  state.allowTokenPrint = options.allowTokenPrint ?? state.allowTokenPrint ?? true;
  elements.printToken.hidden = !state.allowTokenPrint;
  elements.receiptContent.classList.toggle("token-print", mode === "token");
  elements.receiptContent.innerHTML =
    mode === "token" ? renderTokenMarkup(order, options.tokenDepartmentGroups) : renderBillMarkup(order);
  if (!elements.receiptDialog.open) {
    elements.receiptDialog.showModal();
  }
}

function renderBillMarkup(order) {
  const paymentDetails = getPaymentBreakdownText(order);
  const gst = getOrderGstBreakdown(order);
  const billRows = order.items
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
        <div class="receipt-meta-row">
          <span>Invoice</span>
          <strong>${escapeHtml(order.invoiceId)}</strong>
        </div>
        <div class="receipt-meta-row">
          <span>Date</span>
          <strong>${new Date(order.createdAt).toLocaleString("en-IN")}</strong>
        </div>
        <div class="receipt-meta-row">
          <span>Customer</span>
          <strong>${escapeHtml(order.customerName || "Walk-in customer")}</strong>
        </div>
        <div class="receipt-meta-row">
          <span>Payment</span>
          <strong>${escapeHtml(order.paymentMethod)}</strong>
        </div>
        ${
          paymentDetails
            ? `<p class="receipt-muted receipt-payment-note">${escapeHtml(
                paymentDetails.replace(/^\s*-\s*/, "")
              )}</p>`
            : ""
        }
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>${billRows}</tbody>
      </table>
      <div class="summary-row"><span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong></div>
      <div class="summary-row"><span>Discount</span><strong>${formatCurrency(order.discount)}</strong></div>
      <div class="summary-row"><span>CGST (${GST_HALF_RATE}%)</span><strong>${formatCurrency(gst.cgst)}</strong></div>
      <div class="summary-row"><span>SGST (${GST_HALF_RATE}%)</span><strong>${formatCurrency(gst.sgst)}</strong></div>
      <div class="summary-row summary-total"><span>Total</span><strong>${formatCurrency(order.total)}</strong></div>
      <p class="receipt-footer">Items: ${order.items.length} | Please keep this receipt for exchange and records.</p>
    </section>
  `;
}

function renderTokenMarkup(order, tokenDepartmentGroups = null) {
  const departmentGroups = tokenDepartmentGroups || getTokenDepartmentGroups(order);
  return `
    <div class="token-page-stack">
      ${departmentGroups
        .map(
          (group, index) => `
            <section class="receipt-copy token-copy token-department-copy${index > 0 ? " token-department-copy--new-page" : ""}${index < departmentGroups.length - 1 ? " token-department-copy--cut" : ""}">
              <div class="receipt-brand token-brand">
                <h3 class="token-shop-name">Ramesh sweets</h3>
                <p class="receipt-kicker token-kicker">TOKEN DEPARTMENT</p>
                <strong class="token-department">${escapeHtml(group.department)}</strong>
              <p class="receipt-muted token-subtitle">
                  ${escapeHtml(order.invoiceId)} ${getTokenPageText(group, index, departmentGroups.length)}
                  <br />${new Date(order.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <div class="token-total-wrap">
                <span class="token-total-label">TOTAL BILL</span>
                <strong class="token-total-value">${formatCurrency(order.total)}</strong>
              </div>
              <div class="token-items">
                ${group.items
                  .map(
                    (item) => `
                      <div class="token-item-row">
                        <span>
                          <strong class="token-item-name">${escapeHtml(item.name)}</strong>
                          <em class="token-item-hindi">${escapeHtml(item.hindiName || getDefaultHindiName(item.name))}</em>
                        </span>
                        <strong class="token-item-qty">${formatNumber(item.quantity)} ${escapeHtml(item.unit)}</strong>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </section>
            ${index < departmentGroups.length - 1 ? '<div class="token-page-break" aria-hidden="true"></div>' : ""}
          `
        )
        .join("")}
    </div>
  `;
}

function getTokenDepartmentGroups(order) {
  const groups = new Map();
  (order.items || []).forEach((item) => {
    const product = state.products.find((productItem) => productItem.id === item.id);
    const department = item.tokenDepartment || product?.tokenDepartment || item.category || product?.category || "Counter";
    const enrichedItem = {
      ...item,
      hindiName: item.hindiName || product?.hindiName || getDefaultHindiName(item.name),
      category: item.category || product?.category || "",
      tokenDepartment: department,
    };
    if (!groups.has(department)) {
      groups.set(department, []);
    }
    groups.get(department).push(enrichedItem);
  });

  return [...groups.entries()].map(([department, items]) => ({ department, items }));
}

function getTokenPageText(group, index, total) {
  const pageNumber = group.pageNumber || index + 1;
  const totalPages = group.totalPages || total;
  return totalPages > 1 ? `(${pageNumber}/${totalPages})` : "";
}

function getDefaultHindiName(name) {
  const hindiNames = {
    "kaju katli": "à¤•à¤¾à¤œà¥‚ à¤•à¤¤à¤²à¥€",
    "gulab jamun": "à¤—à¥à¤²à¤¾à¤¬ à¤œà¤¾à¤®à¥à¤¨",
    "rasgulla tin": "à¤°à¤¸à¤—à¥à¤²à¥à¤²à¤¾ à¤Ÿà¤¿à¤¨",
    "motichoor ladoo": "à¤®à¥‹à¤¤à¥€à¤šà¥‚à¤° à¤²à¤¡à¥à¤¡à¥‚",
    "samosa": "à¤¸à¤®à¥‹à¤¸à¤¾",
    "dry fruit box": "à¤¡à¥à¤°à¤¾à¤ˆ à¤«à¥à¤°à¥‚à¤Ÿ à¤¬à¥‰à¤•à¥à¤¸",
  };
  return hindiNames[String(name || "").trim().toLowerCase()] || "";
}

function printActiveReceipt() {
  window.print();
}

function printReceiptForMode(mode) {
  if (!state.activeReceiptOrder) {
    return;
  }
  if (mode === "token" && !state.allowTokenPrint) {
    return;
  }

  if (mode === "token") {
    printDepartmentTokensAsSeparateJobs(state.activeReceiptOrder);
    return;
  }

  showReceipt(state.activeReceiptOrder, mode, { allowTokenPrint: state.allowTokenPrint });
  printActiveReceipt();
}

function printDepartmentTokensAsSeparateJobs(order) {
  const departmentGroups = getTokenDepartmentGroups(order);
  if (departmentGroups.length <= 1) {
    showReceipt(order, "token", { allowTokenPrint: state.allowTokenPrint });
    printActiveReceipt();
    return;
  }

  state.tokenPrintQueue = departmentGroups;
  state.tokenPrintOrder = order;
  state.tokenPrintIndex = 0;
  printNextTokenDepartment();
}

function printNextTokenDepartment() {
  const order = state.tokenPrintOrder;
  const groups = state.tokenPrintQueue;
  if (!order || !groups.length) {
    return;
  }

  if (state.tokenPrintIndex >= groups.length) {
    state.tokenPrintQueue = [];
    state.tokenPrintOrder = null;
    state.tokenPrintIndex = 0;
    showReceipt(order, "token", { allowTokenPrint: state.allowTokenPrint });
    return;
  }

  const groupIndex = state.tokenPrintIndex;
  const group = {
    ...groups[groupIndex],
    pageNumber: groupIndex + 1,
    totalPages: groups.length,
  };
  state.tokenPrintIndex += 1;
  showReceipt(order, "token", {
    allowTokenPrint: state.allowTokenPrint,
    tokenDepartmentGroups: [group],
  });
  setTimeout(printActiveReceipt, 150);
}

function handleAfterPrint() {
  if (!state.tokenPrintQueue.length || !state.tokenPrintOrder) {
    return;
  }
  setTimeout(printNextTokenDepartment, 250);
}

function reprintOrder(invoiceId) {
  const order = state.orders.find((item) => item.invoiceId === invoiceId);
  if (!order) {
    window.alert("Order not found.");
    return;
  }

  if (elements.confirmationDialog.open) {
    elements.confirmationDialog.close();
  }
  showReceipt(order, "bill", { allowTokenPrint: false });
  printActiveReceipt();
}

function openOwnerEditOrderDialog(invoiceId) {
  const order = state.orders.find((item) => item.invoiceId === invoiceId);
  if (!order) {
    window.alert("Order not found.");
    return;
  }

  state.editingOrderInvoiceId = invoiceId;
  elements.ownerEditOrderInvoiceId.value = invoiceId;
  elements.ownerEditCustomerName.value = order.customerName || "";
  elements.ownerEditPaymentMethod.value = order.paymentMethod;
  elements.ownerEditDiscount.value = String(order.discount ?? 0);
  elements.ownerEditTaxRate.value = String(order.taxRate ?? 0);
  renderOwnerEditOrderSummary();
  elements.ownerEditOrderDialog.showModal();
}

function closeOwnerEditOrderDialog() {
  state.editingOrderInvoiceId = null;
  elements.ownerEditOrderDialog.close();
}

function renderOwnerEditOrderSummary() {
  const order = state.orders.find((item) => item.invoiceId === state.editingOrderInvoiceId);
  if (!order) {
    elements.ownerEditOrderSummary.innerHTML = "";
    return;
  }

  const discount = Number(elements.ownerEditDiscount.value) || 0;
  const taxRate = Number(elements.ownerEditTaxRate.value) || 0;
  const taxableAmount = Math.max(order.subtotal - discount, 0);
  const tax = taxableAmount * (taxRate / 100);
  const total = taxableAmount + tax;

  elements.ownerEditOrderSummary.innerHTML = `
    <div class="summary-row">
      <span>Subtotal</span>
      <strong>${formatCurrency(order.subtotal)}</strong>
    </div>
    <div class="summary-row">
      <span>Discount</span>
      <strong>${formatCurrency(discount)}</strong>
    </div>
    <div class="summary-row">
      <span>Tax</span>
      <strong>${formatCurrency(tax)}</strong>
    </div>
    <div class="summary-row summary-total">
      <span>New Total</span>
      <strong>${formatCurrency(total)}</strong>
    </div>
  `;
}

function handleOwnerOrderEditSubmit(event) {
  event.preventDefault();

  if (state.role !== "Owner") {
    window.alert("Owner access required.");
    return;
  }

  const order = state.orders.find((item) => item.invoiceId === state.editingOrderInvoiceId);
  if (!order) {
    return;
  }

  const customerName = elements.ownerEditCustomerName.value.trim();
  const paymentMethod = elements.ownerEditPaymentMethod.value;
  const discount = Number(elements.ownerEditDiscount.value) || 0;
  const taxRate = Number(elements.ownerEditTaxRate.value) || 0;
  const taxableAmount = Math.max(order.subtotal - discount, 0);
  const tax = taxableAmount * (taxRate / 100);
  const total = taxableAmount + tax;
  const paymentBreakdown =
    paymentMethod === "Split Bill"
      ? order.paymentBreakdown || { Cash: Number(total.toFixed(2)), Card: 0, UPI: 0, Credit: 0 }
      : null;

  state.orders = state.orders.map((item) =>
    item.invoiceId === state.editingOrderInvoiceId
      ? {
          ...item,
          customerName,
          paymentMethod,
          paymentBreakdown,
          discount,
          taxRate,
          tax: Number(tax.toFixed(2)),
          total: Number(total.toFixed(2)),
        }
      : item
  );

  persistState(STORAGE_KEYS.orders, state.orders);
  closeOwnerEditOrderDialog();
  render();
}

function deleteOwnerBill() {
  if (state.role !== "Owner") {
    window.alert("Owner access required.");
    return;
  }

  const invoiceId = state.editingOrderInvoiceId;
  const order = state.orders.find((item) => item.invoiceId === invoiceId);
  if (!order) {
    window.alert("Order not found.");
    return;
  }

  const confirmed = window.confirm(`Delete bill ${invoiceId}? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  state.orders = state.orders.filter((item) => item.invoiceId !== invoiceId);
  persistState(STORAGE_KEYS.orders, state.orders);
  closeOwnerEditOrderDialog();
  render();
}

function showConfirmation(order) {
  elements.confirmationContent.innerHTML = `
    <p class="eyebrow">Sale Confirmed</p>
    <h3>Order Completed</h3>
    <div class="summary">
      <div class="summary-row">
        <span>Invoice</span>
        <strong>${escapeHtml(order.invoiceId)}</strong>
      </div>
      <div class="summary-row">
        <span>Customer</span>
        <strong>${escapeHtml(order.customerName || "Walk-in customer")}</strong>
      </div>
      <div class="summary-row">
        <span>Payment</span>
        <strong>${escapeHtml(order.paymentMethod)}</strong>
      </div>
      ${getPaymentBreakdownRows(order)}
      <div class="summary-row">
        <span>Items</span>
        <strong>${order.items.length}</strong>
      </div>
      <div class="summary-row summary-total">
        <span>Total</span>
        <strong>${formatCurrency(order.total)}</strong>
      </div>
    </div>
    <p class="muted">The bill has been saved. You can return to billing or print the receipt.</p>
  `;

  if (elements.receiptDialog.open) {
    elements.receiptDialog.close();
  }
  elements.confirmationDialog.showModal();
}

function getSplitPayments() {
  return {
    Cash: Number(elements.splitCash.value) || 0,
    Card: Number(elements.splitCard.value) || 0,
    UPI: Number(elements.splitUpi.value) || 0,
    Credit: Number(elements.splitCredit.value) || 0,
  };
}

function resetSplitPayments() {
  state.splitPayments = { Cash: "0", Card: "0", UPI: "0", Credit: "0" };
}

function getPaymentBreakdownText(order) {
  if (!order.paymentBreakdown) {
    return "";
  }

  const details = Object.entries(order.paymentBreakdown)
    .filter(([, amount]) => amount > 0)
    .map(([method, amount]) => `${method}: ${formatCurrency(amount)}`)
    .join(", ");

  return details ? `<br />Split: ${escapeHtml(details)}` : "";
}

function getPaymentBreakdownRows(order) {
  if (!order.paymentBreakdown) {
    return "";
  }

  return Object.entries(order.paymentBreakdown)
    .filter(([, amount]) => amount > 0)
    .map(
      ([method, amount]) => `
      <div class="summary-row muted">
        <span>${escapeHtml(method)}</span>
        <strong>${formatCurrency(amount)}</strong>
      </div>`
    )
    .join("");
}
function syncFormFields() {
  elements.searchInput.value = state.search;
  elements.customerName.value = state.customerName;
  elements.discount.value = state.discount;
  elements.taxRate.value = state.taxRate;
  elements.paymentMethod.value = state.paymentMethod;
  if (elements.recentOrdersDateFilter) {
    elements.recentOrdersDateFilter.value = state.recentOrdersDateFilter;
  }
  elements.adminDateFilter.value = state.adminDateFilter;
  elements.ownerDateFilter.value = state.ownerDateFilter;
  elements.splitCash.value = state.splitPayments.Cash;
  elements.splitCard.value = state.splitPayments.Card;
  elements.splitUpi.value = state.splitPayments.UPI;
  elements.splitCredit.value = state.splitPayments.Credit;
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

function formatNumber(value) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function isToday(isoString) {
  const now = new Date();
  const value = new Date(isoString);
  return (
    value.getDate() === now.getDate() &&
    value.getMonth() === now.getMonth() &&
    value.getFullYear() === now.getFullYear()
  );
}

function getCurrentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function matchesDate(isoString, dateValue) {
  return new Date(isoString).toISOString().slice(0, 10) === dateValue;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


























