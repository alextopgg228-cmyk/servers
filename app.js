const STORAGE_KEY = "service-center-orders-v1";

const data = window.serviceCenterData;
let orders = loadOrders();

const state = {
  view: "dashboard",
  reference: "models",
  search: "",
  store: "all",
  model: "all",
  warranty: "all",
};

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const lookups = {
  positions: mapBy(data.positions, "PositionCode"),
  employees: mapBy(data.employees, "EmployeeCode"),
  parts: mapBy(data.spareParts, "PartCode"),
  models: mapBy(data.repairableModels, "ModelCode"),
  faults: mapBy(data.faultTypes, "FaultCode"),
  stores: mapBy(data.serviceStores, "StoreCode"),
};

document.addEventListener("DOMContentLoaded", () => {
  applyInitialHash();
  hydrateControls();
  bindEvents();
  render();
  refreshIcons();
});

function applyInitialHash() {
  const hash = window.location.hash.replace("#", "");
  if (["dashboard", "orders", "references", "database"].includes(hash)) {
    state.view = hash;
  }
}

function hydrateControls() {
  const storeFilter = document.querySelector("#storeFilter");
  const modelFilter = document.querySelector("#modelFilter");
  const newFault = document.querySelector("#newFault");
  const newStore = document.querySelector("#newStore");
  const newEmployee = document.querySelector("#newEmployee");
  const today = new Date().toISOString().slice(0, 10);

  storeFilter.innerHTML = [
    option("all", "Все магазины"),
    ...data.serviceStores.map((store) => option(store.StoreCode, store.StoreName)),
  ].join("");

  modelFilter.innerHTML = [
    option("all", "Все модели"),
    ...data.repairableModels.map((model) => option(model.ModelCode, `${model.Manufacturer} ${model.ModelName}`)),
  ].join("");

  newFault.innerHTML = data.faultTypes
    .map((fault) => {
      const model = lookups.models.get(fault.ModelCode);
      return option(fault.FaultCode, `${fault.Description} · ${model.Manufacturer} ${model.ModelName}`);
    })
    .join("");

  newStore.innerHTML = data.serviceStores.map((store) => option(store.StoreCode, store.StoreName)).join("");
  newEmployee.innerHTML = data.employees
    .map((employee) => option(employee.EmployeeCode, employee.FullName))
    .join("");

  resetOrderFormDefaults(today);
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-jump-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.jumpView));
  });

  document.querySelector("#globalSearch").addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  document.querySelector("#storeFilter").addEventListener("change", (event) => {
    state.store = event.target.value;
    renderOrders();
  });

  document.querySelector("#modelFilter").addEventListener("change", (event) => {
    state.model = event.target.value;
    renderOrders();
  });

  document.querySelector("#warrantyFilter").addEventListener("change", (event) => {
    state.warranty = event.target.value;
    renderOrders();
  });

  document.querySelector("#newFault").addEventListener("change", updateEstimate);
  document.querySelector("#newWarranty").addEventListener("change", (event) => {
    document.querySelector("#newWarrantyPeriod").value = event.target.checked ? 180 : 90;
  });

  document.querySelector("#orderForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addOrder();
  });

  document.querySelector("#ordersTable").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-order]");
    if (!button) return;
    const orderNumber = Number(button.dataset.deleteOrder);
    orders = orders.filter((order) => order.OrderNumber !== orderNumber);
    saveOrders();
    render();
    showToast(`Заказ №${orderNumber} удален из локальной копии`);
  });

  document.querySelector("#referenceTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-reference]");
    if (!button) return;
    state.reference = button.dataset.reference;
    renderReferences();
  });

  document.querySelector("#exportData").addEventListener("click", exportData);
  document.querySelector("#resetData").addEventListener("click", resetData);
}

function render() {
  document.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });

  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.viewPanel === state.view);
  });

  renderDashboard();
  renderOrders();
  renderReferences();
  renderDatabase();
  refreshIcons();
}

function setView(view) {
  state.view = view;
  window.location.hash = view;
  render();
}

