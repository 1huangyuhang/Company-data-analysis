const state = {
  page: 1,
  pageSize: 20,
  total: 0,
  lastItems: [],
  lastQuery: null,
  importPage: 1,
  importPageSize: 20,
  importTotal: 0,
  importItems: [],
  selectedImportCompanyId: null,
};

function el(id) {
  return document.getElementById(id);
}

function apiBase() {
  return el("apiBase").value.trim().replace(/\/$/, "");
}

function showMsg(msg, isError = false) {
  const box = el("msg");
  box.textContent = msg;
  box.style.color = isError ? "#b42318" : "#475467";
}

function parseCsvInput(value) {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_e) {
    return String(value);
  }
}

function setImportEditEnabled(enabled) {
  el("saveImportEditBtn").disabled = !enabled;
  el("editSelectionHint").textContent = enabled ? `当前编辑企业 #${state.selectedImportCompanyId}` : "请先在上方列表选择一条记录";
}

function resetImportEditForm() {
  state.selectedImportCompanyId = null;
  el("editCompanyId").value = "";
  el("editName").value = "";
  el("editCity").value = "";
  el("editIndustry").value = "";
  el("editAddress").value = "";
  el("editTags").value = "";
  el("editRawData").value = "{}";
  setImportEditEnabled(false);
}

function selectImportCompany(companyId) {
  const selected = state.importItems.find((x) => x.id === companyId);
  if (!selected) {
    return;
  }
  state.selectedImportCompanyId = selected.id;
  el("editCompanyId").value = String(selected.id);
  el("editName").value = selected.name || "";
  el("editCity").value = selected.city || "";
  el("editIndustry").value = selected.industry || "";
  el("editAddress").value = selected.address || "";
  el("editTags").value = Array.isArray(selected.tags) ? selected.tags.join(",") : "";
  el("editRawData").value = safeJson(selected.raw_data || {});
  setImportEditEnabled(true);
}

function setupTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-btn"));
  const panels = {
    import: el("tab-import"),
    search: el("tab-search"),
    overview: el("tab-overview"),
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      Object.values(panels).forEach((panel) => panel.classList.add("hidden"));
      panels[btn.dataset.tab].classList.remove("hidden");
    });
  });
}

async function handleImport(event) {
  event.preventDefault();
  const fileInput = el("excelFile");
  if (!fileInput.files || !fileInput.files[0]) {
    showMsg("请先选择 Excel 文件。", true);
    return;
  }
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  showMsg("正在上传并导入，请稍候...");
  try {
    const res = await fetch(`${apiBase()}/api/v1/import/excel`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.detail || data?.error?.message || "导入失败");
    }
    const importId = data.data.import_id;
    el("importIdInput").value = importId;
    showMsg(`导入成功：${importId}，可直接查询并调整导入数据。`);
  } catch (error) {
    showMsg(`导入失败：${error.message}`, true);
  }
}

function renderImportTable(items) {
  const tbody = el("importDataTable");
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8">暂无数据</td></tr>`;
    resetImportEditForm();
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "import-row";
    tr.dataset.id = String(item.id);
    if (item.id === state.selectedImportCompanyId) {
      tr.classList.add("selected");
    }
    tr.innerHTML = `
      <td>${item.id}</td>
      <td>${item.source_row || ""}</td>
      <td>${item.name || ""}</td>
      <td>${item.city || ""}</td>
      <td>${item.industry || ""}</td>
      <td>${item.address || ""}</td>
      <td>${Array.isArray(item.tags) ? item.tags.join(", ") : ""}</td>
      <td><button type="button" class="secondary import-edit-btn" data-id="${item.id}">编辑</button></td>
    `;
    tbody.appendChild(tr);
  });

  Array.from(document.querySelectorAll(".import-row")).forEach((row) => {
    row.addEventListener("click", () => {
      selectImportCompany(Number(row.dataset.id));
      renderImportTable(state.importItems);
      showMsg(`已选中企业 #${state.selectedImportCompanyId}，可修改后保存。`);
    });
  });

  Array.from(document.querySelectorAll(".import-edit-btn")).forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      selectImportCompany(Number(btn.dataset.id));
      renderImportTable(state.importItems);
      showMsg(`已选中企业 #${state.selectedImportCompanyId}，可修改后保存。`);
    });
  });
}

function renderImportMeta() {
  const totalPage = Math.max(1, Math.ceil(state.importTotal / state.importPageSize));
  el("importPageInfo").textContent = `第 ${state.importPage} / ${totalPage} 页（共 ${state.importTotal} 条）`;
}

async function queryImportData() {
  const importId = el("importIdInput").value.trim();
  if (!importId) {
    showMsg("请输入 import_id。", true);
    return;
  }
  state.importPageSize = Number(el("importPageSize").value || 20);
  showMsg("正在查询导入数据...");
  try {
    const res = await fetch(
      `${apiBase()}/api/v1/companies/by-import/${encodeURIComponent(importId)}?page=${state.importPage}&page_size=${state.importPageSize}`
    );
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.detail || data?.error?.message || "查询导入数据失败");
    }
    state.importTotal = data.data.total;
    state.importItems = data.data.items || [];
    if (!state.importItems.some((x) => x.id === state.selectedImportCompanyId)) {
      resetImportEditForm();
    }
    renderImportTable(state.importItems);
    renderImportMeta();
    showMsg(`查询完成：当前批次共 ${state.importTotal} 条。`);
  } catch (error) {
    showMsg(`查询失败：${error.message}`, true);
  }
}

