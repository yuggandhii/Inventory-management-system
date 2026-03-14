import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api from '../api/axios';

const PIE_COLORS = ['#F5C542', '#4A90D9', '#2ECC71', '#E74C3C', '#9B59B6', '#E67E22', '#1ABC9C', '#34495E'];

const brutalistTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-surface)', border: '3px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', boxShadow: '4px 4px 0 #000', fontSize: 13, fontWeight: 700 }}>
      <div style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{payload[0].payload?.name}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, fontSize: 12 }}>
          {p.dataKey}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();

  /* ── Row 1 data: Dashboard summary ── */
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data.data),
    refetchInterval: 30000,
    staleTime: 30000,
  });
  const d = data || {};

  /* ── Row 2 data: Stock (for product count + charts) ── */
  const { data: stockData = [], isLoading: stockLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/stock').then((r) => r.data.data),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  /* ── Row 2 data: Transfers (for pending count) ── */
  const { data: transferResult } = useQuery({
    queryKey: ['transfers-dash'],
    queryFn: () => api.get('/transfers', { params: { limit: 200 } }).then((r) => r.data.data),
    refetchInterval: 30000,
    staleTime: 30000,
  });
  const transfers = transferResult?.data || [];
  const pendingTransfers = transfers.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;

  /* ── Row 5 data: Recent moves ── */
  const { data: moveResult, isLoading: movesLoading } = useQuery({
    queryKey: ['move-history-dash'],
    queryFn: () => api.get('/move-history', { params: { limit: 5 } }).then((r) => r.data.data),
    refetchInterval: 30000,
    staleTime: 30000,
  });
  const recentMoves = moveResult?.data || [];

  /* ── Derived chart data ── */
  const distinctProducts = new Set(stockData.map((s) => s.product_id || s.name)).size;

  // Aggregate stock by product name for charts
  const stockByProduct = {};
  stockData.forEach((s) => {
    const name = s.name || 'Unknown';
    if (!stockByProduct[name]) stockByProduct[name] = { name, qty_on_hand: 0, value: 0 };
    stockByProduct[name].qty_on_hand += Number(s.qty_on_hand);
    stockByProduct[name].value += Number(s.qty_on_hand) * Number(s.cost_per_unit || 0);
  });
  const pieData = Object.values(stockByProduct).sort((a, b) => b.qty_on_hand - a.qty_on_hand).slice(0, 8);
  const barData = Object.values(stockByProduct).filter((s) => s.value > 0).sort((a, b) => b.value - a.value).slice(0, 8).map((s) => ({
    ...s,
    name: s.name.length > 16 ? s.name.slice(0, 16) + '…' : s.name,
  }));

  /* ── Stat card helper ── */
  const StatCard = ({ icon, value, label, color, onClick }) => (
    <div
      className="card"
      style={{ textAlign: 'center', padding: '20px 16px', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s' }}
      onClick={onClick}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: color || 'inherit' }}>
        {value ?? <span className="skeleton" style={{ display: 'inline-block', width: 40, height: 28 }} />}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginTop: 6, letterSpacing: 1 }}>{label}</div>
    </div>
  );

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* ═══════════════════ ROW 1 — Receipts & Deliveries (UNTOUCHED) ═══════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Receipts Card */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ background: 'var(--color-primary)', padding: '16px 24px', borderBottom: '3px solid var(--color-border)' }}>
            <h2 style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 }}>📥 Receipts</h2>
          </div>
          <div style={{ padding: 24 }}>
            {isLoading ? (
              <div className="skeleton" style={{ height: 100 }} />
            ) : (
              <>
                <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{d.pending_receipts ?? 0}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase' }}>Pending</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(d.late_receipts ?? 0) > 0 && <span className="sticker sticker-danger">{d.late_receipts} Late</span>}
                </div>
                <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={() => navigate('/receipts')}>
                  {d.pending_receipts ?? 0} To Receive →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Deliveries Card */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ background: 'var(--color-info)', padding: '16px 24px', borderBottom: '3px solid var(--color-border)' }}>
            <h2 style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>📤 Deliveries</h2>
          </div>
          <div style={{ padding: 24 }}>
            {isLoading ? (
              <div className="skeleton" style={{ height: 100 }} />
            ) : (
              <>
                <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{d.pending_deliveries ?? 0}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase' }}>Pending</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(d.late_deliveries ?? 0) > 0 && <span className="sticker sticker-danger">{d.late_deliveries} Late</span>}
                  {(d.waiting_deliveries ?? 0) > 0 && <span className="sticker sticker-warning">{d.waiting_deliveries} Waiting</span>}
                </div>
                <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={() => navigate('/deliveries')}>
                  {d.pending_deliveries ?? 0} To Deliver →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ ROW 2 — Stats Bar ═══════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 24 }}>
        <StatCard icon="📦" value={stockLoading ? undefined : distinctProducts} label="Total Products" onClick={() => navigate('/stock')} />
        <StatCard icon="⚠️" value={isLoading ? undefined : (d.low_stock_count ?? 0)} label="Low Stock Alerts" color={(d.low_stock_count ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-secondary)'} />
        <StatCard icon="⏳" value={isLoading ? undefined : (d.waiting_deliveries ?? 0)} label="Waiting Deliveries" color={(d.waiting_deliveries ?? 0) > 0 ? 'var(--color-warning)' : 'inherit'} onClick={() => navigate('/deliveries')} />
        <StatCard icon="🔄" value={pendingTransfers} label="Pending Transfers" color={pendingTransfers > 0 ? '#9B59B6' : 'inherit'} />
      </div>

      {/* ═══════════════════ ROW 3 — Charts ═══════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, marginTop: 24 }}>
        {/* LEFT — Stock by Product Pie */}
        <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s' }} onClick={() => navigate('/reports')}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📊 Stock by Product</h3>
          {stockLoading ? (
            <div className="skeleton" style={{ height: 240 }} />
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="qty_on_hand" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} strokeWidth={3} stroke="#000">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={brutalistTooltip} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600 }}>No stock data yet</div>
          )}
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 }}>Click for detailed report →</div>
        </div>

        {/* RIGHT — Stock Value Bar */}
        <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s' }} onClick={() => navigate('/reports')}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>💰 Stock Value by Product</h3>
          {stockLoading ? (
            <div className="skeleton" style={{ height: 240 }} />
          ) : barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} angle={-20} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={brutalistTooltip} formatter={(v) => `₹${v.toLocaleString()}`} />
                <Bar dataKey="value" name="Value (₹)" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600 }}>No stock value data</div>
          )}
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 }}>Click for detailed report →</div>
        </div>
      </div>

      {/* ═══════════════════ ROW 4 — Low Stock Alerts ═══════════════════ */}
      <div className="card" style={{ marginTop: 24, overflow: 'hidden', padding: 0 }}>
        <div style={{ background: (d.low_stock_count ?? 0) > 0 ? '#FEF3C7' : '#DCFCE7', padding: '12px 24px', borderBottom: '3px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{(d.low_stock_count ?? 0) > 0 ? '⚠️' : '✅'}</span>
          <h2 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: (d.low_stock_count ?? 0) > 0 ? '#92400E' : '#166534' }}>
            Low Stock Alerts {(d.low_stock_count ?? 0) > 0 ? `(${d.low_stock_count})` : ''}
          </h2>
        </div>
        <div style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: 24 }}><div className="skeleton" style={{ height: 80 }} /></div>
          ) : (d.low_stock_items || []).length > 0 ? (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>On Hand</th></tr></thead>
                <tbody>
                  {(d.low_stock_items || []).map((item, i) => (
                    <tr key={i} style={{ background: '#FFFBEB' }}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.sku}</td>
                      <td>{item.location_name}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{item.qty_on_hand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: '#166534', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
              ✅ No low stock alerts — all levels healthy
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ ROW 5 — Recent Move History ═══════════════════ */}
      <div className="card" style={{ marginTop: 24, overflow: 'hidden', padding: 0 }}>
        <div style={{ background: 'var(--color-surface)', padding: '12px 24px', borderBottom: '3px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Recent Movements
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/move-history')}>View All →</button>
        </div>
        <div style={{ padding: 0 }}>
          {movesLoading ? (
            <div style={{ padding: 24 }}>{[1,2,3].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
          ) : recentMoves.length > 0 ? (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead><tr><th>Reference</th><th>Type</th><th>Product</th><th>From → To</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {recentMoves.map((m, i) => (
                    <tr key={`${m.id}-${i}`}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{m.reference}</td>
                      <td>
                        <span className={`sticker ${m.move_type === 'receipt' ? 'sticker-success' : m.move_type === 'delivery' ? 'sticker-info' : 'sticker-warning'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                          {m.move_type === 'receipt' ? '📥 IN' : m.move_type === 'delivery' ? '📤 OUT' : '🔄 INT'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{m.product_name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{m.from_location || '—'} → {m.to_location || '—'}</td>
                      <td style={{ fontSize: 12 }}>{m.validated_at ? new Date(m.validated_at).toLocaleDateString() : m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString() : '—'}</td>
                      <td><span className={`badge badge-${(m.status || 'draft').toLowerCase()}`} style={{ fontSize: 10 }}>{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, textTransform: 'uppercase' }}>
              No movements yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
