
// ── state ──────────────────────────────────────────────────────────────
const genData = {};  // dataset -> array of rows

// ── helpers ────────────────────────────────────────────────────────────
const api = (url, opts) => fetch(url, { headers: {"Content-Type": "application/json"}, ...opts }).then(r => r.json());

function renderTable(data, containerId) {
  if (!data || !data.length) { document.getElementById(containerId).innerHTML = '<em class="text-muted">No data</em>'; return; }
  const keys = Object.keys(data[0]);
  let h = '<table class="table table-sm table-dark table-striped table-bordered"><thead><tr>';
  keys.forEach(k => h += `<th>${k}</th>`);
  h += '</tr></thead><tbody>';
  data.slice(0, 200).forEach(r => {
    h += '<tr>';
    keys.forEach(k => {
      let v = r[k]; if (v === null || v === undefined) v = '';
      h += `<td>${String(v).substring(0, 60)}</td>`;
    });
    h += '</tr>';
  });
  h += '</tbody></table>';
  if (data.length > 200) h += `<div class="text-muted small">Showing 200 of ${data.length} rows</div>`;
  document.getElementById(containerId).innerHTML = h;
}

function showPreview(dataset, data) {
  const el = document.getElementById('data-preview');
  document.getElementById('preview-label').textContent = `${dataset} (${data.length} rows)`;
  if (dataset === 'citizen_reports') {
    // JSON preview
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
      const url = dest === 'lakebase' ? `/api/push/lakebase/${ds}` : `/api/push/volume/${ds}`;
      const res = await api(url, { method: 'POST', body: JSON.stringify({ data }) });
      if (res.error) throw new Error(res.error);
      const loc = res.table || res.path;
      setStatus(card, `<span class="text-success"><i class="bi bi-cloud-check"></i> Pushed ${res.rows_inserted || res.rows_written} rows → <code>${loc}</code></span>`);
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
    // poll
    const poll = setInterval(async () => {
      const s = await api(`/api/pipeline/status/${uid}`);
      pipelineStatus.innerHTML = `<span class="badge badge-state badge-${s.state}">${s.state}</span> Update: <code>${uid}</code>`;
      if (['COMPLETED','FAILED','CANCELED'].includes(s.state)) {
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

document.getElementById('btn-genie-ask').addEventListener('click', async () => {
  const q = genieInput.value.trim();
  if (!q) return;
  genieInput.value = '';
  // user msg
  genieMsgs.innerHTML += `<div class="msg-user"><strong>You:</strong> ${q}</div>`;
  // loading
  const loadId = 'load-' + Date.now();
  genieMsgs.innerHTML += `<div class="msg-genie" id="${loadId}"><span class="spinner-border spinner-border-sm text-info"></span> Thinking...</div>`;
  genieMsgs.scrollTop = genieMsgs.scrollHeight;

  try {
    const ask = await api('/api/genie/ask', { method: 'POST', body: JSON.stringify({ question: q }) });
    if (ask.error) throw new Error(ask.error);
    const { conversation_id, message_id } = ask;
    // poll for result
    let result = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      result = await api(`/api/genie/poll/${conversation_id}/${message_id}`);
      if (result.error) throw new Error(result.error);
      const s = result.status;
      document.getElementById(loadId).innerHTML = `<span class="spinner-border spinner-border-sm text-info"></span> ${s.replace(/_/g, ' ').toLowerCase()}...`;
      if (['COMPLETED','FAILED','QUERY_RESULT_IS_EMPTY','CANCELLED'].includes(s)) break;
    }
    // render result
    let html = '<div class="msg-genie"><strong><i class="bi bi-stars text-success me-1"></i>Genie:</strong><br>';
    if (result.text) html += `<p>${result.text}</p>`;
    if (result.description) html += `<p class="text-muted small">${result.description}</p>`;
    // data table
    if (result.columns && result.rows && result.rows.length > 0) {
      html += '<div class="table-responsive" style="max-height:300px;overflow:auto">';
      html += '<table class="table table-sm table-dark table-striped table-bordered mt-2"><thead><tr>';
      result.columns.forEach(c => html += `<th>${c}</th>`);
      html += '</tr></thead><tbody>';
      result.rows.slice(0, 100).forEach(row => {
        html += '<tr>';
        row.forEach(v => html += `<td>${v !== null && v !== undefined ? v : ''}</td>`);
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      if (result.rows.length > 100) html += `<div class="text-muted small">Showing 100 of ${result.rows.length} rows</div>`;
    }
    // SQL trace (hidden by default)
    if (result.sql) {
      html += `<details class="sql-trace"><summary><i class="bi bi-code-slash me-1"></i>View SQL</summary><pre>${result.sql}</pre></details>`;
    }
    html += '</div>';
    document.getElementById(loadId).outerHTML = html;
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
