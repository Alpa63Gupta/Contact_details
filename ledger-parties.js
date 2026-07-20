const STORAGE_KEYS = {
  ledgerEntries: "sweet-shop-pos:ledger-entries",
  employeeProfiles: "sweet-shop-pos:employee-profiles",
  attendance: "sweet-shop-pos:employee-attendance",
};

const elements = {
  eyebrow: document.querySelector("#ledgerProfileEyebrow"),
  title: document.querySelector("#ledgerProfileTitle"),
  pdf: document.querySelector("#ledgerProfilePdf"),
  summary: document.querySelector("#ledgerProfileSummary"),
  list: document.querySelector("#ledgerProfileList"),
  pdfDialog: document.querySelector("#ledgerPdfDialog"),
  pdfForm: document.querySelector("#ledgerPdfForm"),
  pdfCancel: document.querySelector("#ledgerPdfCancel"),
  pdfToday: document.querySelector("#ledgerPdfToday"),
  pdfFromDate: document.querySelector("#ledgerPdfFromDate"),
  pdfToDate: document.querySelector("#ledgerPdfToDate"),
};

const params = new URLSearchParams(window.location.search);
const partyType = params.get("type") === "Employee" ? "Employee" : "Vendor";
const partyName = params.get("name") || "";
const shouldPrint = params.get("print") === "1";
const state = {
  currentParty: null,
  entries: [],
  employeeProfiles: [],
  attendance: [],
  pdfPartyName: "",
};

initialize();

async function initialize() {
  bindEvents();
  const stored = await window.PosDb.loadMany({
    [STORAGE_KEYS.ledgerEntries]: [],
    [STORAGE_KEYS.employeeProfiles]: [],
    [STORAGE_KEYS.attendance]: [],
  });
  state.entries = stored[STORAGE_KEYS.ledgerEntries] || [];
  state.employeeProfiles = stored[STORAGE_KEYS.employeeProfiles] || [];
  state.attendance = stored[STORAGE_KEYS.attendance] || [];
  render();
}

function bindEvents() {
  elements.pdfForm.addEventListener("submit", (event) => {
    event.preventDefault();
    makeProfilePdfForDateRange();
  });
  elements.pdfToday.addEventListener("click", () => {
    const today = getCurrentDateValue();
    elements.pdfFromDate.value = today;
    elements.pdfToDate.value = today;
  });
  elements.pdfCancel.addEventListener("click", () => elements.pdfDialog.close());
}

function render() {
  const filtered = state.entries.filter((entry) => entry.partyType === partyType);
  const parties = getPartySummaries(filtered, state.attendance);
  elements.eyebrow.textContent = partyName ? `${partyType} Details` : `All ${partyType}s`;
  elements.title.textContent = partyName || `All ${partyType}s`;
  elements.pdf.hidden = !partyName;
  elements.pdf.onclick = () => openPdfDialog(partyName);

  if (partyName) {
    renderPartyDetail(parties.filter((party) => normalizeName(party.name) === normalizeName(partyName)));
    if (shouldPrint) {
      setTimeout(() => openPdfDialog(partyName), 250);
    }
    return;
  }

  renderPartyList(parties);
}

