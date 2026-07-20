const STORAGE_KEYS = {
  ledgerEntries: "sweet-shop-pos:ledger-entries",
  employeeProfiles: "sweet-shop-pos:employee-profiles",
  attendance: "sweet-shop-pos:employee-attendance",
  session: "sweet-shop-pos:session",
};

const elements = {
  ledgerEntryForm: document.querySelector("#ledgerEntryForm"),
  ledgerEntryId: document.querySelector("#ledgerEntryId"),
  ledgerPartyType: document.querySelector("#ledgerPartyType"),
  ledgerPartyName: document.querySelector("#ledgerPartyName"),
  ledgerEntryType: document.querySelector("#ledgerEntryType"),
  ledgerAmount: document.querySelector("#ledgerAmount"),
  ledgerEntryDate: document.querySelector("#ledgerEntryDate"),
  ledgerNotes: document.querySelector("#ledgerNotes"),
  ledgerSubmit: document.querySelector("#ledgerSubmit"),
  ledgerCancelEdit: document.querySelector("#ledgerCancelEdit"),
  ledgerFilters: document.querySelector("#ledgerFilters"),
  ledgerFromDate: document.querySelector("#ledgerFromDate"),
  ledgerToDate: document.querySelector("#ledgerToDate"),
  ledgerToday: document.querySelector("#ledgerToday"),
  ledgerAllVendors: document.querySelector("#ledgerAllVendors"),
  ledgerAllEmployees: document.querySelector("#ledgerAllEmployees"),
  ledgerEntriesNav: document.querySelector("#ledgerEntriesNav"),
  ledgerAttendanceNav: document.querySelector("#ledgerAttendanceNav"),
  ledgerEntriesPage: document.querySelector("#ledgerEntriesPage"),
  ledgerAttendancePage: document.querySelector("#ledgerAttendancePage"),
  printLedger: document.querySelector("#printLedger"),
  ledgerSummary: document.querySelector("#ledgerSummary"),
  ledgerEntries: document.querySelector("#ledgerEntries"),
  createEmployeeProfile: document.querySelector("#createEmployeeProfile"),
  employeeProfileForm: document.querySelector("#employeeProfileForm"),
  employeeProfileId: document.querySelector("#employeeProfileId"),
  employeeProfileName: document.querySelector("#employeeProfileName"),
  employeeProfileDailySalary: document.querySelector("#employeeProfileDailySalary"),
  employeeProfileSalaryMonth: document.querySelector("#employeeProfileSalaryMonth"),
  employeeProfileNotes: document.querySelector("#employeeProfileNotes"),
  employeeProfileSubmit: document.querySelector("#employeeProfileSubmit"),
  employeeProfileCancel: document.querySelector("#employeeProfileCancel"),
  attendanceForm: document.querySelector("#attendanceForm"),
  attendanceId: document.querySelector("#attendanceId"),
  attendanceEmployeeName: document.querySelector("#attendanceEmployeeName"),
  attendanceDate: document.querySelector("#attendanceDate"),
  attendanceStatus: document.querySelector("#attendanceStatus"),
  attendanceDailySalary: document.querySelector("#attendanceDailySalary"),
  attendanceCalculatedSalary: document.querySelector("#attendanceCalculatedSalary"),
  attendanceNotes: document.querySelector("#attendanceNotes"),
  attendanceSubmit: document.querySelector("#attendanceSubmit"),
  attendanceCancelEdit: document.querySelector("#attendanceCancelEdit"),
  attendanceSummary: document.querySelector("#attendanceSummary"),
  attendanceEntries: document.querySelector("#attendanceEntries"),
};

