const defaultTransactions = [
  { id: 1, date: "2026-04-01", category: "Salary", amount: 12000, type: "income" },
  { id: 2, date: "2026-04-02", category: "Consulting", amount: 2400, type: "income" },
  { id: 3, date: "2026-04-02", category: "Server Costs", amount: 620, type: "expense" },
  { id: 4, date: "2026-04-03", category: "Office Rent", amount: 3400, type: "expense" },
  { id: 5, date: "2026-04-03", category: "Contractor Payout", amount: 1800, type: "expense" },
  { id: 6, date: "2026-03-28", category: "Software Licenses", amount: 220, type: "expense" },
  { id: 7, date: "2026-03-27", category: "Client Lunch", amount: 95, type: "expense" },
  { id: 8, date: "2026-03-25", category: "Dividend", amount: 700, type: "income" },
  { id: 9, date: "2026-03-22", category: "Marketing", amount: 950, type: "expense" },
  { id: 10, date: "2026-03-20", category: "Travel", amount: 560, type: "expense" },
];

const storedData = localStorage.getItem('zorvyn_transactions');
const storedTransactions = storedData ? JSON.parse(storedData) : null;

const appState = {
  userRole: "admin",
  transactions: storedTransactions || defaultTransactions,
  filters: "",
  sortOrder: "desc", 
};

window.appState = appState;

const chartInstances = {
  balanceTrend: null,
  spendingPie: null,
};

const modalState = {
  mode: null,
  transactionId: null,
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const tableDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  return tableDateFormatter.format(parseDate(value));
}

function formatShortDate(value) {
  return shortDateFormatter.format(parseDate(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return map[char];
  });
}

function cloneTransactions(transactions) {
  return [...transactions];
}