function renderDashboard() {
  const enriched = filteredOrders();
  const totalRevenue = enriched.reduce((sum, order) => sum + Number(order.TotalPrice || 0), 0);
  const warrantyCount = enriched.filter((order) => Number(order.WarrantyMark) === 1).length;
  const avgDays = averageRepairDays(enriched);

  document.querySelector("#statsGrid").innerHTML = [
    statCard("clipboard-list", "Заказов", enriched.length, "в текущей выборке"),
    statCard("wallet", "Выручка", formatMoney(totalRevenue), "по журналу заказов"),
    statCard("shield-check", "Гарантийных", warrantyCount, "ремонтов"),
    statCard("timer", "Средний срок", `${avgDays} дн.`, "от приема до возврата"),
  ].join("");

  const recent = [...orders]
    .sort((a, b) => b.OrderNumber - a.OrderNumber)
    .slice(0, 5)
    .map(enrichOrder);

  document.querySelector("#recentOrders").innerHTML = recent
    .map(
      (order) => `
        <article class="recent-item">
          <span class="badge">№${order.OrderNumber}</span>
          <div>
            <strong>${safe(order.CustomerFullName)}</strong>
            <small>${safe(order.modelLabel)} · ${safe(order.fault.Description)}</small>
          </div>
          <b>${formatMoney(order.TotalPrice)}</b>
        </article>
      `,
    )
    .join("");

  const workload = data.employees
    .map((employee) => {
      const count = orders.filter((order) => order.EmployeeCode === employee.EmployeeCode).length;
      return { employee, count };
    })
    .sort((a, b) => b.count - a.count);

  const max = Math.max(...workload.map((item) => item.count), 1);
  document.querySelector("#workloadList").innerHTML = workload
    .map((item) => {
      const position = lookups.positions.get(item.employee.PositionCode);
      const width = Math.max(8, (item.count / max) * 100);
      return `
        <article class="workload-item">
          <div>
            <strong>${safe(item.employee.FullName)}</strong>
            <small>${safe(position.PositionName)}</small>
          </div>
          <span>${item.count}</span>
          <div class="meter" aria-hidden="true"><i style="width:${width}%"></i></div>
        </article>
      `;
    })
    .join("");
}

function renderOrders() {
  const orderRows = filteredOrders();
  document.querySelector("#orderCounter").textContent = `${orderRows.length} из ${orders.length}`;

  const tbody = document.querySelector("#ordersTable");
  if (!orderRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">По этим фильтрам заказов нет</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orderRows
    .map(
      (order) => `
        <tr>
          <td><span class="badge">№${order.OrderNumber}</span></td>
          <td>
            <strong>${safe(order.CustomerFullName)}</strong>
            <small>${safe(order.SerialNumber)}</small>
          </td>
          <td>
            <strong>${safe(order.modelLabel)}</strong>
            <small>${safe(order.store.StoreName)}</small>
          </td>
          <td>
            <strong>${safe(order.fault.Description)}</strong>
            <small>${safe(order.fault.Symptoms)}</small>
          </td>
          <td>
            <strong>${safe(order.employee.FullName)}</strong>
            <small>${safe(order.position.PositionName)}</small>
          </td>
          <td>
            <strong>${formatDate(order.OrderDate)}</strong>
            <small>${order.ReturnDate ? formatDate(order.ReturnDate) : "не выдан"}</small>
          </td>
          <td>
            <strong>${formatMoney(order.TotalPrice)}</strong>
            <small>${Number(order.WarrantyMark) ? "гарантия" : `${order.RepairWarrantyPeriod} дн.`}</small>
          </td>
          <td>
            <button class="icon-button subtle" type="button" data-delete-order="${order.OrderNumber}" aria-label="Удалить заказ №${order.OrderNumber}">
              <i data-lucide="trash-2"></i>
            </button>
          </td>
        </tr>
      `,
    )
    .join("");
  refreshIcons();
}

function renderReferences() {
  document.querySelectorAll(".mini-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.reference === state.reference);
  });

  const content = document.querySelector("#referenceContent");
  if (state.reference === "models") {
    content.innerHTML = `
      <div class="reference-grid">
        ${data.repairableModels
          .map(
            (model) => `
              <article class="record-panel">
                <span class="badge">${safe(model.ModelCode)}</span>
                <h3>${safe(model.Manufacturer)} ${safe(model.ModelName)}</h3>
                <p>${safe(model.Type)}</p>
                <small>${safe(model.TechnicalSpecifications)}</small>
                <small>${safe(model.Features)}</small>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
    return;
  }

  if (state.reference === "faults") {
    content.innerHTML = `
      <div class="reference-grid">
        ${data.faultTypes
          .map((fault) => {
            const model = lookups.models.get(fault.ModelCode);
            const parts = fault.PartCodes.map((code) => lookups.parts.get(code).PartName).join(", ");
            return `
              <article class="record-panel">
                <span class="badge">${safe(fault.FaultCode)}</span>
                <h3>${safe(fault.Description)}</h3>
                <p>${safe(model.Manufacturer)} ${safe(model.ModelName)}</p>
                <small>${safe(fault.RepairMethods)}</small>
                <small>${safe(parts || "Без запчастей")} · ${formatMoney(fault.WorkPrice)}</small>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
    return;
  }

  if (state.reference === "employees") {
    content.innerHTML = tableMarkup(
      ["Код", "ФИО", "Должность", "Телефон", "Оклад"],
      data.employees.map((employee) => {
        const position = lookups.positions.get(employee.PositionCode);
        return [
          employee.EmployeeCode,
          employee.FullName,
          position.PositionName,
          employee.Phone,
          formatMoney(position.Salary),
        ];
      }),
    );
    return;
  }

  if (state.reference === "parts") {
    content.innerHTML = tableMarkup(
      ["Код", "Название", "Назначение", "Цена"],
      data.spareParts.map((part) => [part.PartCode, part.PartName, part.Functions, formatMoney(part.Price)]),
    );
    return;
  }

  content.innerHTML = tableMarkup(
    ["Код", "Магазин", "Адрес", "Телефон"],
    data.serviceStores.map((store) => [store.StoreCode, store.StoreName, store.Address, store.Phone]),
  );
}