const state = {
  entries: [],
  employeeProfiles: [],
  attendance: [],
  role: null,
  editingEntryId: null,
  editingEmployeeProfileId: null,
  editingAttendanceId: null,
  partyFilter: "All",
  activeLedgerPage: "entries",
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
  elements.ledgerEntryForm.addEventListener("submit", handleEntrySubmit);
  elements.ledgerCancelEdit.addEventListener("click", resetLedgerForm);
  elements.ledgerFilters.addEventListener("submit", (event) => {
    event.preventDefault();
    state.fromDate = elements.ledgerFromDate.value || getCurrentDateValue();
    state.toDate = elements.ledgerToDate.value || state.fromDate;
    render();
  });
  elements.ledgerToday.addEventListener("click", () => {
    state.fromDate = getCurrentDateValue();
    state.toDate = getCurrentDateValue();
    render();
  });
  elements.ledgerAllVendors.addEventListener("click", () => {
    window.location.href = "ledger-parties.html?type=Vendor";
  });
  elements.ledgerAllEmployees.addEventListener("click", () => {
    window.location.href = "ledger-parties.html?type=Employee";
  });
  elements.ledgerEntriesNav.addEventListener("click", () => showLedgerPage("entries"));
  elements.ledgerAttendanceNav.addEventListener("click", () => showLedgerPage("attendance"));
  elements.printLedger.addEventListener("click", () => window.print());
  elements.createEmployeeProfile.addEventListener("click", openEmployeeProfileForm);
  elements.employeeProfileForm.addEventListener("submit", handleEmployeeProfileSubmit);
  elements.employeeProfileCancel.addEventListener("click", resetEmployeeProfileForm);
  elements.employeeProfileSalaryMonth.addEventListener("input", syncEmployeeProfileSalaryForMonth);
  elements.attendanceForm.addEventListener("submit", handleAttendanceSubmit);
  elements.attendanceCancelEdit.addEventListener("click", resetAttendanceForm);
  elements.attendanceStatus.addEventListener("input", renderAttendanceCalculation);
  elements.attendanceEmployeeName.addEventListener("input", syncAttendanceSalaryFromProfile);
  elements.attendanceDate.addEventListener("input", syncAttendanceSalaryFromProfile);
}

async function hydrateState() {
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.ledgerEntries]: [],
    [STORAGE_KEYS.employeeProfiles]: [],
    [STORAGE_KEYS.attendance]: [],
    [STORAGE_KEYS.session]: null,
  });

  state.entries = stored[STORAGE_KEYS.ledgerEntries] || [];
  state.employeeProfiles = stored[STORAGE_KEYS.employeeProfiles] || [];
  state.attendance = stored[STORAGE_KEYS.attendance] || [];
  state.role = stored[STORAGE_KEYS.session];
}

async function hydrateSession() {
  try {
    const session = await window.PosDb.getSession();
    state.role = session.user?.role || state.role;
  } catch (error) {
    console.warn("Failed to hydrate ledger session", error);
  }
}

function startLiveSync() {
  window.PosDb.watch([STORAGE_KEYS.ledgerEntries, STORAGE_KEYS.employeeProfiles, STORAGE_KEYS.attendance], (values) => {
    state.entries = values[STORAGE_KEYS.ledgerEntries] || [];
    state.employeeProfiles = values[STORAGE_KEYS.employeeProfiles] || [];
    state.attendance = values[STORAGE_KEYS.attendance] || [];
    render();
  });
}

function handleEntrySubmit(event) {
  event.preventDefault();

  const partyName = elements.ledgerPartyName.value.trim();
  const amount = Number(elements.ledgerAmount.value);
  if (!partyName || amount <= 0) {
    return;
  }

  const nextEntry = {
    id: state.editingEntryId || crypto.randomUUID(),
    partyType: elements.ledgerPartyType.value,
    partyName,
    entryType: elements.ledgerEntryType.value,
    amount: Number(amount.toFixed(2)),
    notes: elements.ledgerNotes.value.trim(),
    createdAt: `${elements.ledgerEntryDate.value || getCurrentDateValue()}T${new Date().toTimeString().slice(0, 8)}`,
    createdBy: state.role || "Admin",
    updatedAt: new Date().toISOString(),
  };

  if (state.editingEntryId) {
    if (!isOwnerRole()) {
      window.alert("Owner access required to edit ledger entries.");
      return;
    }
    state.entries = state.entries.map((entry) =>
      entry.id === state.editingEntryId ? { ...entry, ...nextEntry } : entry
    );
  } else {
    state.entries.unshift(nextEntry);
  }

  persistEntries();
  resetLedgerForm();
  render();
}

