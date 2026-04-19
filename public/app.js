const state = {
  companies: [],
  selectedCompanyId: null,
  selectedReportPeriodId: null,
  activeTab: "balance-sheet",
  detailSummary: null,
  statements: {
    "balance-sheet": null,
    "income-statement": null,
    "cashflow-statement": null,
    "operating-segments": null
  }
};

const companyListEl = document.querySelector("#company-list");
const companyMetaEl = document.querySelector("#company-meta");
const searchFormEl = document.querySelector("#search-form");
const searchInputEl = document.querySelector("#search-input");
const heroEmptyEl = document.querySelector("#hero-empty");
const companyDetailEl = document.querySelector("#company-detail");
const companyNameEl = document.querySelector("#company-name");
const companySymbolEl = document.querySelector("#company-symbol");
const companyTagsEl = document.querySelector("#company-tags");
const latestPeriodCardEl = document.querySelector("#latest-period-card");
const highlightGridEl = document.querySelector("#highlight-grid");
const reportPeriodListEl = document.querySelector("#report-period-list");
const activePeriodLabelEl = document.querySelector("#active-period-label");
const tableHeadEl = document.querySelector("#table-head");
const tableBodyEl = document.querySelector("#table-body");
const tableEmptyEl = document.querySelector("#table-empty");
const tabBarEl = document.querySelector("#tab-bar");
const companyItemTemplate = document.querySelector("#company-item-template");