async function saveImportEdit(event) {
  event.preventDefault();
  if (!state.selectedImportCompanyId) {
    showMsg("请先在上方表格选择一条数据进行编辑。", true);
    return;
  }

  let rawData;
  try {
    rawData = JSON.parse(el("editRawData").value || "{}");
  } catch (_error) {
    showMsg("raw_data 不是合法 JSON，请修正后再保存。", true);
    return;
  }

  const payload = {
    name: el("editName").value.trim(),
    city: el("editCity").value.trim(),
    industry: el("editIndustry").value.trim(),
    address: el("editAddress").value.trim(),
    tags: parseCsvInput(el("editTags").value),
    raw_data: rawData,
  };

  showMsg("正在保存修改...");
  try {
    const res = await fetch(`${apiBase()}/api/v1/companies/${state.selectedImportCompanyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.detail || data?.error?.message || "保存失败");
    }
    showMsg(`保存成功：企业 #${state.selectedImportCompanyId} 已更新。`);
    queryImportData();
  } catch (error) {
    showMsg(`保存失败：${error.message}`, true);
  }
}

function readSearchPayload() {
  state.pageSize = Number(el("pageSize").value || 20);
  return {
    keyword: el("keyword").value.trim(),
    match_mode: el("matchMode").value,
    filters: {
      city: parseCsvInput(el("city").value),
      industry: parseCsvInput(el("industry").value),
    },
    page: state.page,
    page_size: state.pageSize,
  };
}

function renderTable(items) {
  const tbody = el("resultTable");
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7">暂无数据</td></tr>`;
    return;
  }
  items.forEach((item) => {
    const tr = document.createElement("tr");
    const tags = Array.isArray(item.tags) ? item.tags.join(", ") : "";
    tr.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name || ""}</td>
      <td>${item.city || ""}</td>
      <td>${item.industry || ""}</td>
      <td>${item.address || ""}</td>
      <td>${tags}</td>
      <td><button type="button" class="secondary view-btn" data-id="${item.id}">查看</button></td>
    `;
    tbody.appendChild(tr);
  });

  Array.from(document.querySelectorAll(".view-btn")).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const selected = state.lastItems.find((x) => x.id === id);
      if (!selected) {
        return;
      }
      el("rawDataBox").textContent = safeJson({
        id: selected.id,
        name: selected.name,
        city: selected.city,
        industry: selected.industry,
        raw_data: selected.raw_data,
      });
    });
  });
}

function renderMeta() {
  const totalPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  el("resultMeta").textContent = `总数 ${state.total} 条`;
  el("pageInfo").textContent = `第 ${state.page} / ${totalPage} 页`;
  const list = el("overviewList").querySelectorAll("li");
  list[0].textContent = `总企业数：${state.total}`;
  list[1].textContent = `当前筛选命中数：${state.total}`;
  list[2].textContent = `当前页数据条数：${state.lastItems.length}`;
}

async function doSearch() {
  const payload = readSearchPayload();
  state.lastQuery = payload;
  showMsg("正在检索企业数据...");
  try {
    const res = await fetch(`${apiBase()}/api/v1/companies/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.detail || data?.error?.message || "检索失败");
    }
    state.total = data.data.total;
    state.lastItems = data.data.items || [];
    renderTable(state.lastItems);
    renderMeta();
    showMsg(`检索完成：命中 ${state.total} 条。`);
  } catch (error) {
    showMsg(`检索失败：${error.message}`, true);
  }
}

function resetSearch() {
  el("keyword").value = "";
  el("matchMode").value = "fuzzy";
  el("city").value = "";
  el("industry").value = "";
  el("pageSize").value = "20";
  state.page = 1;
  state.pageSize = 20;
  state.total = 0;
  state.lastItems = [];
  renderTable([]);
  renderMeta();
  el("rawDataBox").textContent = "请先点击“查看”";
  showMsg("检索条件已重置。");
}

function setupEvents() {
  el("importForm").addEventListener("submit", handleImport);
  el("queryImportDataBtn").addEventListener("click", () => {
    state.importPage = 1;
    queryImportData();
  });
  el("prevImportPageBtn").addEventListener("click", () => {
    if (state.importPage <= 1) {
      return;
    }
    state.importPage -= 1;
    queryImportData();
  });
  el("nextImportPageBtn").addEventListener("click", () => {
    const totalPage = Math.max(1, Math.ceil(state.importTotal / state.importPageSize));
    if (state.importPage >= totalPage) {
      return;
    }
    state.importPage += 1;
    queryImportData();
  });
  el("importEditForm").addEventListener("submit", saveImportEdit);
  el("cancelImportEditBtn").addEventListener("click", () => {
    resetImportEditForm();
    renderImportTable(state.importItems);
    showMsg("已取消选中，可重新选择记录。");
  });

  el("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.page = 1;
    doSearch();
  });
  el("resetBtn").addEventListener("click", resetSearch);

  el("prevPageBtn").addEventListener("click", () => {
    if (state.page <= 1) {
      return;
    }
    state.page -= 1;
    doSearch();
  });
  el("nextPageBtn").addEventListener("click", () => {
    const totalPage = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page >= totalPage) {
      return;
    }
    state.page += 1;
    doSearch();
  });
}

function init() {
  setupTabs();
  setupEvents();
  renderTable([]);
  renderMeta();
  renderImportTable([]);
  renderImportMeta();
  resetImportEditForm();
  showMsg("前端已就绪，请先导入 Excel 或直接检索。");
}

init();