function render() {
  normalizeDateRange();
  elements.ledgerFromDate.value = state.fromDate;
  elements.ledgerToDate.value = state.toDate;
  elements.ledgerEntryDate.value ||= getCurrentDateValue();
  elements.attendanceDate.value ||= getCurrentDateValue();
  renderEmployeeProfileAccess();
  showLedgerPage(state.activeLedgerPage);

  const entries = getFilteredEntries();
  const attendanceEntries = getFilteredAttendance();
  const attendanceStats = getAttendanceStats(attendanceEntries);
  const vendors = new Set(entries.filter((entry) => entry.partyType === "Vendor").map((entry) => normalizeName(entry.partyName)));
  const employees = new Set(state.employeeProfiles.map((profile) => normalizeName(profile.name)));
  const debitCount = entries.filter((entry) => entry.entryType === "Debit").length;
  const creditCount = entries.filter((entry) => entry.entryType === "Credit").length;
  const totalDebit = entries
    .filter((entry) => entry.entryType === "Debit")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const totalCredit = entries
    .filter((entry) => entry.entryType === "Credit")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const totalBalance = totalCredit - totalDebit;
  const ownerBalanceCard =
    isOwnerRole()
      ? `
        <article class="stat-card">
          <span>Total Balance</span>
          <strong>${formatCurrency(totalBalance)}</strong>
        </article>
      `
      : "";

  elements.ledgerSummary.innerHTML = `
    ${ownerBalanceCard}
    <article class="stat-card">
      <span>Entries</span>
      <strong>${entries.length}</strong>
    </article>
    <article class="stat-card">
      <span>Vendors</span>
      <strong>${vendors.size}</strong>
    </article>
    <article class="stat-card">
      <span>Employees</span>
      <strong>${employees.size}</strong>
    </article>
    <article class="stat-card">
      <span>Debit / Credit Entries</span>
      <strong>${debitCount} / ${creditCount}</strong>
    </article>
  `;
  elements.ledgerAllVendors.classList.toggle("active", state.partyFilter === "Vendor");
  elements.ledgerAllEmployees.classList.toggle("active", state.partyFilter === "Employee");
  renderAttendanceTools(attendanceEntries, attendanceStats);

  if (state.partyFilter === "Vendor" || state.partyFilter === "Employee") {
    renderPartyDetails(entries, state.partyFilter);
  } else {
    renderEntries(entries);
  }
}

function showLedgerPage(page) {
  state.activeLedgerPage = page;
  const isAttendancePage = page === "attendance";
  elements.ledgerEntriesPage.hidden = isAttendancePage;
  elements.ledgerAttendancePage.hidden = !isAttendancePage;
  elements.ledgerEntriesNav.classList.toggle("active", !isAttendancePage);
  elements.ledgerAttendanceNav.classList.toggle("active", isAttendancePage);
}

function handleEmployeeProfileSubmit(event) {
  event.preventDefault();

  if (!isOwnerRole()) {
    window.alert("Owner access required to create employee profiles.");
    return;
  }

  const name = elements.employeeProfileName.value.trim();
  const dailySalary = Number(elements.employeeProfileDailySalary.value);
  const salaryMonth = elements.employeeProfileSalaryMonth.value || getCurrentMonthValue();
  if (!name || dailySalary < 0) {
    return;
  }

  const duplicate = state.employeeProfiles.find(
    (profile) => profile.id !== state.editingEmployeeProfileId && normalizeName(profile.name) === normalizeName(name)
  );
  if (duplicate) {
    window.alert("This employee profile already exists.");
    return;
  }

  const existingProfile = state.employeeProfiles.find((profile) => profile.id === state.editingEmployeeProfileId);
  const nextSalaryHistory = upsertSalaryHistory(existingProfile ? getSalaryHistory(existingProfile) : [], salaryMonth, dailySalary);
  const nextProfile = {
    id: state.editingEmployeeProfileId || crypto.randomUUID(),
    name,
    dailySalary: Number(dailySalary.toFixed(2)),
    salaryMonth,
    salaryHistory: nextSalaryHistory,
    notes: elements.employeeProfileNotes.value.trim(),
    createdAt: existingProfile?.createdAt || new Date().toISOString(),
    createdBy: state.role || "Owner",
    updatedAt: new Date().toISOString(),
  };

  if (state.editingEmployeeProfileId) {
    state.employeeProfiles = state.employeeProfiles.map((profile) =>
      profile.id === state.editingEmployeeProfileId ? { ...profile, ...nextProfile } : profile
    );
  } else {
    state.employeeProfiles.unshift(nextProfile);
  }

  persistEmployeeProfiles();
  resetEmployeeProfileForm();
  render();
}

