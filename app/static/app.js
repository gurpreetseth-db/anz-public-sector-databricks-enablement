
// ── state ──────────────────────────────────────────────────────────────
const genData = {};
const savedConnections = {};  // destination -> {field: value}

// ── helpers ────────────────────────────────────────────────────────────
const api = (url, opts) => fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.json());

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderTable(data, containerId) {
  if (!data || !data.length) { document.getElementById(containerId).innerHTML = '<em class="text-muted">No data</em>'; return; }
  const keys = Object.keys(data[0]);
  let h = '<table class="table table-sm table-dark table-striped table-bordered"><thead><tr>';
  keys.forEach(k => h += `<th>${k}</th>`);
  h += '</tr></thead><tbody>';
  data.slice(0, 200).forEach(r => { h += '<tr>'; keys.forEach(k => { let v = r[k]; if (v === null || v === undefined) v = ''; h += `<td>${String(v).substring(0, 60)}</td>`; }); h += '</tr>'; });
  h += '</tbody></table>';
  if (data.length > 200) h += `<div class="text-muted small">Showing 200 of ${data.length} rows</div>`;
  document.getElementById(containerId).innerHTML = h;
}

function showPreview(dataset, data) {
  const el = document.getElementById('data-preview');
  document.getElementById('preview-label').textContent = `${dataset} (${data.length} rows)`;
  if (dataset === 'citizen_reports') {
    let h = '<pre style="max-height:350px;overflow:auto;background:#161B22;padding:12px;border-radius:6px;font-size:.78rem;color:#7EE787">';
    data.slice(0, 20).forEach(r => h += JSON.stringify(r, null, 2) + '\n');
    if (data.length > 20) h += `\n... ${data.length - 20} more records`;
    h += '</pre>';
    document.getElementById('preview-content').innerHTML = h;
  } else {
    renderTable(data, 'preview-content');
  }
  el.style.display = 'block';
}

function setStatus(card, html) { card.querySelector('.gen-status').innerHTML = html; }

