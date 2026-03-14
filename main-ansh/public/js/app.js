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

function showDashboard() {
  showScreen('screen-dashboard');
  const user = getUser();
  const el = document.getElementById('user-email');
  if (el) el.textContent = user?.email ?? '—';
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

if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