function handleAttendanceSubmit(event) {
  event.preventDefault();

  const employeeProfile = getSelectedEmployeeProfile();
  const employeeName = employeeProfile?.name || "";
  const attendanceDate = elements.attendanceDate.value || getCurrentDateValue();
  const dailySalary = getProfileSalaryForDate(employeeProfile, attendanceDate);
  if (!employeeProfile) {
    window.alert("Please select an employee from the created employee list.");
    return;
  }

  const duplicate = state.attendance.find(
    (entry) =>
      entry.id !== state.editingAttendanceId &&
      normalizeName(entry.employeeName) === normalizeName(employeeName) &&
      getDateKey(entry.createdAt) === attendanceDate
  );
  if (duplicate && !window.confirm("Attendance for this employee and date already exists. Replace it?")) {
    return;
  }

  const salaryAmount = calculateAttendanceSalary(dailySalary, elements.attendanceStatus.value);
  const nextEntry = {
    id: state.editingAttendanceId || duplicate?.id || crypto.randomUUID(),
    employeeName,
    status: elements.attendanceStatus.value,
    dailySalary: Number(dailySalary.toFixed(2)),
    salaryAmount: Number(salaryAmount.toFixed(2)),
    notes: elements.attendanceNotes.value.trim(),
    createdAt: `${attendanceDate}T${new Date().toTimeString().slice(0, 8)}`,
    createdBy: state.role || "Admin",
    updatedAt: new Date().toISOString(),
  };

  if (state.editingAttendanceId || duplicate) {
    state.attendance = state.attendance.map((entry) => (entry.id === nextEntry.id ? { ...entry, ...nextEntry } : entry));
  } else {
    state.attendance.unshift(nextEntry);
  }

  persistAttendance();
  resetAttendanceForm();
  render();
}

function renderAttendanceTools(attendanceEntries, stats) {
  renderAttendanceEmployeeList();
  syncAttendanceSalaryFromProfile();
  renderEmployeeProfileList();
  elements.attendanceSummary.innerHTML = `
    <article class="stat-card">
      <span>Present Days</span>
      <strong>${formatNumber(stats.presentDays)}</strong>
    </article>
    <article class="stat-card">
      <span>Half Days</span>
      <strong>${formatNumber(stats.halfDays)}</strong>
    </article>
    <article class="stat-card">
      <span>Absent Days</span>
      <strong>${formatNumber(stats.absentDays)}</strong>
    </article>
    <article class="stat-card">
      <span>Salary Payable</span>
      <strong>${formatCurrency(stats.salaryPayable)}</strong>
    </article>
  `;
  renderAttendanceEntries(attendanceEntries);
}