function normalizeHost(value) {
  return String(value || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function normalizeSqlServerHost(value) {
  const host = normalizeHost(value);
  return host.endsWith('.database.windows.net') ? host : host + '.database.windows.net';
}

function buildConnectionPreview(dest, values) {
  if (dest === 'sqlserver') {
    return `Server=tcp:${normalizeSqlServerHost(values.server_name)},1433;Initial Catalog=${values.catalog_name || ''};Persist Security Info=False;User ID=${values.user_id || ''};Password=<redacted>;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;
  }
  if (dest === 'lakebase') {
    return `PGHOST=${values.pghost || ''} PGDATABASE=${values.pgdatabase || ''} PGUSER=${values.pguser || ''} PGPASSWORD=<redacted> PGSSLMODE='required'`;
  }
  if (dest === 'lakehouse') {
    return `jdbc:databricks://${normalizeHost(values.databricks_url)}:443/default;transportMode=http;ssl=1;AuthMech=3;httpPath=/sql/1.0/warehouses/${values.warehouse_id || ''};`;
  }
  return '';
}

function sharedFieldsTemplate(dest, values = {}) {
  if (dest === 'sqlserver') {
    return `
      <label class="form-label small text-muted mb-1">SQL Server Connection</label>
      <div class="row g-2">
        <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="server_name" placeholder="Server Name" value="${escapeHtml(values.server_name || '')}"></div>
        <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="catalog_name" placeholder="Catalog Name" value="${escapeHtml(values.catalog_name || '')}"></div>
        <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="user_id" placeholder="UserID" value="${escapeHtml(values.user_id || '')}"></div>
        <div class="col-6"><input type="password" class="form-control form-control-sm shared-input" data-field="password" placeholder="Password" value="${escapeHtml(values.password || '')}"></div>
      </div>`;
  }
  if (dest === 'lakebase') {
    return `
      <label class="form-label small text-muted mb-1">Lakebase Connection</label>
      <div class="row g-2">
        <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="pghost" placeholder="PGHOST" value="${escapeHtml(values.pghost || '')}"></div>
        <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="pgdatabase" placeholder="PGDATABASE" value="${escapeHtml(values.pgdatabase || '')}"></div>
        <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="pguser" placeholder="PGUSER" value="${escapeHtml(values.pguser || '')}"></div>
        <div class="col-6"><input type="password" class="form-control form-control-sm shared-input" data-field="pgpassword" placeholder="PGPASSWORD" value="${escapeHtml(values.pgpassword || '')}"></div>
      </div>`;
  }
  return `
    <label class="form-label small text-muted mb-1">Lakehouse Connection</label>
    <div class="row g-2">
      <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="databricks_url" placeholder="Databricks URL" value="${escapeHtml(values.databricks_url || '')}"></div>
      <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="warehouse_id" placeholder="WarehouseID" value="${escapeHtml(values.warehouse_id || '')}"></div>
      <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="catalog_name" placeholder="CatalogName" value="${escapeHtml(values.catalog_name || '')}"></div>
      <div class="col-6"><input class="form-control form-control-sm shared-input" data-field="schema_name" placeholder="SchemaName" value="${escapeHtml(values.schema_name || '')}"></div>
    </div>`;
}

function getSharedDestination() {
  return document.getElementById('shared-target-select').value;
}

function readSharedValues() {
  const values = {};
  document.querySelectorAll('#shared-target-fields .shared-input').forEach(input => {
    values[input.dataset.field] = input.value;
  });
  return values;
}

function saveSharedValues() {
  const dest = getSharedDestination();
  savedConnections[dest] = readSharedValues();
}

function renderSharedTargetFields() {
  const dest = getSharedDestination();
  const saved = savedConnections[dest] || {};
  const container = document.getElementById('shared-target-fields');
  container.innerHTML = sharedFieldsTemplate(dest, saved);
  container.querySelectorAll('.shared-input').forEach(input => {
    input.addEventListener('input', () => { saveSharedValues(); updateSharedPreview(); });
  });
  updateSharedPreview();
}

function updateSharedPreview() {
  const dest = getSharedDestination();
  const values = readSharedValues();
  document.getElementById('shared-connection-preview').textContent = buildConnectionPreview(dest, values);
}

function validateConnection(destination, values) {
  const requiredByDest = {
    sqlserver: ['server_name', 'catalog_name', 'user_id', 'password'],
    lakebase: ['pghost', 'pgdatabase', 'pguser', 'pgpassword'],
    lakehouse: ['databricks_url', 'warehouse_id', 'catalog_name', 'schema_name']
  };
  const missing = (requiredByDest[destination] || []).filter(f => !String(values[f] || '').trim());
  if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

function formatPushSuccess(res) {
  const loc = res.table || res.path;
  let html = `<span class="text-success"><i class="bi bi-cloud-check"></i> Pushed ${res.rows_inserted || res.rows_written} rows → <code>${loc}</code></span>`;
  if (res.connection_preview) {
    html += `<details class="mt-2"><summary class="text-muted">Connection string</summary><code>${escapeHtml(res.connection_preview)}</code></details>`;
  }
  return html;
}

// ── shared target configuration ────────────────────────────────────────
const sharedSelect = document.getElementById('shared-target-select');
renderSharedTargetFields();
sharedSelect.addEventListener('change', () => renderSharedTargetFields());

// ── generate buttons ───────────────────────────────────────────────────
document.querySelectorAll('.btn-gen').forEach(btn => {
  btn.addEventListener('click', async () => {
    const ds = btn.dataset.dataset;
    const card = document.getElementById('card-' + ds);
    const count = parseInt(card.querySelector('.gen-count').value) || 10;
    setStatus(card, '<span class="spinner-border spinner-border-sm text-info"></span> Generating...');
    btn.disabled = true;
    try {
      const res = await api(`/api/generate/${ds}`, { method: 'POST', body: JSON.stringify({ count }) });
      if (res.error) throw new Error(res.error);
      genData[ds] = res.data;
      card.querySelector('.btn-push').disabled = false;
      setStatus(card, `<span class="text-success"><i class="bi bi-check-circle"></i> ${res.count} rows generated</span>`);
      showPreview(ds, res.data);
    } catch (e) {
      setStatus(card, `<span class="text-danger"><i class="bi bi-x-circle"></i> ${e.message}</span>`);
    }
    btn.disabled = false;
  });
});

// ── push buttons ───────────────────────────────────────────────────────
document.querySelectorAll('.btn-push').forEach(btn => {
  btn.addEventListener('click', async () => {
    const ds = btn.dataset.dataset;
    const dest = btn.dataset.dest;
    const card = document.getElementById('card-' + ds);
    const data = genData[ds];
    if (!data || !data.length) return;
    setStatus(card, '<span class="spinner-border spinner-border-sm text-success"></span> Pushing...');
    btn.disabled = true;
    try {
      if (dest === 'tabular') {
        const destination = getSharedDestination();
        const connection = readSharedValues();
        validateConnection(destination, connection);
        saveSharedValues();
        const res = await api(`/api/push/tabular/${ds}`, {
          method: 'POST',
          body: JSON.stringify({ data, destination, connection })
        });
        if (res.error) throw new Error(res.error);
        setStatus(card, formatPushSuccess(res));
      } else {
        const res = await api(`/api/push/volume/${ds}`, { method: 'POST', body: JSON.stringify({ data }) });
        if (res.error) throw new Error(res.error);
        setStatus(card, `<span class="text-success"><i class="bi bi-cloud-check"></i> Pushed ${res.rows_written} rows → <code>${res.path}</code></span>`);
      }
    } catch (e) {
      setStatus(card, `<span class="text-danger"><i class="bi bi-x-circle"></i> ${e.message}</span>`);
    }
    btn.disabled = false;
  });
});

// ── pipeline ───────────────────────────────────────────────────────────
const pipelineStatus = document.getElementById('pipeline-status');
const pipelineHistory = document.getElementById('pipeline-history');

document.getElementById('btn-run-pipeline').addEventListener('click', async () => {
  pipelineStatus.innerHTML = '<span class="spinner-border spinner-border-sm text-info"></span> Starting pipeline...';
  try {
    const res = await api('/api/pipeline/run', { method: 'POST' });
    if (res.error) throw new Error(res.error);
    const uid = res.update_id;
    pipelineStatus.innerHTML = `<span class="badge bg-info">RUNNING</span> Update: <code>${uid}</code> <span class="spinner-border spinner-border-sm text-info ms-2"></span>`;
    const poll = setInterval(async () => {
      const s = await api(`/api/pipeline/status/${uid}`);
      pipelineStatus.innerHTML = `<span class="badge badge-state badge-${s.state}">${s.state}</span> Update: <code>${uid}</code>`;
      if (['COMPLETED', 'FAILED', 'CANCELED'].includes(s.state)) {
        clearInterval(poll);
        if (s.state === 'COMPLETED') pipelineStatus.innerHTML += ' <i class="bi bi-check-circle text-success ms-1"></i>';
        loadHistory();
      }
    }, 5000);
  } catch (e) {
    pipelineStatus.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> ${e.message}</span>`;
  }
});

async function loadHistory() {
  pipelineHistory.innerHTML = '<span class="spinner-border spinner-border-sm text-muted"></span>';
  try {
    const res = await api('/api/pipeline/history');
    if (res.error) throw new Error(res.error);
    let h = `<div class="mb-2"><strong>${res.pipeline_name}</strong> &mdash; <span class="badge badge-state badge-${res.state}">${res.state}</span></div>`;
    h += '<table class="table table-sm table-dark table-striped"><thead><tr><th>Update ID</th><th>State</th><th>Time</th></tr></thead><tbody>';
    (res.updates || []).forEach(u => {
      h += `<tr><td><code>${u.update_id}</code></td><td><span class="badge badge-state badge-${u.state}">${u.state}</span></td><td>${u.creation_time || ''}</td></tr>`;
    });
    h += '</tbody></table>';
    pipelineHistory.innerHTML = h;
  } catch (e) {
    pipelineHistory.innerHTML = `<span class="text-danger">${e.message}</span>`;
  }
}
document.getElementById('btn-refresh-history').addEventListener('click', loadHistory);

// ── genie ──────────────────────────────────────────────────────────────
const genieMsgs = document.getElementById('genie-messages');
const genieInput = document.getElementById('genie-input');
let genieChartCounter = 0;

const CHART_PALETTE = [
  '#58A6FF', '#3FB950', '#F0883E', '#BC8CFF', '#FF7B72',
  '#79C0FF', '#56D364', '#D2A8FF', '#FFA657', '#FF9B8E',
  '#1F6FEB', '#238636', '#9E6A03', '#8957E5', '#DA3633'
];

function detectChartType(columns, rows) {
  if (!columns || columns.length < 2 || !rows || rows.length < 1) return null;
  const numCols = [];
  const strCols = [];
  columns.forEach((col, i) => {
    const sample = rows.slice(0, 5).map(r => r[i]);
    const allNum = sample.every(v => v === null || v === '' || !isNaN(Number(v)));
    if (allNum) numCols.push(i); else strCols.push(i);
  });
  if (numCols.length === 0 || strCols.length === 0) return null;
  const labelIdx = strCols[0];
  const labels = rows.map(r => r[labelIdx] || '');
  const isTimeSeries = labels.length > 2 && labels.every(l =>
    /^\d{4}/.test(l) || /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]/i.test(l)
  );
  const datasets = numCols.map((ci, di) => ({
    label: columns[ci],
    data: rows.map(r => r[ci] !== null && r[ci] !== '' ? Number(r[ci]) : 0),
    backgroundColor: CHART_PALETTE[di % CHART_PALETTE.length] + '99',
    borderColor: CHART_PALETTE[di % CHART_PALETTE.length],
    borderWidth: 2,
    fill: false,
    tension: 0.3,
  }));
  let type = 'bar';
  if (isTimeSeries) type = 'line';
  else if (rows.length <= 8 && numCols.length === 1) type = 'doughnut';
  return { type, labels, datasets, labelCol: columns[labelIdx] };
}

function renderGenieChart(chartData, containerId) {
  const canvas = document.getElementById(containerId);
  if (!canvas || !chartData) return;
  const isDoughnut = chartData.type === 'doughnut';
  new Chart(canvas, {
    type: chartData.type,
    data: {
      labels: chartData.labels,
      datasets: isDoughnut
        ? [{
            data: chartData.datasets[0].data,
            backgroundColor: CHART_PALETTE.slice(0, chartData.labels.length).map(c => c + 'CC'),
            borderColor: CHART_PALETTE.slice(0, chartData.labels.length),
            borderWidth: 1
          }]
        : chartData.datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartData.datasets.length > 1 || isDoughnut,
          labels: { color: '#C9D1D9', font: { size: 11 } }
        },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: isDoughnut ? {} : {
        x: { ticks: { color: '#8B949E', maxRotation: 45 }, grid: { color: '#21262D' } },
        y: { ticks: { color: '#8B949E' }, grid: { color: '#21262D' }, beginAtZero: true },
      },
    },
  });
}

document.getElementById('btn-genie-ask').addEventListener('click', async () => {
  const q = genieInput.value.trim();
  if (!q) return;
  genieInput.value = '';
  genieMsgs.innerHTML += `<div class="msg-user"><strong>You:</strong> ${q}</div>`;
  const loadId = 'load-' + Date.now();
  genieMsgs.innerHTML += `<div class="msg-genie" id="${loadId}"><span class="spinner-border spinner-border-sm text-info"></span> Thinking...</div>`;
  genieMsgs.scrollTop = genieMsgs.scrollHeight;

  try {
    const ask = await api('/api/genie/ask', { method: 'POST', body: JSON.stringify({ question: q }) });
    if (ask.error) throw new Error(ask.error);
    const { conversation_id, message_id } = ask;
    let result = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      result = await api(`/api/genie/poll/${conversation_id}/${message_id}`);
      if (result.error) throw new Error(result.error);
      const s = result.status;
      document.getElementById(loadId).innerHTML = `<span class="spinner-border spinner-border-sm text-info"></span> ${s.replace(/_/g, ' ').toLowerCase()}...`;
      if (['COMPLETED', 'FAILED', 'QUERY_RESULT_IS_EMPTY', 'CANCELLED'].includes(s)) break;
    }

    const chartId = 'genie-chart-' + (++genieChartCounter);
    let html = '<div class="msg-genie"><strong><i class="bi bi-stars text-success me-1"></i>Genie:</strong><br>';
    if (result.text) html += `<p>${result.text}</p>`;
    if (result.description) html += `<p class="text-muted small">${result.description}</p>`;

    if (result.columns && result.rows && result.rows.length > 0) {
      const chartData = detectChartType(result.columns, result.rows);
      if (chartData) {
        html += `<div class="genie-chart-wrap" style="position:relative;height:280px;margin:12px 0">`;
        html += `<canvas id="${chartId}"></canvas></div>`;
      }
      html += '<div class="table-responsive genie-table-wrap" style="max-height:260px;overflow:auto;margin-top:8px">';
      html += '<table class="table table-sm table-dark table-striped table-bordered table-hover"><thead><tr>';
      result.columns.forEach(c => html += `<th>${c}</th>`);
      html += '</tr></thead><tbody>';
      result.rows.slice(0, 200).forEach(row => {
        html += '<tr>';
        row.forEach(v => {
          const val = v !== null && v !== undefined ? v : '';
          const isNum = val !== '' && !isNaN(Number(val));
          const fmt = isNum ? Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 }) : val;
          html += `<td${isNum ? ' class="text-end"' : ''}>${fmt}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      if (result.rows.length > 200) html += `<div class="text-muted small">Showing 200 of ${result.rows.length} rows</div>`;
      if (result.sql) {
        html += `<details class="sql-trace"><summary><i class="bi bi-code-slash me-1"></i>View SQL</summary><pre>${result.sql}</pre></details>`;
      }
      html += '</div>';
      document.getElementById(loadId).outerHTML = html;
      if (chartData) setTimeout(() => renderGenieChart(chartData, chartId), 50);
    } else {
      if (result.sql) {
        html += `<details class="sql-trace"><summary><i class="bi bi-code-slash me-1"></i>View SQL</summary><pre>${result.sql}</pre></details>`;
      }
      if (result.status === 'QUERY_RESULT_IS_EMPTY') html += '<p class="text-muted">Query returned no results.</p>';
      html += '</div>';
      document.getElementById(loadId).outerHTML = html;
    }
  } catch (e) {
    document.getElementById(loadId).outerHTML = `<div class="msg-genie text-danger"><i class="bi bi-x-circle me-1"></i>${e.message}</div>`;
  }
  genieMsgs.scrollTop = genieMsgs.scrollHeight;
});

// ── dashboard ──────────────────────────────────────────────────────────
document.querySelector('a[href="#tab-dashboard"]').addEventListener('shown.bs.tab', async () => {
  const res = await api('/api/dashboard/url');
  const iframe = document.getElementById('dashboard-iframe');
  const link = document.getElementById('dashboard-link');
  if (res.workspace_url) {
    const url = `${res.workspace_url}${res.embed_path}`;
    iframe.src = url;
    link.href = `${res.workspace_url}/sql/dashboardsv3/${res.dashboard_id}`;
  } else {
    iframe.parentElement.innerHTML = `<div class="alert alert-warning">Dashboard embedding requires DATABRICKS_HOST. <a href="/sql/dashboardsv3/${res.dashboard_id}" target="_blank">Open dashboard</a></div>`;
  }
});
