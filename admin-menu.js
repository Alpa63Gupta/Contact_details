const STORAGE_KEYS = {
  products: "sweet-shop-pos:products",
  categories: "sweet-shop-pos:categories",
  session: "sweet-shop-pos:session",
};

const elements = {
  menuCategoryForm: document.querySelector("#menuCategoryForm"),
  menuCategoryName: document.querySelector("#menuCategoryName"),
  menuCategoryNameStatus: document.querySelector("#menuCategoryNameStatus"),
  menuItemForm: document.querySelector("#menuItemForm"),
  menuItemId: document.querySelector("#menuItemId"),
  menuItemName: document.querySelector("#menuItemName"),
  menuItemNameStatus: document.querySelector("#menuItemNameStatus"),
  menuItemHindiName: document.querySelector("#menuItemHindiName"),
  menuItemCategory: document.querySelector("#menuItemCategory"),
  menuItemCategoryStatus: document.querySelector("#menuItemCategoryStatus"),
  menuItemTokenDepartment: document.querySelector("#menuItemTokenDepartment"),
  menuCategoryOptions: document.querySelector("#menuCategoryOptions"),
  menuItemUnit: document.querySelector("#menuItemUnit"),
  menuItemPrice: document.querySelector("#menuItemPrice"),
  menuItemStock: document.querySelector("#menuItemStock"),
  menuItemMinStock: document.querySelector("#menuItemMinStock"),
  menuItemSubmit: document.querySelector("#menuItemSubmit"),
  menuItemCancel: document.querySelector("#menuItemCancel"),
  menuSummary: document.querySelector("#menuSummary"),
  menuSearchForm: document.querySelector("#menuSearchForm"),
  menuSearchInput: document.querySelector("#menuSearchInput"),
  menuSearchClear: document.querySelector("#menuSearchClear"),
  menuList: document.querySelector("#menuList"),
};

const state = {
  products: [],
  categories: [],
  role: null,
  editingProductId: null,
  search: "",
};

initialize();

async function initialize() {
  bindEvents();
  await hydrateState();
  await hydrateSession();
  guardAdmin();
  startLiveSync();
  render();
}

function bindEvents() {
  elements.menuCategoryForm.addEventListener("submit", handleCategorySubmit);
  elements.menuItemForm.addEventListener("submit", handleMenuItemSubmit);
  elements.menuItemCancel.addEventListener("click", resetForm);
  elements.menuCategoryName.addEventListener("input", renderFieldStatuses);
  elements.menuItemName.addEventListener("input", renderFieldStatuses);
  elements.menuItemCategory.addEventListener("input", renderFieldStatuses);
  elements.menuSearchForm.addEventListener("submit", handleSearchSubmit);
  elements.menuSearchClear.addEventListener("click", clearSearch);
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.products]: [],
    [STORAGE_KEYS.categories]: [],
    [STORAGE_KEYS.session]: null,
  });

  state.products = stored[STORAGE_KEYS.products].map((product) => ({
    ...product,
    minStock: Number(product.minStock ?? 5),
  }));
  state.categories = stored[STORAGE_KEYS.categories] || [];
  state.role = stored[STORAGE_KEYS.session];
}

async function hydrateSession() {
  try {
    const session = await window.PosDb.getSession();
    state.role = session.user?.role || state.role;
  } catch (error) {
    console.warn("Failed to hydrate admin session", error);
  }
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.products, STORAGE_KEYS.categories], (values) => {
    state.products = (values[STORAGE_KEYS.products] || []).map((product) => ({
      ...product,
      minStock: Number(product.minStock ?? 5),
    }));
    state.categories = values[STORAGE_KEYS.categories] || [];
    render();
  });
}

function guardAdmin() {
  if (state.role === "Admin") {
    return;
  }

  window.alert("Admin access required.");
  window.location.href = "index.html";
}

function handleCategorySubmit(event) {
  event.preventDefault();

  const categoryName = elements.menuCategoryName.value.trim();
  if (!categoryName) {
    return;
  }

  const exists = getAllCategories().some(
    (category) => category.toLowerCase() === categoryName.toLowerCase()
  );
  if (exists) {
    window.alert("This category already exists.");
    return;
  }

  state.categories = [...state.categories, categoryName].sort((left, right) => left.localeCompare(right));
  persistState(STORAGE_KEYS.categories, state.categories);
  elements.menuCategoryForm.reset();
  renderCategoryOptions();
}

