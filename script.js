const KEYS = {
  settings: 'ba_settings',
  clients: 'ba_clients',
  orders: 'ba_orders',
  messages: 'ba_messages',
};

const defaults = {
  settings: { module_clients: true, module_sales: true, module_analytics: true, module_chat: true },
  clients: [],
  orders: [],
  messages: [],
};

function load(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

let settings = load(KEYS.settings) ?? defaults.settings;
let clients = load(KEYS.clients) ?? [];
let orders = load(KEYS.orders) ?? [];
let messages = load(KEYS.messages) ?? [];

const navLinks = document.querySelectorAll('.nav a, button[data-route]');
const pages = document.querySelectorAll('.page');
function showPage(name) {
  pages.forEach(p => p.classList.toggle('visible', p.dataset.page === name));
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
  if (name === 'dashboard') renderDashboard();
  if (name === 'clients') renderClients();
  if (name === 'sales') { renderClientsSelect(); renderOrders(); }
  if (name === 'analytics') renderAnalytics();
  if (name === 'chat') renderChat();
  if (name === 'settings') hydrateSettings();
}
navLinks.forEach(el => el.addEventListener('click', e => {
  const route = e.currentTarget.dataset.route;
  if (!route) return;
  e.preventDefault();
  showPage(route);
}));

const settingsForm = document.getElementById('settingsForm');
const resetAllBtn = document.getElementById('resetAll');
function hydrateSettings() {
  for (const k of ['module_clients','module_sales','module_analytics','module_chat']) {
    const input = settingsForm.querySelector(`[name="${k}"]`);
    if (input) input.checked = !!settings[k];
  }
  applyVisibility();
}
settingsForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(settingsForm);
  settings = {
    module_clients: !!form.get('module_clients'),
    module_sales: !!form.get('module_sales'),
    module_analytics: !!form.get('module_analytics'),
    module_chat: !!form.get('module_chat')
  };
  save(KEYS.settings, settings);
  applyVisibility();
  alert('Сақталды!');
});
resetAllBtn?.addEventListener('click', () => {
  if (!confirm('Барлығын тазалау? Деректер өшіріледі.')) return;
  localStorage.removeItem(KEYS.clients);
  localStorage.removeItem(KEYS.orders);
  localStorage.removeItem(KEYS.messages);
  localStorage.removeItem(KEYS.settings);
  settings = JSON.parse(JSON.stringify(defaults.settings));
  clients = []; orders = []; messages = [];
  hydrateSettings();
  renderDashboard(); renderClients(); renderOrders(); renderAnalytics(); renderChat();
  alert('Тазаланды ✅');
});

function applyVisibility() {
  for (const item of document.querySelectorAll('.nav a[data-route]')) {
    const route = item.dataset.route;
    const map = { clients: 'module_clients', sales: 'module_sales', analytics: 'module_analytics', chat: 'module_chat' };
    if (map[route]) {
      item.classList.toggle('hidden', !settings[map[route]]);
    }
  }
  document.querySelectorAll('#dashboard-modules .module').forEach(el => {
    const mod = el.dataset.module;
    const map = { clients: 'module_clients', sales: 'module_sales', analytics: 'module_analytics', chat: 'module_chat' };
    el.classList.toggle('hidden', !settings[map[mod]]);
  });
}

function sumRevenue() {
  return orders.filter(o => o.status !== 'canceled')
    .reduce((acc, o) => acc + Number(o.amount || 0), 0);
}
function ordersLast7d() {
  const now = Date.now();
  const seven = 7 * 24 * 3600 * 1000;
  return orders.filter(o => (now - new Date(o.created_at).getTime()) <= seven).length;
}
function renderDashboard() {
  document.getElementById('statClients').textContent = clients.length;
  document.getElementById('statOrders').textContent = ordersLast7d();
  document.getElementById('statRevenue').textContent = sumRevenue().toLocaleString('kk-KZ');
  applyVisibility();
}