function renderAttendanceEmployeeList() {
  const selectedValue = elements.attendanceEmployeeName.value;
  const options = getSortedEmployeeProfiles()
    .map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>`)
    .join("");
  elements.attendanceEmployeeName.innerHTML = `<option value="">Select employee</option>${options}`;
  if (state.employeeProfiles.some((profile) => profile.id === selectedValue)) {
    elements.attendanceEmployeeName.value = selectedValue;
  }
}

function renderEmployeeProfileAccess() {
  const isOwner = isOwnerRole();
  elements.ledgerAllVendors.hidden = !isOwner;
  elements.ledgerAllEmployees.hidden = !isOwner;
  elements.ledgerAllVendors.disabled = !isOwner;
  elements.ledgerAllEmployees.disabled = !isOwner;
  elements.ledgerAllVendors.style.display = isOwner ? "" : "none";
  elements.ledgerAllEmployees.style.display = isOwner ? "" : "none";
  elements.createEmployeeProfile.hidden = !isOwner;
  elements.createEmployeeProfile.disabled = !isOwner;
  elements.createEmployeeProfile.style.display = isOwner ? "" : "none";
  if (!isOwner) {
    elements.employeeProfileForm.hidden = true;
    elements.employeeProfileForm.style.display = "none";
  } else {
    elements.employeeProfileForm.style.display = "";
  }
}

function renderEmployeeProfileList() {
  const existing = document.querySelector("#employeeProfileList");
  if (existing) {
    existing.remove();
  }
  if (!isOwnerRole() || !state.employeeProfiles.length) {
    return;
  }
  const list = document.createElement("div");
  list.id = "employeeProfileList";
  list.className = "history-list";
  list.innerHTML = getSortedEmployeeProfiles()
    .map(
      (profile) => `
        <article class="order-card">
          <div class="order-row">
            <strong>${escapeHtml(profile.name)}</strong>
            <strong>${formatCurrency(getProfileSalaryForDate(profile, getCurrentDateValue()))} / day</strong>
          </div>
          <div class="order-row muted">
            <span>${escapeHtml(getSalaryStructureText(profile))}</span>
            <button type="button" class="ghost-button" data-edit-employee-profile="${escapeHtml(profile.id)}">Edit</button>
          </div>
          <div class="order-row muted">
            <span>${escapeHtml(profile.notes || "Employee profile")}</span>
          </div>
        </article>
      `
    )
    .join("");
  elements.employeeProfileForm.after(list);
  list.querySelectorAll("[data-edit-employee-profile]").forEach((button) => {
    button.addEventListener("click", () => startEditEmployeeProfile(button.dataset.editEmployeeProfile));
  });
}

function openEmployeeProfileForm() {
  if (!isOwnerRole()) {
    window.alert("Owner access required to create employee profiles.");
    return;
  }
  if (!elements.employeeProfileSalaryMonth.value) {
    elements.employeeProfileSalaryMonth.value = getCurrentMonthValue();
  }
  elements.employeeProfileForm.hidden = false;
  elements.employeeProfileName.focus();
}

function startEditEmployeeProfile(profileId) {
  if (!isOwnerRole()) {
    window.alert("Owner access required to edit employee profiles.");
    return;
  }
  const profile = state.employeeProfiles.find((item) => item.id === profileId);
  if (!profile) {
    window.alert("Employee profile not found.");
    return;
  }
  state.editingEmployeeProfileId = profileId;
  elements.employeeProfileId.value = profileId;
  elements.employeeProfileName.value = profile.name;
  elements.employeeProfileSalaryMonth.value = getCurrentMonthValue();
  elements.employeeProfileDailySalary.value = getProfileSalaryForMonth(profile, elements.employeeProfileSalaryMonth.value);
  elements.employeeProfileNotes.value = profile.notes || "";
  elements.employeeProfileSubmit.textContent = "Save Employee";
  elements.employeeProfileForm.hidden = false;
  elements.employeeProfileName.focus();
}

function resetEmployeeProfileForm() {
  state.editingEmployeeProfileId = null;
  elements.employeeProfileForm.reset();
  elements.employeeProfileId.value = "";
  elements.employeeProfileSalaryMonth.value = getCurrentMonthValue();
  elements.employeeProfileSubmit.textContent = "Save Employee";
  elements.employeeProfileForm.hidden = true;
}

function syncEmployeeProfileSalaryForMonth() {
  if (!state.editingEmployeeProfileId) {
    return;
  }
  const profile = state.employeeProfiles.find((item) => item.id === state.editingEmployeeProfileId);
  if (!profile) {
    return;
  }
  elements.employeeProfileDailySalary.value = getProfileSalaryForMonth(profile, elements.employeeProfileSalaryMonth.value);
}

function renderAttendanceEntries(entries) {
  if (!entries.length) {
    elements.attendanceEntries.innerHTML = `<div class="empty-state">No employee attendance found for this date.</div>`;
    return;
  }

  elements.attendanceEntries.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Employee</th>
          <th>Status</th>
          <th>Daily Salary</th>
          <th>Salary</th>
          <th>Notes</th>
          <th>Added By</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${entries
          .map(
            (entry) => `
              <tr>
                <td>${formatDateTime(entry.createdAt)}</td>
                <td>${escapeHtml(entry.employeeName)}</td>
                <td>${escapeHtml(entry.status)}</td>
                <td>${formatCurrency(entry.dailySalary)}</td>
                <td>${formatCurrency(entry.salaryAmount)}</td>
                <td>${escapeHtml(entry.notes || "-")}</td>
                <td>${escapeHtml(entry.createdBy || "Admin")}</td>
                <td><button type="button" class="ghost-button" data-edit-attendance="${escapeHtml(entry.id)}">Edit</button></td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  elements.attendanceEntries.querySelectorAll("[data-edit-attendance]").forEach((button) => {
    button.addEventListener("click", () => startEditAttendance(button.dataset.editAttendance));
  });
}