function handleMenuItemSubmit(event) {
  event.preventDefault();

  const productId = elements.menuItemId.value || crypto.randomUUID();
  const name = elements.menuItemName.value.trim();
  const hindiName = elements.menuItemHindiName.value.trim();
  const category = elements.menuItemCategory.value.trim();
  const tokenDepartment = elements.menuItemTokenDepartment.value.trim();
  const unit = elements.menuItemUnit.value.trim();
  const price = Number(elements.menuItemPrice.value);
  const stock = Number(elements.menuItemStock.value);
  const minStock = Number(elements.menuItemMinStock.value);

  if (!name || !category || !tokenDepartment || !unit || price <= 0 || stock < 0 || minStock < 0) {
    return;
  }

  const nextProduct = {
    id: productId,
    name,
    hindiName,
    category,
    tokenDepartment,
    unit,
    price: Number(price.toFixed(2)),
    stock: Number(stock.toFixed(2)),
    minStock: Number(minStock.toFixed(2)),
  };

  if (state.editingProductId) {
    state.products = state.products.map((product) =>
      product.id === state.editingProductId ? nextProduct : product
    );
  } else {
    state.products.unshift(nextProduct);
  }

  if (!state.categories.some((item) => item.toLowerCase() === category.toLowerCase())) {
    state.categories = [...state.categories, category].sort((left, right) => left.localeCompare(right));
    persistState(STORAGE_KEYS.categories, state.categories);
  }

  persistState(STORAGE_KEYS.products, state.products);
  resetForm();
  render();
}

function render() {
  renderCategoryOptions();
  renderSummary();
  renderList();
  renderFieldStatuses();
}

function renderFieldStatuses() {
  renderStatus(
    elements.menuCategoryNameStatus,
    getNameStatus(elements.menuCategoryName.value, getAllCategories(), "Category")
  );
  renderStatus(
    elements.menuItemNameStatus,
    getNameStatus(
      elements.menuItemName.value,
      state.products
        .filter((product) => product.id !== state.editingProductId)
        .map((product) => product.name),
      "Item name"
    )
  );
  renderStatus(
    elements.menuItemCategoryStatus,
    getNameStatus(elements.menuItemCategory.value, getAllCategories(), "Category")
  );
}

function getNameStatus(value, existingValues, label) {
  const normalizedValue = normalizeName(value);
  if (!normalizedValue) {
    return { text: "", state: "" };
  }

  const exists = existingValues.some((item) => normalizeName(item) === normalizedValue);
  return exists
    ? { text: `${label} is already present.`, state: "exists" }
    : { text: `${label} is available.`, state: "available" };
}

function renderStatus(element, status) {
  element.textContent = status.text;
  element.classList.toggle("is-present", status.state === "exists");
  element.classList.toggle("is-available", status.state === "available");
}

function renderCategoryOptions() {
  const categories = getAllCategories();
  elements.menuCategoryOptions.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");
}