const clientForm = document.getElementById('clientForm');
const clientsTable = document.getElementById('clientsTable');
clientForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(clientForm).entries());
  const row = {
    id: crypto.randomUUID(),
    name: data.name || '',
    phone: data.phone || '',
    channel: data.channel || '',
    notes: data.notes || '',
    created_at: new Date().toISOString()
  };
  clients.push(row);
  save(KEYS.clients, clients);
  clientForm.reset();
  renderClients(); renderClientsSelect(); renderDashboard(); renderAnalytics();
});
function renderClients() {
  clientsTable.innerHTML = '';
  clients.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.channel)}</td>
      <td>${escapeHtml(c.notes)}</td>
      <td><button data-del-client="${c.id}">Жою</button></td>`;
    clientsTable.appendChild(tr);
  });
  clientsTable.querySelectorAll('button[data-del-client]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del-client');
      clients = clients.filter(x => x.id !== id);
      save(KEYS.clients, clients);
      renderClients(); renderClientsSelect(); renderDashboard(); renderAnalytics();
    });
  });
}
function renderClientsSelect() {
  const sel = document.getElementById('orderClientSelect');
  sel.innerHTML = `<option value="">Клиентті таңда…</option>`;
  clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name || '(аты жоқ)';
    sel.appendChild(opt);
  });
}

const orderForm = document.getElementById('orderForm');
const ordersTable = document.getElementById('ordersTable');
orderForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(orderForm).entries());
  const row = {
    id: crypto.randomUUID(),
    client_id: data.client_id,
    amount: Number(data.amount || 0),
    status: data.status || 'new',
    created_at: new Date().toISOString()
  };
  orders.push(row);
  save(KEYS.orders, orders);
  orderForm.reset();
  renderOrders(); renderDashboard(); renderAnalytics();
});
function renderOrders() {
  ordersTable.innerHTML = '';
  orders.forEach((o, i) => {
    const client = clients.find(c => c.id === o.client_id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(client?.name || '—')}</td>
      <td>${Number(o.amount).toLocaleString('kk-KZ')}</td>
      <td>
        <select data-status="${o.id}">
          <option value="new"${o.status==='new'?' selected':''}>new</option>
          <option value="paid"${o.status==='paid'?' selected':''}>paid</option>
          <option value="canceled"${o.status==='canceled'?' selected':''}>canceled</option>
        </select>
      </td>
      <td>${new Date(o.created_at).toLocaleString()}</td>
      <td><button data-del-order="${o.id}">Жою</button></td>`;
    ordersTable.appendChild(tr);
  });
  ordersTable.querySelectorAll('select[data-status]').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.getAttribute('data-status');
      const o = orders.find(x => x.id === id);
      if (o) { o.status = sel.value; save(KEYS.orders, orders); renderDashboard(); renderAnalytics(); }
    });
  });
  ordersTable.querySelectorAll('button[data-del-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del-order');
      orders = orders.filter(x => x.id !== id);
      save(KEYS.orders, orders);
      renderOrders(); renderDashboard(); renderAnalytics();
    });
  });
}

let chart;
function renderAnalytics() {
  document.getElementById('kpiClients').textContent = clients.length;
  document.getElementById('kpiOrders').textContent = orders.length;
  document.getElementById('kpiRevenue').textContent = sumRevenue().toLocaleString('kk-KZ');

  const data7 = daysBack(6).map(d => ({
    label: d.toLocaleDateString(),
    count: orders.filter(o => sameDay(new Date(o.created_at), d)).length
  }));

  const ctx = document.getElementById('ordersChart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data7.map(x => x.label),
      datasets: [{ label: 'Orders', data: data7.map(x => x.count) }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  document.getElementById('exportCsv').onclick = () => {
    const csv = toCsv({clients, orders, messages});
    downloadFile('export.csv', csv, 'text/csv');
  };
}
function daysBack(n) {
  const arr = [];
  for (let i=n; i>=0; i--) {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
    arr.push(d);
  }
  return arr;
}
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
function renderChat() {
  chatBox.innerHTML = '';
  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = `msg ${m.who==='me'?'me':'them'}`;
    div.textContent = m.text;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}
chatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(chatForm).entries());
  const text = (data.text || '').trim();
  if (!text) return;
  messages.push({ id: crypto.randomUUID(), who: 'me', text, created_at: new Date().toISOString() });
  save(KEYS.messages, messages);
  chatForm.reset();
  renderChat();
  setTimeout(() => {
    messages.push({ id: crypto.randomUUID(), who: 'them', text: 'Сәлем! Хабыңды алдым ✅', created_at: new Date().toISOString() });
    save(KEYS.messages, messages);
    renderChat();
  }, 500);
});

function toCsv({clients, orders, messages}) {
  const esc = (s) => `"${String(s ?? '').replaceAll('"','""')}"`;
  const lines = [];

  lines.push('=== Clients ===');
  lines.push('id,name,phone,channel,notes,created_at');
  clients.forEach(c => lines.push([c.id,c.name,c.phone,c.channel,c.notes,c.created_at].map(esc).join(',')));

  lines.push('\n=== Orders ===');
  lines.push('id,client_id,amount,status,created_at');
  orders.forEach(o => lines.push([o.id,o.client_id,o.amount,o.status,o.created_at].map(esc).join(',')));

  lines.push('\n=== Messages ===');
  lines.push('id,who,text,created_at');
  messages.forEach(m => lines.push([m.id,m.who,m.text,m.created_at].map(esc).join(',')));

  return lines.join('\n');
}
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

showPage('home');
hydrateSettings();
renderDashboard();