const tabConfig = {
  "balance-sheet": {
    columns: ["Item", "Value", "Unit"],
    getRows: (payload) => payload?.items ?? []
  },
  "income-statement": {
    columns: ["Item", "Value", "Unit"],
    getRows: (payload) => payload?.items ?? []
  },
  "cashflow-statement": {
    columns: ["Item", "Value", "Unit"],
    getRows: (payload) => payload?.items ?? []
  },
  "operating-segments": {
    columns: ["Type", "Name", "Revenue", "Cost", "Gross Profit"],
    getRows: (payload) => payload?.items ?? []
  }
};

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatPeriod(period) {
  return `${period.reportDate} · ${period.periodType}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? `Request failed: ${response.status}`);
  }

  return payload.data;
}

function setCompanyMeta(text) {
  companyMetaEl.textContent = text;
}

function setHeroMessage(title, description) {
  heroEmptyEl.classList.remove("hidden");
  companyDetailEl.classList.add("hidden");
  heroEmptyEl.innerHTML = `
    <p class="eyebrow">Company Detail</p>
    <h2>${title}</h2>
    <p class="muted">${description}</p>
  `;
}

function renderCompanies() {
  companyListEl.innerHTML = "";

  if (state.companies.length === 0) {
    setCompanyMeta("No companies matched the current search.");
    return;
  }

  setCompanyMeta(`${state.companies.length} companies loaded. Click any company to inspect details.`);

  for (const company of state.companies) {
    const fragment = companyItemTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".company-item");

    button.classList.toggle("is-active", company.id === state.selectedCompanyId);
    button.dataset.companyId = String(company.id);
    fragment.querySelector(".company-item-symbol").textContent = company.symbol;
    fragment.querySelector(".company-item-name").textContent = company.companyName;
    fragment.querySelector(".company-item-meta").textContent = [
      company.exchange,
      company.industry ?? "Uncategorized"
    ].join(" · ");

    button.addEventListener("click", () => {
      void selectCompany(company.id).catch((error) => {
        setHeroMessage("Load failed", error instanceof Error ? error.message : "Company detail request failed.");
      });
    });

    companyListEl.appendChild(fragment);
  }
}

function renderSummary() {
  if (!state.detailSummary) {
    heroEmptyEl.classList.remove("hidden");
    companyDetailEl.classList.add("hidden");
    return;
  }

  heroEmptyEl.classList.add("hidden");
  companyDetailEl.classList.remove("hidden");

  const { company, latestReportPeriod, financialHighlights, operatingSegments } = state.detailSummary;
  companyNameEl.textContent = company.companyName;
  companySymbolEl.textContent = `${company.symbol} · ${company.exchange}`;
  companyTagsEl.textContent = [company.market, company.industry ?? "Uncategorized"].join(" · ");
  latestPeriodCardEl.innerHTML = latestReportPeriod
    ? `<strong>Latest report period:</strong> ${formatPeriod(latestReportPeriod)}`
    : "No report period available yet.";

  const highlights = [
    ["Total Assets", financialHighlights?.assetsTotal ?? null],
    ["Total Liabilities", financialHighlights?.liabilitiesTotal ?? null],
    ["Total Equity", financialHighlights?.equityTotal ?? null],
    ["Revenue", financialHighlights?.revenue ?? null],
    ["Operating Profit", financialHighlights?.operatingProfit ?? null],
    ["Net Income", financialHighlights?.netIncome ?? null],
    ["Operating Cash Flow", financialHighlights?.netCashOperating ?? null],
    ["Investing Cash Flow", financialHighlights?.netCashInvesting ?? null],
    ["Financing Cash Flow", financialHighlights?.netCashFinancing ?? null]
  ];

  highlightGridEl.innerHTML = highlights
    .map(
      ([label, value]) => `
        <article class="highlight-card">
          <span class="highlight-label">${label}</span>
          <strong class="highlight-value">${formatNumber(value)}</strong>
        </article>
      `
    )
    .join("");

  reportPeriodListEl.innerHTML = state.detailSummary.reportPeriods
    .map(
      (period) => `
        <button
          type="button"
          class="period-chip ${period.id === state.selectedReportPeriodId ? "is-active" : ""}"
          data-period-id="${period.id}"
        >
          ${formatPeriod(period)}
        </button>
      `
    )
    .join("");

  reportPeriodListEl.querySelectorAll(".period-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const reportPeriodId = Number(button.dataset.periodId);
      void selectReportPeriod(reportPeriodId).catch((error) => {
        setHeroMessage("Load failed", error instanceof Error ? error.message : "Report period switch failed.");
      });
    });
  });

  const selectedPeriod = state.detailSummary.reportPeriods.find((item) => item.id === state.selectedReportPeriodId);
  activePeriodLabelEl.textContent = selectedPeriod
    ? `Selected report period: ${formatPeriod(selectedPeriod)}`
    : "No report period selected.";

  if (state.activeTab === "operating-segments" && operatingSegments.length === 0) {
    tableEmptyEl.textContent = "No operating segment data is available for the selected report period.";
  }
}

function renderTable() {
  const payload = state.statements[state.activeTab];
  const config = tabConfig[state.activeTab];
  const rows = config.getRows(payload);

  tabBarEl.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === state.activeTab);
  });

  tableHeadEl.innerHTML = `<tr>${config.columns.map((column) => `<th>${column}</th>`).join("")}</tr>`;

  if (!rows.length) {
    tableBodyEl.innerHTML = "";
    tableEmptyEl.classList.remove("hidden");
    if (state.activeTab !== "operating-segments") {
      tableEmptyEl.textContent = "No rows are available for the selected report period.";
    }
    return;
  }

  tableEmptyEl.classList.add("hidden");

  if (state.activeTab === "operating-segments") {
    tableBodyEl.innerHTML = rows
      .map(
        (item) => `
          <tr>
            <td>${item.segmentType}</td>
            <td>${item.segmentName}</td>
            <td>${formatNumber(item.revenue)}</td>
            <td>${formatNumber(item.cost)}</td>
            <td>${formatNumber(item.grossProfit)}</td>
          </tr>
        `
      )
      .join("");
    return;
  }

  tableBodyEl.innerHTML = rows
    .map(
      (item) => `
        <tr>
          <td class="indent-${Math.max(0, item.itemLevel - 1)}">${item.itemName}</td>
          <td>${formatNumber(item.itemValue)}</td>
          <td>${item.itemUnit ?? "--"}</td>
        </tr>
      `
    )
    .join("");
}

async function loadCompanies(query = "") {
  setCompanyMeta("Loading companies...");
  const data = await fetchJson(`/api/companies?q=${encodeURIComponent(query)}&page=1&pageSize=50`);
  state.companies = data.items;

  if (!state.companies.some((company) => company.id === state.selectedCompanyId)) {
    state.selectedCompanyId = state.companies[0]?.id ?? null;
  }

  renderCompanies();

  if (state.selectedCompanyId) {
    await selectCompany(state.selectedCompanyId, false);
  } else {
    setHeroMessage("No company available", "Import real data first or adjust the current search query.");
  }
}

async function selectCompany(companyId, updateHash = true) {
  state.selectedCompanyId = companyId;
  renderCompanies();

  const summary = await fetchJson(`/api/companies/${companyId}/detail-summary`);
  state.detailSummary = summary;
  state.selectedReportPeriodId = summary.latestReportPeriod?.id ?? summary.reportPeriods[0]?.id ?? null;
  state.statements = {
    "balance-sheet": null,
    "income-statement": null,
    "cashflow-statement": null,
    "operating-segments": null
  };

  renderSummary();

  if (updateHash) {
    window.location.hash = `company-${companyId}`;
  }

  if (state.selectedReportPeriodId) {
    await loadReportPeriodData(state.selectedReportPeriodId);
  } else {
    renderTable();
  }
}

async function selectReportPeriod(reportPeriodId) {
  state.selectedReportPeriodId = reportPeriodId;
  state.statements = {
    "balance-sheet": null,
    "income-statement": null,
    "cashflow-statement": null,
    "operating-segments": null
  };
  renderSummary();
  await loadReportPeriodData(reportPeriodId);
}

async function loadReportPeriodData(reportPeriodId) {
  const [balanceSheet, incomeStatement, cashflowStatement, operatingSegments] = await Promise.all([
    fetchJson(`/api/report-periods/${reportPeriodId}/balance-sheet`),
    fetchJson(`/api/report-periods/${reportPeriodId}/income-statement`),
    fetchJson(`/api/report-periods/${reportPeriodId}/cashflow-statement`),
    fetchJson(`/api/report-periods/${reportPeriodId}/operating-segments`)
  ]);

  state.statements["balance-sheet"] = balanceSheet;
  state.statements["income-statement"] = incomeStatement;
  state.statements["cashflow-statement"] = cashflowStatement;
  state.statements["operating-segments"] = operatingSegments;

  renderSummary();
  renderTable();
}

tabBarEl.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeTab = button.dataset.tab;
    renderSummary();
    renderTable();
  });
});

searchFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await loadCompanies(searchInputEl.value.trim());
  } catch (error) {
    setCompanyMeta(error instanceof Error ? error.message : "Company list request failed.");
    setHeroMessage("Load failed", "Search request did not complete successfully. Please try again.");
  }
});

window.addEventListener("hashchange", async () => {
  const matched = window.location.hash.match(/company-(\d+)/);
  if (!matched) {
    return;
  }

  const companyId = Number(matched[1]);
  if (companyId && companyId !== state.selectedCompanyId) {
    await selectCompany(companyId, false);
  }
});

try {
  await loadCompanies();
} catch (error) {
  setCompanyMeta(error instanceof Error ? error.message : "Company list request failed.");
  setHeroMessage("Load failed", "The page could not fetch company data. Check the server and database connection.");
}