function renderDatabase() {
  const tables = [
    ["Positions", "PositionCode", "должности, обязанности, требования"],
    ["Employees", "EmployeeCode", "сотрудники и привязка к должности"],
    ["SpareParts", "PartCode", "запчасти и цены"],
    ["RepairableModels", "ModelCode", "ремонтируемые модели техники"],
    ["FaultTypes", "FaultCode", "неисправности, методы ремонта, запчасти"],
    ["ServiceStores", "StoreCode", "магазины-партнеры"],
    ["Orders", "OrderNumber", "заказы клиентов и стоимость ремонта"],
  ];

  document.querySelector("#schemaGrid").innerHTML = tables
    .map(
      ([name, key, description]) => `
        <article class="schema-item">
          <strong>${name}</strong>
          <span>${key}</span>
          <small>${description}</small>
        </article>
      `,
    )
    .join("");

  const relationships = [
    "Employees.PositionCode → Positions.PositionCode",
    "FaultTypes.ModelCode → RepairableModels.ModelCode",
    "FaultTypes.PartCode1/2/3 → SpareParts.PartCode",
    "Orders.FaultCode → FaultTypes.FaultCode",
    "Orders.StoreCode → ServiceStores.StoreCode",
    "Orders.EmployeeCode → Employees.EmployeeCode",
  ];

  document.querySelector("#relationshipList").innerHTML = relationships
    .map((relationship) => `<li><i data-lucide="git-branch"></i><span>${relationship}</span></li>`)
    .join("");
}

function addOrder() {
  const form = document.querySelector("#orderForm");
  const warranty = document.querySelector("#newWarranty").checked ? 1 : 0;
  const order = {
    OrderNumber: nextOrderNumber(),
    OrderDate: document.querySelector("#newOrderDate").value,
    ReturnDate: document.querySelector("#newReturnDate").value || null,
    CustomerFullName: document.querySelector("#newCustomer").value.trim(),
    SerialNumber: document.querySelector("#newSerial").value.trim(),
    FaultCode: document.querySelector("#newFault").value,
    StoreCode: document.querySelector("#newStore").value,
    WarrantyMark: warranty,
    RepairWarrantyPeriod: Number(document.querySelector("#newWarrantyPeriod").value || 0),
    TotalPrice: Number(document.querySelector("#newTotal").value || 0),
    EmployeeCode: document.querySelector("#newEmployee").value,
  };

  if (!order.CustomerFullName || !order.SerialNumber) return;

  orders = [order, ...orders];
  saveOrders();
  form.reset();
  resetOrderFormDefaults();
  render();
  showToast(`Заказ №${order.OrderNumber} добавлен в локальную копию`);
}

