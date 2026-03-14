const API_BASE = '';

function getToken() {
  return localStorage.getItem('ims_token');
}

function setToken(token) {
  if (token) localStorage.setItem('ims_token', token);
  else localStorage.removeItem('ims_token');
}

function getUser() {
  try {
    const data = localStorage.getItem('ims_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setUser(user) {
  if (user) localStorage.setItem('ims_user', JSON.stringify(user));
  else localStorage.removeItem('ims_user');
}

function api(path, options = {}) {
  const url = `${API_BASE}/api${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  const screen = document.getElementById(id);
  if (screen) screen.classList.remove('hidden');
}

function showLogin() {
  setToken(null);
  setUser(null);
  showScreen('screen-login');
  document.getElementById('login-error').textContent = '';
}

function showView(view) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
    const v = item.dataset.view;
    item.classList.toggle('nav-item-active', v === view);
  });
}

function showDashboard() {
  showScreen('screen-dashboard');
  const user = getUser();
  const el = document.getElementById('user-email');
  if (el) el.textContent = user?.email ?? '—';
  showView('dashboard');
  fetchKpis();
}

async function fetchKpis() {
  const res = await api('/dashboard/kpis');
  if (!res.ok) return;
  const data = await res.json();
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
  };
  set('kpi-total-stock', data.totalProductsInStock ?? 0);
  set('kpi-product-types', data.totalProductTypes ?? 0);
  set('kpi-low-stock', data.lowStockOutOfStockItems ?? 0);
  set('kpi-pending-receipts', data.pendingReceipts ?? 0);
  set('kpi-pending-deliveries', data.pendingDeliveries ?? 0);
  set('kpi-scheduled-transfers', data.internalTransfersScheduled ?? 0);
}

async function fetchProducts() {
  const res = await api('/products?limit=20');
  if (!res.ok) return;
  const data = await res.json();
  const tbody = document.getElementById('products-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  (data.items || []).forEach((p) => {
    const total = (p.stockLevels || []).reduce((sum, s) => sum + (s.quantity ?? 0), 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.sku}</td>
      <td>${p.category?.name || '—'}</td>
      <td class="cell-right">${total.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function fetchOperations() {
  const res = await api('/dashboard/operations?limit=20');
  if (!res.ok) return;
  const data = await res.json();
  const tbody = document.getElementById('operations-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  (data.items || []).forEach((op) => {
    const warehouseName =
      op.warehouse?.name ||
      op.fromWarehouse?.name ||
      op.toWarehouse?.name ||
      '—';
    const created = op.createdAt ? new Date(op.createdAt).toLocaleString() : '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${op.documentType}</td>
      <td>${op.number}</td>
      <td>${op.status}</td>
      <td>${warehouseName}</td>
      <td>${created}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function fetchSettings() {
  const user = getUser();
  const emailEl = document.getElementById('settings-email');
  const roleEl = document.getElementById('settings-role');
  if (emailEl) emailEl.textContent = user?.email || '—';
  if (roleEl) roleEl.textContent = user?.role || '—';

  const res = await api('/warehouses');
  if (!res.ok) return;
  const warehouses = await res.json();
  const tbody = document.getElementById('settings-warehouses-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  warehouses.forEach((w) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${w.name}</td>
      <td>${w.code || '—'}</td>
      <td class="cell-right">${(w._count?.stockLevels ?? 0).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  errEl.textContent = '';
  const res = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    errEl.textContent = data.error || 'Login failed';
    return;
  }
  if (data.token) setToken(data.token);
  if (data.user) setUser(data.user);
  showDashboard();
});

document.getElementById('btn-logout')?.addEventListener('click', showLogin);

document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const view = item.dataset.view;
    if (!view) return;
    showView(view);
    if (view === 'dashboard') fetchKpis();
    if (view === 'products') fetchProducts();
    if (view === 'operations') fetchOperations();
    if (view === 'settings') fetchSettings();
  });
});

if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