function startEditAttendance(entryId) {
  const entry = state.attendance.find((item) => item.id === entryId);
  if (!entry) {
    window.alert("Attendance entry not found.");
    return;
  }

  state.editingAttendanceId = entryId;
  const profile = getEmployeeProfileByName(entry.employeeName);
  elements.attendanceId.value = entryId;
  elements.attendanceEmployeeName.value = profile?.id || "";
  elements.attendanceDate.value = getDateKey(entry.createdAt);
  elements.attendanceStatus.value = entry.status;
  elements.attendanceNotes.value = entry.notes || "";
  elements.attendanceSubmit.textContent = "Save Attendance";
  elements.attendanceCancelEdit.hidden = false;
  syncAttendanceSalaryFromProfile();
  elements.attendanceEmployeeName.focus();
}

function resetAttendanceForm() {
  state.editingAttendanceId = null;
  elements.attendanceForm.reset();
  elements.attendanceId.value = "";
  elements.attendanceStatus.value = "Present";
  elements.attendanceDate.value = getCurrentDateValue();
  elements.attendanceSubmit.textContent = "Save Attendance";
  elements.attendanceCancelEdit.hidden = true;
  syncAttendanceSalaryFromProfile();
}

function renderPartyDetails(entries, partyType) {
  const parties = getPartySummaries(entries);
  if (!parties.length) {
    elements.ledgerEntries.innerHTML = `<div class="empty-state">No ${partyType.toLowerCase()} entries found for this date.</div>`;
    return;
  }

  elements.ledgerEntries.innerHTML = `
    <div class="ledger-party-grid">
      ${parties
        .map(
          (party) => `
            <article class="ledger-party-card">
              <div class="ledger-party-card__header">
                <div>
                  <span class="product-tag">${escapeHtml(partyType)}</span>
                  <h2>${escapeHtml(party.name)}</h2>
                </div>
                <strong class="${party.balance >= 0 ? "text-success" : "text-danger"}">${formatCurrency(party.balance)}</strong>
              </div>
              <div class="item-detail-grid">
                <div class="item-detail-field">
                  <span>Total Debit / Paid</span>
                  <strong>${formatCurrency(party.debit)}</strong>
                </div>
                <div class="item-detail-field">
                  <span>Total Credit / Payable</span>
                  <strong>${formatCurrency(party.credit)}</strong>
                </div>
                <div class="item-detail-field">
                  <span>Balance</span>
                  <strong>${formatCurrency(party.balance)}</strong>
                </div>
                <div class="item-detail-field">
                  <span>Entries</span>
                  <strong>${party.entries.length}</strong>
                </div>
              </div>
              <div class="history-list ledger-party-entries">
                ${party.entries
                  .slice(0, 6)
                  .map(
                    (entry) => `
                      <div class="order-card">
                        <div class="order-row">
                          <strong>${escapeHtml(entry.entryType)}</strong>
                          <strong>${formatCurrency(entry.amount)}</strong>
                        </div>
                        <div class="order-row muted">
                          <span>${formatDateTime(entry.createdAt)}</span>
                          <span>${escapeHtml(entry.notes || "-")}</span>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function getPartySummaries(entries) {
  const parties = new Map();
  entries.forEach((entry) => {
    const key = normalizeName(entry.partyName);
    if (!parties.has(key)) {
      parties.set(key, {
        name: entry.partyName,
        debit: 0,
        credit: 0,
        balance: 0,
        entries: [],
      });
    }
    const party = parties.get(key);
    const amount = Number(entry.amount || 0);
    if (entry.entryType === "Debit") {
      party.debit += amount;
    } else {
      party.credit += amount;
    }
    party.balance = party.credit - party.debit;
    party.entries.push(entry);
  });

  return [...parties.values()].sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));
}

function renderEntries(entries) {
  if (!entries.length) {
    elements.ledgerEntries.innerHTML = `<div class="empty-state">No ledger entries found for this date.</div>`;
    return;
  }

  elements.ledgerEntries.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Name</th>
          <th>Entry</th>
          <th>Amount</th>
          <th>Notes</th>
          <th>Added By</th>
          ${isOwnerRole() ? "<th>Action</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${entries
          .map(
            (entry) => `
              <tr>
                <td>${formatDateTime(entry.createdAt)}</td>
                <td>${escapeHtml(entry.partyType)}</td>
                <td>${escapeHtml(entry.partyName)}</td>
                <td>${escapeHtml(entry.entryType)}</td>
                <td>${formatCurrency(entry.amount)}</td>
                <td>${escapeHtml(entry.notes || "-")}</td>
                <td>${escapeHtml(entry.createdBy || "Admin")}</td>
                ${
                  isOwnerRole()
                    ? `<td><button type="button" class="ghost-button" data-edit-ledger="${escapeHtml(entry.id)}">Edit</button></td>`
                    : ""
                }
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  elements.ledgerEntries.querySelectorAll("[data-edit-ledger]").forEach((button) => {
    button.addEventListener("click", () => startEditEntry(button.dataset.editLedger));
  });
}

function startEditEntry(entryId) {
  if (!isOwnerRole()) {
    window.alert("Owner access required to edit ledger entries.");
    return;
  }

  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry) {
    window.alert("Ledger entry not found.");
    return;
  }

  state.editingEntryId = entryId;
  elements.ledgerEntryId.value = entryId;
  elements.ledgerPartyType.value = entry.partyType;
  elements.ledgerPartyName.value = entry.partyName;
  elements.ledgerEntryType.value = entry.entryType;
  elements.ledgerAmount.value = entry.amount;
  elements.ledgerEntryDate.value = new Date(entry.createdAt).toISOString().slice(0, 10);
  elements.ledgerNotes.value = entry.notes || "";
  elements.ledgerSubmit.textContent = "Save Entry";
  elements.ledgerCancelEdit.hidden = false;
  elements.ledgerPartyName.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetLedgerForm() {
  state.editingEntryId = null;
  elements.ledgerEntryForm.reset();
  elements.ledgerEntryId.value = "";
  elements.ledgerSubmit.textContent = "Add Entry";
  elements.ledgerCancelEdit.hidden = true;
  elements.ledgerEntryDate.value = getCurrentDateValue();
}

function getFilteredEntries() {
  return state.entries
    .filter((entry) => isWithinRange(entry.createdAt))
    .filter((entry) => state.partyFilter === "All" || entry.partyType === state.partyFilter)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function getFilteredAttendance() {
  return state.attendance
    .filter((entry) => isWithinRange(entry.createdAt))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function getAttendanceStats(entries) {
  return entries.reduce(
    (stats, entry) => {
      if (entry.status === "Present" || entry.status === "Paid Leave") {
        stats.presentDays += 1;
      } else if (entry.status === "Half Day") {
        stats.presentDays += 0.5;
        stats.halfDays += 1;
      } else if (entry.status === "Absent") {
        stats.absentDays += 1;
      }
      stats.salaryPayable += Number(entry.salaryAmount || 0);
      return stats;
    },
    { presentDays: 0, halfDays: 0, absentDays: 0, salaryPayable: 0 }
  );
}

function calculateAttendanceSalary(dailySalary, status) {
  const multipliers = {
    Present: 1,
    "Half Day": 0.5,
    Absent: 0,
    "Paid Leave": 1,
  };
  return Number(dailySalary || 0) * (multipliers[status] ?? 0);
}

function renderAttendanceCalculation() {
  const attendanceDate = elements.attendanceDate.value || getCurrentDateValue();
  const dailySalary = getProfileSalaryForDate(getSelectedEmployeeProfile(), attendanceDate);
  const salaryAmount = calculateAttendanceSalary(dailySalary, elements.attendanceStatus.value);
  elements.attendanceDailySalary.value = dailySalary ? formatCurrency(dailySalary) : "";
  elements.attendanceCalculatedSalary.value = formatCurrency(salaryAmount);
}

function syncAttendanceSalaryFromProfile() {
  renderAttendanceCalculation();
}

function getSelectedEmployeeProfile() {
  return state.employeeProfiles.find((profile) => profile.id === elements.attendanceEmployeeName.value) || null;
}

function getEmployeeProfileByName(name) {
  return state.employeeProfiles.find((profile) => normalizeName(profile.name) === normalizeName(name)) || null;
}

function getSortedEmployeeProfiles() {
  return [...state.employeeProfiles].sort((left, right) => left.name.localeCompare(right.name));
}

function getProfileSalaryForDate(profile, dateValue) {
  if (!profile) {
    return 0;
  }
  return getProfileSalaryForMonth(profile, getMonthKey(dateValue));
}

function getProfileSalaryForMonth(profile, monthValue) {
  const monthKey = monthValue || getCurrentMonthValue();
  const history = getSalaryHistory(profile);
  const activeEntry = history
    .filter((entry) => entry.month <= monthKey)
    .sort((left, right) => right.month.localeCompare(left.month))[0];
  return Number(activeEntry?.dailySalary ?? profile?.dailySalary ?? 0);
}

function getSalaryHistory(profile) {
  const history = Array.isArray(profile?.salaryHistory) ? profile.salaryHistory : [];
  const fallbackMonth = profile?.salaryMonth || getMonthKey(profile?.createdAt) || getCurrentMonthValue();
  const fallbackSalary = Number(profile?.dailySalary || 0);
  const merged = [...history];
  if (fallbackSalary >= 0 && !merged.some((entry) => entry.month === fallbackMonth)) {
    merged.push({ month: fallbackMonth, dailySalary: fallbackSalary });
  }
  return merged
    .filter((entry) => entry.month && Number(entry.dailySalary) >= 0)
    .map((entry) => ({ month: entry.month, dailySalary: Number(entry.dailySalary || 0) }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

function upsertSalaryHistory(existingHistory, month, dailySalary) {
  const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
  const nextEntry = { month, dailySalary: Number(dailySalary.toFixed(2)) };
  const existingIndex = history.findIndex((entry) => entry.month === month);
  if (existingIndex >= 0) {
    history[existingIndex] = nextEntry;
  } else {
    history.push(nextEntry);
  }
  return history.sort((left, right) => left.month.localeCompare(right.month));
}

function getSalaryStructureText(profile) {
  const history = getSalaryHistory(profile);
  if (!history.length) {
    return "No salary structure";
  }
  return history
    .map((entry) => `${entry.month}: ${formatCurrency(entry.dailySalary)}`)
    .join(" | ");
}

function persistEntries() {
  window.PosDb.save(STORAGE_KEYS.ledgerEntries, state.entries).catch((error) => {
    console.error("Failed to save ledger entries", error);
  });
}

function persistEmployeeProfiles() {
  window.PosDb.save(STORAGE_KEYS.employeeProfiles, state.employeeProfiles).catch((error) => {
    console.error("Failed to save employee profiles", error);
  });
}

function persistAttendance() {
  window.PosDb.save(STORAGE_KEYS.attendance, state.attendance).catch((error) => {
    console.error("Failed to save employee attendance", error);
  });
}

function normalizeDateRange() {
  if (state.fromDate && state.toDate && state.fromDate > state.toDate) {
    [state.fromDate, state.toDate] = [state.toDate, state.fromDate];
  }
}

function isWithinRange(value) {
  if (!value) {
    return false;
  }
  const date = getDateKey(value);
  return date >= state.fromDate && date <= state.toDate;
}

function getDateKey(value) {
  if (!value) {
    return "";
  }
  const directDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (directDate) {
    return directDate;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getMonthKey(value) {
  return getDateKey(value).slice(0, 7);
}

function getCurrentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthValue() {
  return getCurrentDateValue().slice(0, 7);
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function getCurrentRole() {
  if (typeof state.role === "string") {
    return state.role;
  }
  return state.role?.user?.role || state.role?.role || "";
}

function isOwnerRole() {
  return getCurrentRole() === "Owner";
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