function resetOrderFormDefaults(dateValue = new Date().toISOString().slice(0, 10)) {
  document.querySelector("#newOrderDate").value = dateValue;
  document.querySelector("#newReturnDate").value = dateValue;
  document.querySelector("#newWarrantyPeriod").value = 90;
  updateEstimate();
}

function updateEstimate() {
  const faultCode = document.querySelector("#newFault").value;
  const estimate = estimateFault(faultCode);
  document.querySelector("#newTotal").value = estimate || 0;
}

function exportData() {
  const blob = new Blob([JSON.stringify({ ...data, orders }, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "service-center-export.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("JSON-экспорт подготовлен");
}

function resetData() {
  const confirmed = window.confirm("Сбросить добавленные и удаленные заказы в локальной копии?");
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  orders = structuredClone(data.orders);
  render();
  showToast("Данные восстановлены из SQL-экспорта");
}

function filteredOrders() {
  return orders
    .map(enrichOrder)
    .filter((order) => {
      const matchesStore = state.store === "all" || order.StoreCode === state.store;
      const matchesModel = state.model === "all" || order.fault.ModelCode === state.model;
      const matchesWarranty =
        state.warranty === "all" ||
        (state.warranty === "yes" && Number(order.WarrantyMark) === 1) ||
        (state.warranty === "no" && Number(order.WarrantyMark) !== 1);
      const haystack = [
        order.CustomerFullName,
        order.SerialNumber,
        order.fault.Description,
        order.modelLabel,
        order.employee.FullName,
        order.store.StoreName,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !state.search || haystack.includes(state.search);
      return matchesStore && matchesModel && matchesWarranty && matchesSearch;
    })
    .sort((a, b) => b.OrderNumber - a.OrderNumber);
}

function enrichOrder(order) {
  const fault = lookups.faults.get(order.FaultCode);
  const model = lookups.models.get(fault.ModelCode);
  const employee = lookups.employees.get(order.EmployeeCode);
  const position = lookups.positions.get(employee.PositionCode);
  const store = lookups.stores.get(order.StoreCode);

  return {
    ...order,
    fault,
    model,
    employee,
    position,
    store,
    modelLabel: `${model.Manufacturer} ${model.ModelName}`,
  };
}

function estimateFault(faultCode) {
  const fault = lookups.faults.get(faultCode);
  if (!fault) return 0;
  const partsTotal = fault.PartCodes.reduce((sum, code) => {
    const part = lookups.parts.get(code);
    return sum + Number(part?.Price || 0);
  }, 0);
  return partsTotal + Number(fault.WorkPrice || 0);
}

function averageRepairDays(items) {
  const durations = items
    .filter((order) => order.OrderDate && order.ReturnDate)
    .map((order) => {
      const start = new Date(order.OrderDate);
      const end = new Date(order.ReturnDate);
      return Math.max(0, Math.round((end - start) / 86400000));
    });
  if (!durations.length) return 0;
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

function statCard(icon, label, value, detail) {
  return `
    <article class="stat-card">
      <i data-lucide="${icon}"></i>
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </article>
  `;
}

function tableMarkup(headers, rows) {
  return `
    <div class="surface-panel table-panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${safe(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${row.map((cell) => `<td>${safe(cell)}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function option(value, label) {
  return `<option value="${safe(value)}">${safe(label)}</option>`;
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

function mapBy(items, key) {
  return new Map(items.map((item) => [item[key], item]));
}

function nextOrderNumber() {
  return Math.max(0, ...orders.map((order) => Number(order.OrderNumber))) + 1;
}

function loadOrders() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(data.orders);
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : structuredClone(data.orders);
  } catch {
    return structuredClone(data.orders);
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 1.8,
      },
    });
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function safe(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