function sortTransactionsAsc(transactions) {
  return cloneTransactions(transactions).sort((left, right) => {
    const dateDiff = parseDate(left.date) - parseDate(right.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return Number(left.id) - Number(right.id);
  });
}

function sortTransactionsDesc(transactions) {
  return cloneTransactions(transactions).sort((left, right) => {
    const dateDiff = parseDate(right.date) - parseDate(left.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return Number(right.id) - Number(left.id);
  });
}

function getSignedAmount(transaction) {
  return transaction.type === "income" ? transaction.amount : transaction.amount * -1;
}

function getLatestTransactionDate(transactions) {
  if (!transactions.length) {
    return new Date();
  }

  const latestTransaction = transactions.reduce((latest, current) => {
    return parseDate(current.date) > parseDate(latest.date) ? current : latest;
  });

  return parseDate(latestTransaction.date);
}

function getLatestMonthTransactions(transactions) {
  const referenceDate = getLatestTransactionDate(transactions);
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  return transactions.filter((transaction) => {
    const transactionDate = parseDate(transaction.date);
    return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
  });
}

function sumTransactions(transactions, predicate) {
  return transactions.reduce((total, transaction) => {
    return predicate(transaction) ? total + transaction.amount : total;
  }, 0);
}

function getFilteredTransactions() {
  const search = appState.filters.trim().toLowerCase();
  let filteredList = appState.transactions;

  if (search) {
    filteredList = appState.transactions.filter((transaction) =>
      transaction.category.toLowerCase().includes(search)
    );
  }

  if (appState.sortOrder === "asc") {
    return sortTransactionsAsc(filteredList);
  } else {
    return sortTransactionsDesc(filteredList);
  }
}

function calculateKPIs(transactions) {
  const totalBalance = transactions.reduce(
    (balance, transaction) => balance + getSignedAmount(transaction),
    0
  );
  const latestMonthTransactions = getLatestMonthTransactions(transactions);
  const reportingDate = getLatestTransactionDate(transactions);

  return {
    totalBalance,
    monthlyIncome: sumTransactions(
      latestMonthTransactions,
      (transaction) => transaction.type === "income"
    ),
    monthlyExpenses: sumTransactions(
      latestMonthTransactions,
      (transaction) => transaction.type === "expense"
    ),
    monthLabel: monthFormatter.format(reportingDate),
  };
}

function calculateInsights(transactions) {
  const expenseTotals = new Map();
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((transaction) => {
    if (transaction.type === "income") {
      totalIncome += transaction.amount;
      return;
    }

    totalExpense += transaction.amount;
    expenseTotals.set(
      transaction.category,
      (expenseTotals.get(transaction.category) || 0) + transaction.amount
    );
  });

  const highestExpenseEntry = [...expenseTotals.entries()].sort((left, right) => right[1] - left[1])[0];

  const ratio =
    totalIncome === 0 && totalExpense === 0
      ? "N/A"
      : totalExpense === 0
        ? "Infinity : 1"
        : `${(totalIncome / totalExpense).toFixed(2)} : 1`;

  return {
    highestExpenseCategory: highestExpenseEntry
      ? {
          name: highestExpenseEntry[0],
          amount: highestExpenseEntry[1],
        }
      : {
          name: "No expense data",
          amount: 0,
        },
    totalIncome,
    totalExpense,
    ratio,
  };
}

function buildBalanceTrendData(transactions) {
  const sortedTransactions = sortTransactionsAsc(transactions);

  if (!sortedTransactions.length) {
    return {
      labels: ["No data"],
      values: [0],
    };
  }

  let runningBalance = 0;

  return {
    labels: sortedTransactions.map((transaction) => formatShortDate(transaction.date)),
    values: sortedTransactions.map((transaction) => {
      runningBalance += getSignedAmount(transaction);
      return runningBalance;
    }),
  };
}

function buildSpendingData(transactions) {
  const spendingTotals = new Map();

  transactions.forEach((transaction) => {
    if (transaction.type !== "expense") {
      return;
    }

    spendingTotals.set(
      transaction.category,
      (spendingTotals.get(transaction.category) || 0) + transaction.amount
    );
  });

  const entries = [...spendingTotals.entries()].sort((left, right) => right[1] - left[1]);

  if (!entries.length) {
    return {
      labels: ["No expenses"],
      values: [1],
      colors: ["rgba(148, 163, 184, 0.35)"],
    };
  }

  const palette = [
    "#38bdf8",
    "#34d399",
    "#f97316",
    "#fb7185",
    "#a78bfa",
    "#facc15",
    "#2dd4bf",
    "#f472b6",
  ];

  return {
    labels: entries.map(([category]) => category),
    values: entries.map(([, amount]) => amount),
    colors: entries.map((_, index) => palette[index % palette.length]),
  };
}

function nextTransactionId() {
  const currentMax = appState.transactions.reduce((max, transaction) => {
    return Math.max(max, Number(transaction.id));
  }, 0);

  return currentMax + 1;
}

function renderKpis() {
  const kpis = calculateKPIs(appState.transactions);
  const kpiGrid = document.getElementById("kpiGrid");

  if (!kpiGrid) {
    return;
  }

  const cards = [
    {
      title: "Total Balance",
      value: formatCurrency(kpis.totalBalance),
      note: "All-time net position",
      badge: "Net",
      badgeClass: "balance",
    },
    {
      title: "Monthly Income",
      value: formatCurrency(kpis.monthlyIncome),
      note: `${kpis.monthLabel} inflows`,
      badge: "Income",
      badgeClass: "income",
    },
    {
      title: "Monthly Expenses",
      value: formatCurrency(kpis.monthlyExpenses),
      note: `${kpis.monthLabel} outflows`,
      badge: "Expense",
      badgeClass: "expense",
    },
  ];

  kpiGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="panel kpi-card">
          <div class="kpi-head">
            <div>
              <p class="section-label">${card.title}</p>
              <h3 class="kpi-value">${card.value}</h3>
              <p class="kpi-note">${card.note}</p>
            </div>
            <span class="kpi-badge ${card.badgeClass}">${card.badge}</span>
          </div>
        </article>
      `
    )
    .join("");

  const transactionCount = document.getElementById("transactionCount");
  if (transactionCount) {
    transactionCount.textContent = `${appState.transactions.length} records`;
  }
}

function renderInsights() {
  const insights = calculateInsights(appState.transactions);
  const insightsPanel = document.getElementById("insightsPanel");

  if (!insightsPanel) {
    return;
  }

  const ratioTone = insights.totalExpense > insights.totalIncome ? "negative" : "positive";

  insightsPanel.innerHTML = `
    <div class="kpi-head">
      <div>
        <p class="section-label">Insights Engine</p>
        <h2 class="table-title">Operational Snapshot</h2>
      </div>
      <span class="chart-pill">Derived</span>
    </div>

    <div class="insights-stack">
      <div class="insight-item">
        <p class="section-label">Highest Expense Category</p>
        <h3 class="insight-value">${escapeHtml(insights.highestExpenseCategory.name)}</h3>
        <p class="insight-note">
          ${formatCurrency(insights.highestExpenseCategory.amount)} spent across the dataset.
        </p>
      </div>

      <div class="insight-item">
        <p class="section-label">Income vs Expense Ratio</p>
        <h3 class="insight-value ${ratioTone}">${insights.ratio}</h3>
        <p class="insight-note">
          Income ${formatCurrency(insights.totalIncome)} against expenses ${formatCurrency(insights.totalExpense)}.
        </p>
      </div>
    </div>
  `;
}

function renderTransactionRows() {
  const tableBody = document.getElementById("transactionTableBody");

  if (!tableBody) {
    return;
  }

  const transactions = getFilteredTransactions();
  const search = appState.filters.trim();
  const isAdmin = appState.userRole === "admin";

  if (!transactions.length) {
    tableBody.innerHTML = `
      <tr>
        <td class="empty-state" colspan="5">
          ${search ? `No transactions matched "${escapeHtml(search)}".` : "No transactions available."}
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = transactions
    .map((transaction) => {
      const isIncome = transaction.type === "income";
      const amountSign = isIncome ? "+" : "-";
      const amountClass = isIncome ? "income" : "expense";
      const typeClass = isIncome ? "income" : "expense";

      return `
        <tr>
          <td>${formatDate(transaction.date)}</td>
          <td>
            <div class="transaction-category">${escapeHtml(transaction.category)}</div>
            <div class="transaction-id">ID ${escapeHtml(transaction.id)}</div>
          </td>
          <td>
            <span class="type-pill ${typeClass}">${transaction.type}</span>
          </td>
          <td class="amount-cell ${amountClass}">${amountSign}${formatCurrency(transaction.amount)}</td>
          <td>
            <div class="action-group">
              <button
                type="button"
                class="action-button edit"
                data-action="edit"
                data-id="${escapeHtml(transaction.id)}"
                ${isAdmin ? "" : "disabled aria-disabled=\"true\""}
              >
                Edit
              </button>
              <button
                type="button"
                class="action-button delete"
                data-action="delete"
                data-id="${escapeHtml(transaction.id)}"
                ${isAdmin ? "" : "disabled aria-disabled=\"true\""}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function destroyCharts() {
  if (chartInstances.balanceTrend) {
    chartInstances.balanceTrend.destroy();
    chartInstances.balanceTrend = null;
  }

  if (chartInstances.spendingPie) {
    chartInstances.spendingPie.destroy();
    chartInstances.spendingPie = null;
  }
}

function renderCharts() {
  if (typeof Chart === "undefined") {
    return;
  }

  const balanceCanvas = document.getElementById("balanceTrendChart");
  const spendingCanvas = document.getElementById("spendingPieChart");

  if (!balanceCanvas || !spendingCanvas) {
    return;
  }

  const balanceContext = balanceCanvas.getContext("2d");
  const spendingContext = spendingCanvas.getContext("2d");

  if (!balanceContext || !spendingContext) {
    return;
  }

  destroyCharts();

  const trendData = buildBalanceTrendData(appState.transactions);
  const spendingData = buildSpendingData(appState.transactions);

  const balanceGradient = balanceContext.createLinearGradient(0, 0, 0, 330);
  balanceGradient.addColorStop(0, "rgba(56, 189, 248, 0.42)");
  balanceGradient.addColorStop(1, "rgba(56, 189, 248, 0.02)");

  chartInstances.balanceTrend = new Chart(balanceContext, {
    type: "line",
    data: {
      labels: trendData.labels,
      datasets: [
        {
          label: "Balance",
          data: trendData.values,
          borderColor: "#38bdf8",
          backgroundColor: balanceGradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#e2e8f0",
          pointBorderColor: "#38bdf8",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `Balance: ${formatCurrency(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(148, 163, 184, 0.08)",
          },
          ticks: {
            color: "#94a3b8",
          },
        },
        y: {
          grid: {
            color: "rgba(148, 163, 184, 0.08)",
          },
          ticks: {
            color: "#94a3b8",
            callback(value) {
              return formatCurrency(value);
            },
          },
        },
      },
    },
  });

  chartInstances.spendingPie = new Chart(spendingContext, {
    type: "pie",
    data: {
      labels: spendingData.labels,
      datasets: [
        {
          data: spendingData.values,
          backgroundColor: spendingData.colors,
          borderColor: "#0f172a",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#cbd5e1",
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
            boxWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const label = context.label || "Category";
              const value = Number(context.raw) || 0;
              return `${label}: ${formatCurrency(value)}`;
            },
          },
        },
      },
    },
  });
}