function getAllCategories() {
  return [...new Set([...state.categories, ...state.products.map((product) => product.category)].filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function renderSummary() {
  const totalItems = state.products.length;
  const totalStockAmount = state.products.reduce(
    (sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0),
    0
  );

  elements.menuSummary.innerHTML = `
    <div class="summary-row">
      <span>Total Items</span>
      <strong>${totalItems}</strong>
    </div>
    <div class="summary-row">
      <span>Total Stock Amount</span>
      <strong>${formatCurrency(totalStockAmount)}</strong>
    </div>
    <div class="summary-row">
      <span>Session</span>
      <strong>${escapeHtml(state.role || "Guest")}</strong>
    </div>
  `;
}

function renderList() {
  const products = getFilteredProducts();
  elements.menuSearchInput.value = state.search;
  elements.menuSearchClear.hidden = !state.search;

  if (!state.products.length) {
    elements.menuList.innerHTML = `<div class="empty-state">No items in the catalog.</div>`;
    return;
  }

  if (!products.length) {
    elements.menuList.innerHTML = `<div class="empty-state">No item cards match "${escapeHtml(state.search)}".</div>`;
    return;
  }

  elements.menuList.innerHTML = products
    .map(
      (product) => `
        <article class="item-detail-card">
          <div class="item-detail-card__header">
            <div>
              <span class="product-tag">${escapeHtml(product.category)}</span>
              <h2>${escapeHtml(product.name)}</h2>
            </div>
            <strong>${formatCurrency(product.price)}</strong>
          </div>
          <div class="item-detail-grid">
            <div class="item-detail-field">
              <span>Item Name</span>
              <strong>${escapeHtml(product.name)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Hindi Name</span>
              <strong>${escapeHtml(product.hindiName || "-")}</strong>
            </div>
            <div class="item-detail-field">
              <span>Category</span>
              <strong>${escapeHtml(product.category)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Token Department</span>
              <strong>${escapeHtml(product.tokenDepartment || product.category || "Counter")}</strong>
            </div>
            <div class="item-detail-field">
              <span>Unit</span>
              <strong>${escapeHtml(product.unit)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Price</span>
              <strong>${formatCurrency(product.price)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Opening Stock</span>
              <strong>${formatNumber(product.stock)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Minimum Stock</span>
              <strong>${formatNumber(product.minStock ?? 5)}</strong>
            </div>
          </div>
          <div class="item-detail-card__actions">
            <button type="button" class="ghost-button" data-edit-item="${product.id}">Edit Details</button>
            <button type="button" class="ghost-button" data-edit-min-stock="${product.id}">Set Limit</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.menuList.querySelectorAll("[data-edit-item]").forEach((button) => {
    button.addEventListener("click", () => startEditItem(button.dataset.editItem));
  });

  elements.menuList.querySelectorAll("[data-edit-min-stock]").forEach((button) => {
    button.addEventListener("click", () => updateMinStock(button.dataset.editMinStock));
  });
}

function handleSearchSubmit(event) {
  event.preventDefault();
  state.search = elements.menuSearchInput.value.trim();
  renderList();
}

function clearSearch() {
  state.search = "";
  elements.menuSearchInput.value = "";
  renderList();
  elements.menuSearchInput.focus();
}

function getFilteredProducts() {
  const query = normalizeName(state.search);
  if (!query) {
    return state.products;
  }

  return state.products.filter((product) =>
    [
      product.name,
      product.hindiName,
      product.category,
      product.tokenDepartment,
      product.unit,
      formatCurrency(product.price),
      formatNumber(product.stock),
      formatNumber(product.minStock ?? 5),
    ]
      .map(normalizeName)
      .some((value) => value.includes(query))
  );
}

function startEditItem(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  state.editingProductId = productId;
  elements.menuItemId.value = product.id;
  elements.menuItemName.value = product.name;
  elements.menuItemHindiName.value = product.hindiName || "";
  elements.menuItemCategory.value = product.category;
  elements.menuItemTokenDepartment.value = product.tokenDepartment || product.category || "";
  elements.menuItemUnit.value = product.unit;
  elements.menuItemPrice.value = product.price;
  elements.menuItemStock.value = product.stock;
  elements.menuItemMinStock.value = product.minStock ?? 5;
  elements.menuItemSubmit.textContent = "Save Changes";
  elements.menuItemCancel.hidden = false;
  renderFieldStatuses();
  elements.menuItemName.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateMinStock(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  const nextValue = window.prompt(
    `Enter minimum stock limit for ${product.name}`,
    String(product.minStock ?? 5)
  );
  if (nextValue === null) {
    return;
  }

  const minStock = Number(nextValue);
  if (Number.isNaN(minStock) || minStock < 0) {
    window.alert("Enter a valid minimum stock limit.");
    return;
  }

  state.products = state.products.map((item) =>
    item.id === productId ? { ...item, minStock: Number(minStock.toFixed(2)) } : item
  );
  persistState(STORAGE_KEYS.products, state.products);
  render();
}

function resetForm() {
  state.editingProductId = null;
  elements.menuItemForm.reset();
  elements.menuItemId.value = "";
  elements.menuItemSubmit.textContent = "Add Item";
  elements.menuItemCancel.hidden = true;
  renderFieldStatuses();
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