function renderPartyList(parties) {
  const totalBalance = parties.reduce((sum, party) => sum + party.balance, 0);
  elements.summary.innerHTML = `
    <article class="stat-card">
      <span>${partyType}s</span>
      <strong>${parties.length}</strong>
    </article>
    <article class="stat-card">
      <span>Total Balance</span>
      <strong>${formatCurrency(totalBalance)}</strong>
    </article>
  `;

  if (!parties.length) {
    elements.list.innerHTML = `<div class="empty-state">No ${partyType.toLowerCase()} profiles found.</div>`;
    return;
  }

  elements.list.innerHTML = parties
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
              <span>Entries</span>
              <strong>${getPartyEntryCount(party)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Debit / Paid</span>
              <strong>${formatCurrency(party.debit)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Credit / Payable</span>
              <strong>${formatCurrency(party.credit)}</strong>
            </div>
            <div class="item-detail-field">
              <span>Balance</span>
              <strong>${formatCurrency(party.balance)}</strong>
            </div>
            ${renderEmployeeListStats(party)}
          </div>
          <div class="ledger-party-actions">
            <a class="button transfer-link" href="ledger-parties.html?type=${encodeURIComponent(partyType)}&name=${encodeURIComponent(party.name)}">Open Profile</a>
            <button class="ghost-button transfer-link" type="button" data-pdf-party="${escapeHtml(party.name)}">Make PDF</button>
          </div>
        </article>
      `
    )
    .join("");

  elements.list.querySelectorAll("[data-pdf-party]").forEach((button) => {
    button.addEventListener("click", () => openPdfDialog(button.dataset.pdfParty));
  });
}

function renderPartyDetail(parties) {
  const party = parties[0];
  if (!party) {
    state.currentParty = null;
    elements.summary.innerHTML = "";
    elements.list.innerHTML = `<div class="empty-state">No entries found for this profile.</div>`;
    return;
  }
  state.currentParty = party;

  elements.summary.innerHTML = `
    <article class="stat-card">
      <span>Entries</span>
      <strong>${getPartyEntryCount(party)}</strong>
    </article>
    ${partyType === "Employee" ? `
      <article class="stat-card">
        <span>Daily Salary</span>
        <strong>${formatCurrency(party.dailySalary)}</strong>
      </article>
      <article class="stat-card">
        <span>Salary Payable</span>
        <strong>${formatCurrency(party.salaryPayable)}</strong>
      </article>
      <article class="stat-card">
        <span>Present / Half</span>
        <strong>${formatNumber(party.presentCount)} / ${formatNumber(party.halfDayCount)}</strong>
      </article>
      <article class="stat-card">
        <span>Absent / Paid Leave</span>
        <strong>${formatNumber(party.absentCount)} / ${formatNumber(party.paidLeaveCount)}</strong>
      </article>
    ` : ""}
    <article class="stat-card">
      <span>Debit / Paid</span>
      <strong>${formatCurrency(party.debit)}</strong>
    </article>
    <article class="stat-card">
      <span>Credit / Payable</span>
      <strong>${formatCurrency(party.credit)}</strong>
    </article>
    <article class="stat-card">
      <span>Balance</span>
      <strong>${formatCurrency(party.balance)}</strong>
    </article>
  `;

  elements.list.innerHTML = `
    <article class="ledger-party-card ledger-party-card--wide">
      <div class="ledger-party-card__header">
        <div>
          <span class="product-tag">${escapeHtml(partyType)}</span>
          <h2>${escapeHtml(party.name)}</h2>
        </div>
        <strong class="${party.balance >= 0 ? "text-success" : "text-danger"}">${formatCurrency(party.balance)}</strong>
      </div>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Entry</th>
              <th>Amount</th>
              <th>Notes</th>
              <th>Added By</th>
            </tr>
          </thead>
          <tbody>
            ${party.entries
              .map(
                (entry) => `
                  <tr>
                    <td>${formatDateTime(entry.createdAt)}</td>
                    <td>${escapeHtml(entry.entryType)}</td>
                    <td>${formatCurrency(entry.amount)}</td>
                    <td>${escapeHtml(entry.notes || "-")}</td>
                    <td>${escapeHtml(entry.createdBy || "Admin")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${renderAttendanceTable(party)}
    </article>
  `;
}

function renderEmployeeListStats(party) {
  if (partyType !== "Employee") {
    return "";
  }
  return `
    <div class="item-detail-field">
      <span>Daily Salary</span>
      <strong>${formatCurrency(party.dailySalary)}</strong>
    </div>
    <div class="item-detail-field">
      <span>Salary Payable</span>
      <strong>${formatCurrency(party.salaryPayable)}</strong>
    </div>
    <div class="item-detail-field">
      <span>Attendance</span>
      <strong>${formatNumber(party.presentDays)} / ${party.attendanceEntries.length}</strong>
    </div>
    <div class="item-detail-field">
      <span>Present</span>
      <strong>${formatNumber(party.presentCount)}</strong>
    </div>
    <div class="item-detail-field">
      <span>Half Day</span>
      <strong>${formatNumber(party.halfDayCount)}</strong>
    </div>
    <div class="item-detail-field">
      <span>Absent</span>
      <strong>${formatNumber(party.absentCount)}</strong>
    </div>
    <div class="item-detail-field">
      <span>Paid Leave</span>
      <strong>${formatNumber(party.paidLeaveCount)}</strong>
    </div>
  `;
}

function renderAttendanceTable(party) {
  if (partyType !== "Employee") {
    return "";
  }
  if (!party.attendanceEntries.length) {
    return `<div class="empty-state">No attendance entries found for this employee.</div>`;
  }
  return `
    <div class="section-header ledger-profile-subheader">
      <h2>Attendance & Salary Entries</h2>
    </div>
    <div class="report-table-wrap">
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Attendance</th>
            <th>Daily Salary</th>
            <th>Salary</th>
            <th>Notes</th>
            <th>Added By</th>
          </tr>
        </thead>
        <tbody>
          ${party.attendanceEntries
            .map(
              (entry) => `
                <tr>
                  <td>${formatDateTime(entry.createdAt)}</td>
                  <td>${escapeHtml(entry.status)}</td>
                  <td>${formatCurrency(entry.dailySalary)}</td>
                  <td>${formatCurrency(entry.salaryAmount)}</td>
                  <td>${escapeHtml(entry.notes || "-")}</td>
                  <td>${escapeHtml(entry.createdBy || "Admin")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function isWithinRange(value, fromDate, toDate) {
  if (!value) {
    return false;
  }
  const date = new Date(value).toISOString().slice(0, 10);
  return date >= fromDate && date <= toDate;
}

function openPdfDialog(name) {
  state.pdfPartyName = name;
  const today = getCurrentDateValue();
  elements.pdfFromDate.value = today;
  elements.pdfToDate.value = today;
  elements.pdfDialog.showModal();
}

function makeProfilePdfForDateRange() {
  let fromDate = elements.pdfFromDate.value || getCurrentDateValue();
  let toDate = elements.pdfToDate.value || fromDate;
  if (fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  const entries = state.entries.filter(
    (entry) =>
      entry.partyType === partyType &&
      normalizeName(entry.partyName) === normalizeName(state.pdfPartyName) &&
      isWithinRange(entry.createdAt, fromDate, toDate)
  );
  const attendance = state.attendance.filter(
    (entry) => normalizeName(entry.employeeName) === normalizeName(state.pdfPartyName) && isWithinRange(entry.createdAt, fromDate, toDate)
  );
  const party = getPartySummaries(entries, attendance).find((item) => normalizeName(item.name) === normalizeName(state.pdfPartyName));
  if (!party) {
    window.alert("No profile data found for PDF.");
    return;
  }

  const bytes = buildProfilePdf(party, fromDate, toDate);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(partyType)}-${sanitizeFilename(party.name)}-${fromDate}-to-${toDate}-Ledger.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  elements.pdfDialog.close();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildProfilePdf(party, fromDate, toDate) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const lineHeight = 14;
  const bottom = 42;
  const pages = [];
  let lines = [];
  let y = pageHeight - margin;

  function addLine(text, size = 10) {
    if (y < bottom) {
      pages.push(lines);
      lines = [];
      y = pageHeight - margin;
    }
    lines.push({ text: sanitizePdfText(text), x: margin, y, size });
    y -= lineHeight;
  }

  addLine("Ramesh sweets", 18);
  addLine(`${partyType} Ledger Profile`, 14);
  addLine(`Name: ${party.name}`, 12);
  addLine(`Date: ${fromDate} to ${toDate}`, 10);
  addLine(`Entries: ${party.entries.length}`, 10);
  if (partyType === "Employee") {
    addLine(`Daily Salary: ${formatPdfCurrency(party.dailySalary)}`, 10);
    addLine(`Salary Payable: ${formatPdfCurrency(party.salaryPayable)}`, 10);
    addLine(`Attendance Entries: ${party.attendanceEntries.length}`, 10);
    addLine(`Present: ${formatNumber(party.presentCount)} | Half Day: ${formatNumber(party.halfDayCount)}`, 10);
    addLine(`Absent: ${formatNumber(party.absentCount)} | Paid Leave: ${formatNumber(party.paidLeaveCount)}`, 10);
  }
  addLine(`Debit / Paid: ${formatPdfCurrency(party.debit)}`, 10);
  addLine(`Credit / Payable: ${formatPdfCurrency(party.credit)}`, 10);
  addLine(`Balance: ${formatPdfCurrency(party.balance)}`, 10);
  addLine(" ");
  addLine("Date | Entry | Amount | Notes | Added By", 10);
  addLine("------------------------------------------------------------", 10);

  party.entries.forEach((entry) => {
    const row = `${formatDateTime(entry.createdAt)} | ${entry.entryType} | ${formatPdfCurrency(entry.amount)} | ${entry.notes || "-"} | ${entry.createdBy || "Admin"}`;
    wrapPdfLine(row, 82).forEach((line) => addLine(line, 9));
    addLine(" ");
  });
  if (partyType === "Employee") {
    addLine("Attendance | Salary Entries", 10);
    addLine("------------------------------------------------------------", 10);
    party.attendanceEntries.forEach((entry) => {
      const row = `${formatDateTime(entry.createdAt)} | ${entry.status} | Daily ${formatPdfCurrency(entry.dailySalary)} | Salary ${formatPdfCurrency(entry.salaryAmount)} | ${entry.notes || "-"} | ${entry.createdBy || "Admin"}`;
      wrapPdfLine(row, 82).forEach((line) => addLine(line, 9));
      addLine(" ");
    });
  }

  pages.push(lines);

  const objects = [];
  const pageObjectIds = [];
  const fontObjectId = 3;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "";
  objects[fontObjectId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const contentObjectId = 4 + index * 2;
    const pageObjectId = contentObjectId + 1;
    pageObjectIds.push(pageObjectId);
    const stream = pageLines
      .map((line) => `BT /F1 ${line.size} Tf ${line.x} ${line.y} Td (${escapePdfString(line.text)}) Tj ET`)
      .join("\n");
    objects[contentObjectId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

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

function wrapPdfLine(text, maxLength) {
  const words = sanitizePdfText(text).split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines;
}

function formatPdfCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function sanitizePdfText(value) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfString(value) {
  return sanitizePdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function sanitizeFilename(value) {
  return String(value || "Ledger").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "Ledger";
}

function getPartySummaries(entries, attendanceEntries = []) {
  const parties = new Map();
  if (partyType === "Employee") {
    state.employeeProfiles.forEach((profile) => {
      ensureParty(parties, profile.name, profile);
    });
  }
  entries.forEach((entry) => {
    const party = ensureParty(parties, entry.partyName);
    const amount = Number(entry.amount || 0);
    if (entry.entryType === "Debit") {
      party.debit += amount;
    } else {
      party.credit += amount;
    }
    party.entries.push(entry);
  });
  if (partyType === "Employee") {
    attendanceEntries.forEach((entry) => {
      const party = ensureParty(parties, entry.employeeName, getEmployeeProfileByName(entry.employeeName));
      const salaryAmount = Number(entry.salaryAmount || 0);
      party.salaryPayable += salaryAmount;
      if (entry.status === "Present") {
        party.presentCount += 1;
        party.presentDays += 1;
      } else if (entry.status === "Paid Leave") {
        party.paidLeaveCount += 1;
        party.presentDays += 1;
      } else if (entry.status === "Half Day") {
        party.halfDayCount += 1;
        party.presentDays += 0.5;
      } else if (entry.status === "Absent") {
        party.absentCount += 1;
      }
      party.attendanceEntries.push(entry);
    });
  }
  parties.forEach((party) => {
    party.balance = party.credit + party.salaryPayable - party.debit;
    party.entries.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    party.attendanceEntries.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  });
  return [...parties.values()].sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));
}

function ensureParty(parties, name, profile = null) {
  const key = normalizeName(name);
  if (!parties.has(key)) {
    parties.set(key, {
      name,
      debit: 0,
      credit: 0,
      salaryPayable: 0,
      dailySalary: 0,
      presentDays: 0,
      presentCount: 0,
      halfDayCount: 0,
      absentCount: 0,
      paidLeaveCount: 0,
      balance: 0,
      entries: [],
      attendanceEntries: [],
    });
  }
  const party = parties.get(key);
  if (profile) {
    party.name = profile.name || party.name;
    party.dailySalary = Number(profile.dailySalary || party.dailySalary || 0);
    party.profileNotes = profile.notes || party.profileNotes || "";
  }
  return party;
}

function getEmployeeProfileByName(name) {
  return state.employeeProfiles.find((profile) => normalizeName(profile.name) === normalizeName(name)) || null;
}

function getPartyEntryCount(party) {
  return party.entries.length + (partyType === "Employee" ? party.attendanceEntries.length : 0);
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
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