function renderDashboard() {
  renderKpis();
  renderInsights();
  renderCharts();
  renderTransactionRows();
  applyRolePermissions();
}

function renderTransactionModalTemplate(mode, transaction = null) {
  const isEdit = mode === "edit";
  const defaultValues = {
    date: formatDateInput(new Date()),
    category: "",
    amount: "",
    type: "expense",
  };
  const values = transaction || defaultValues;

  return `
    <div class="modal-overlay" data-modal-overlay="true" role="presentation">
      <div class="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="transactionModalTitle">
        <div class="modal-header">
          <div>
            <p class="section-label">Transaction Studio</p>
            <h3 class="modal-title" id="transactionModalTitle">
              ${isEdit ? "Edit Transaction" : "Add Transaction"}
            </h3>
          </div>
          <button type="button" class="modal-close" data-close-modal="true" aria-label="Close modal">
            X
          </button>
        </div>

        <form class="modal-body modal-form" id="transactionForm">
          <div class="field-grid">
            <label class="field">
              <span class="field-label">Date</span>
              <input class="field-input" name="date" type="date" required value="${escapeHtml(values.date)}" />
            </label>

            <label class="field">
              <span class="field-label">Amount</span>
              <input
                class="field-input"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                value="${escapeHtml(values.amount)}"
              />
            </label>
          </div>

          <div class="field-grid">
            <label class="field">
              <span class="field-label">Category</span>
              <input
                class="field-input"
                name="category"
                type="text"
                required
                placeholder="e.g. SaaS, Salary, Travel"
                value="${escapeHtml(values.category)}"
              />
            </label>

            <label class="field">
              <span class="field-label">Type</span>
              <select class="field-input" name="type">
                <option value="income" ${values.type === "income" ? "selected" : ""}>Income</option>
                <option value="expense" ${values.type === "expense" ? "selected" : ""}>Expense</option>
              </select>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-button" data-close-modal="true">
              Cancel
            </button>
            <button type="submit" class="primary-button">
              ${isEdit ? "Save Changes" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function openTransactionModal(mode, transaction = null) {
  if (appState.userRole !== "admin") {
    return;
  }

  modalState.mode = mode;
  modalState.transactionId = transaction ? transaction.id : null;

  const modalRoot = document.getElementById("modalRoot");
  if (!modalRoot) {
    return;
  }

  modalRoot.innerHTML = renderTransactionModalTemplate(mode, transaction);
  document.body.classList.add("modal-open");

  window.requestAnimationFrame(() => {
    const firstField = document.querySelector("#transactionForm [name='category']");
    if (firstField && typeof firstField.focus === "function") {
      firstField.focus();
      if (typeof firstField.select === "function") {
        firstField.select();
      }
    }
  });
}

function closeTransactionModal() {
  modalState.mode = null;
  modalState.transactionId = null;

  const modalRoot = document.getElementById("modalRoot");
  if (modalRoot) {
    modalRoot.innerHTML = "";
  }

  document.body.classList.remove("modal-open");
}

function handleTableActionClick(event) {
  const button = event.target.closest("[data-action]");

  if (!button || appState.userRole !== "admin") {
    return;
  }

  const transactionId = Number(button.dataset.id);
  const transaction = appState.transactions.find((item) => Number(item.id) === transactionId);

  if (!transaction) {
    return;
  }

  if (button.dataset.action === "edit") {
    openTransactionModal("edit", transaction);
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmDelete = window.confirm("Delete this transaction?");
    if (!confirmDelete) {
      return;
    }

    appState.transactions = appState.transactions.filter(
      (item) => Number(item.id) !== transactionId
    );
    localStorage.setItem('zorvyn_transactions', JSON.stringify(appState.transactions));
    renderDashboard();
  }
}

function handleModalClick(event) {
  const overlayClicked = event.target.matches("[data-modal-overlay='true']");
  const closeClicked = event.target.closest("[data-close-modal='true']");

  if (overlayClicked || closeClicked) {
    closeTransactionModal();
  }
}

function handleModalSubmit(event) {
  if (!event.target.matches("#transactionForm")) {
    return;
  }

  event.preventDefault();

  if (appState.userRole !== "admin") {
    return;
  }

  const formData = new FormData(event.target);
  const date = String(formData.get("date") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const amount = Number(formData.get("amount"));
  const type = String(formData.get("type") || "expense");

  if (!date || !category || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  if (modalState.mode === "edit" && modalState.transactionId !== null) {
    appState.transactions = appState.transactions.map((transaction) => {
      if (Number(transaction.id) !== Number(modalState.transactionId)) {
        return transaction;
      }

      return {
        ...transaction,
        date,
        category,
        amount,
        type,
      };
    });
  } else {
    appState.transactions = [
      {
        id: nextTransactionId(),
        date,
        category,
        amount,
        type,
      },
      ...appState.transactions,
    ];
  }
  localStorage.setItem('zorvyn_transactions', JSON.stringify(appState.transactions));

  closeTransactionModal();
  renderDashboard();
}

function applyRolePermissions() {
  const isAdmin = appState.userRole === "admin";
  const addButton = document.getElementById("addTransactionBtn");

  if (addButton) {
    addButton.hidden = !isAdmin;
  }

  document.querySelectorAll(".action-button.edit").forEach((button) => {
    button.disabled = !isAdmin;
    button.classList.toggle("is-disabled", !isAdmin);
  });

  document.querySelectorAll(".action-button.delete").forEach((button) => {
    button.disabled = !isAdmin;
    button.classList.toggle("is-disabled", !isAdmin);
  });

  if (!isAdmin && modalState.mode) {
    closeTransactionModal();
  }
}
function exportToCSV() {
  const transactions = appState.transactions;
  if (!transactions.length) {
    alert("No transactions to export!");
    return;
  }

  
  let csvContent = "data:text/csv;charset=utf-8,ID,Date,Category,Type,Amount\n";

  transactions.forEach(row => {
    const rowData = [row.id, row.date, row.category, row.type, row.amount].join(",");
    csvContent += rowData + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "zorvyn_finance_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function initializeEventListeners() {
  const roleSwitcher = document.getElementById("roleSwitcher");
  const searchInput = document.getElementById("searchInput");
  const addTransactionBtn = document.getElementById("addTransactionBtn");
  const transactionTableBody = document.getElementById("transactionTableBody");
  const modalRoot = document.getElementById("modalRoot");
  const sortSelect = document.getElementById("sortSelect"); 
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportToCSV);
  }

  if (roleSwitcher) {
    roleSwitcher.addEventListener("change", (event) => {
      appState.userRole = event.target.value === "viewer" ? "viewer" : "admin";
      if (appState.userRole === "viewer") {
        closeTransactionModal();
      }
      renderTransactionRows();
      applyRolePermissions();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      appState.filters = event.target.value;
      renderTransactionRows();
      applyRolePermissions();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (event) => {
      appState.sortOrder = event.target.value;
      renderTransactionRows();
      applyRolePermissions();
    });
  }

  if (addTransactionBtn) {
    addTransactionBtn.addEventListener("click", () => {
      openTransactionModal("add");
    });
  }

  if (transactionTableBody) {
    transactionTableBody.addEventListener("click", handleTableActionClick);
  }

  if (modalRoot) {
    modalRoot.addEventListener("click", handleModalClick);
    modalRoot.addEventListener("submit", handleModalSubmit);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalState.mode) {
      closeTransactionModal();
    }
  });
}

function initializeDashboard() {
  const roleSwitcher = document.getElementById("roleSwitcher");
  const searchInput = document.getElementById("searchInput");

  if (roleSwitcher) {
    roleSwitcher.value = appState.userRole;
  }

  if (searchInput) {
    searchInput.value = appState.filters;
  }

  initializeEventListeners();
  renderDashboard();
  applyRolePermissions();
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
