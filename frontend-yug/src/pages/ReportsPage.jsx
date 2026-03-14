import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import api from '../api/axios';

const COLORS = ['#F5C542', '#4A90D9', '#E74C3C', '#2ECC71', '#9B59B6', '#E67E22', '#1ABC9C', '#34495E'];
const STATUS_COLORS = {
  draft: '#F5C542',
  waiting: '#E67E22',
  ready: '#4A90D9',
  done: '#2ECC71',
  cancelled: '#E74C3C',
};

export default function ReportsPage() {
  /* ── Fetch all data ── */
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data.data),
    staleTime: 30000,
  });

  const { data: stockData = [] } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/stock').then((r) => r.data.data),
    staleTime: 30000,
  });

  const { data: receiptResult } = useQuery({
    queryKey: ['receipts-report'],
    queryFn: () => api.get('/receipts', { params: { limit: 200 } }).then((r) => r.data.data),
    staleTime: 30000,
  });
  const receipts = receiptResult?.data || [];

  const { data: deliveryResult } = useQuery({
    queryKey: ['deliveries-report'],
    queryFn: () => api.get('/deliveries', { params: { limit: 200 } }).then((r) => r.data.data),
    staleTime: 30000,
  });
  const deliveries = deliveryResult?.data || [];

  const { data: productResult } = useQuery({
    queryKey: ['products-report'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data.data),
    staleTime: 30000,
  });
  const products = productResult?.data || [];

  const { data: moveResult } = useQuery({
    queryKey: ['move-history-report'],
    queryFn: () => api.get('/move-history', { params: { limit: 200 } }).then((r) => r.data.data),
    staleTime: 30000,
  });
  const moves = moveResult?.data || [];

  /* ── Derived chart data ── */

  // 1. Receipt status breakdown
  const receiptStatusData = Object.entries(
    receipts.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: STATUS_COLORS[name] || COLORS[0] }));

  // 2. Delivery status breakdown
  const deliveryStatusData = Object.entries(
    deliveries.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: STATUS_COLORS[name] || COLORS[0] }));

  // 3. Top 8 products by stock quantity
  const topStockData = [...stockData]
    .sort((a, b) => b.qty_on_hand - a.qty_on_hand)
    .slice(0, 8)
    .map((s) => ({ name: s.name?.length > 14 ? s.name.slice(0, 14) + '…' : s.name, on_hand: s.qty_on_hand, free: s.free_to_use, reserved: s.qty_reserved || 0 }));

  // 4. Stock value by product (top 8)
  const stockValueData = [...stockData]
    .map((s) => ({ name: s.name?.length > 14 ? s.name.slice(0, 14) + '…' : s.name, value: Number(s.qty_on_hand) * Number(s.cost_per_unit || 0) }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // 5. Moves over time (by month)
  const movesByMonth = {};
  moves.forEach((m) => {
    const date = m.validated_at || m.scheduled_date;
    if (!date) return;
    const month = new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (!movesByMonth[month]) movesByMonth[month] = { month, receipts: 0, deliveries: 0 };
    if (m.move_type === 'receipt') movesByMonth[month].receipts++;
    else if (m.move_type === 'delivery') movesByMonth[month].deliveries++;
  });
  const moveTrendData = Object.values(movesByMonth);

  // 6. Active vs Inactive products
  const activeProducts = products.filter((p) => p.is_active).length;
  const inactiveProducts = products.filter((p) => !p.is_active).length;
  const productStatusData = [
    { name: 'Active', value: activeProducts, fill: '#2ECC71' },
    { name: 'Inactive', value: inactiveProducts, fill: '#E74C3C' },
  ].filter((d) => d.value > 0);

  // 7. Stock by location
  const stockByLocation = {};
  stockData.forEach((s) => {
    const loc = s.location_name || 'Unknown';
    stockByLocation[loc] = (stockByLocation[loc] || 0) + s.qty_on_hand;
  });
  const locationStockData = Object.entries(stockByLocation).map(([name, value]) => ({ name, value }));

  /* ── Summary KPIs ── */
  const totalStockValue = stockData.reduce((sum, s) => sum + Number(s.qty_on_hand) * Number(s.cost_per_unit || 0), 0);
  const totalUnits = stockData.reduce((sum, s) => sum + s.qty_on_hand, 0);
  const totalReserved = stockData.reduce((sum, s) => sum + (s.qty_reserved || 0), 0);

  const hasData = receipts.length > 0 || deliveries.length > 0 || stockData.length > 0 || products.length > 0;

  const renderEmpty = (label) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600 }}>
      No {label} data yet
    </div>
  );

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', boxShadow: '3px 3px 0 #000', fontSize: 13, fontWeight: 600 }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{payload[0].name || payload[0].payload?.name}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || p.fill, marginTop: 4 }}>
            {p.dataKey || 'Value'}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{totalUnits.toLocaleString()}</div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginTop: 6, letterSpacing: 1 }}>Total Units</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>₹{totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginTop: 6, letterSpacing: 1 }}>Stock Value</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{products.length}</div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginTop: 6, letterSpacing: 1 }}>Products</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: totalReserved > 0 ? 'var(--color-danger)' : 'inherit' }}>{totalReserved.toLocaleString()}</div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginTop: 6, letterSpacing: 1 }}>Reserved Units</div>
        </div>
      </div>

      {!hasData ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase' }}>No data to report yet</div>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>Create some receipts, deliveries, and products to see charts here.</p>
        </div>
      ) : (
        <>
          {/* Row 1: Status Pies */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📥 Receipts by Status</h3>
              {receiptStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={receiptStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} strokeWidth={3} stroke="#000">
                      {receiptStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={customTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : renderEmpty('receipt')}
            </div>

            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📤 Deliveries by Status</h3>
              {deliveryStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={deliveryStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} strokeWidth={3} stroke="#000">
                      {deliveryStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={customTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : renderEmpty('delivery')}
            </div>
          </div>

          {/* Row 2: Stock Bar Chart + Stock Value */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📦 Top Products by Stock</h3>
              {topStockData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topStockData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                    <Tooltip content={customTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }} />
                    <Bar dataKey="on_hand" name="On Hand" fill="#F5C542" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="free" name="Free to Use" fill="#2ECC71" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reserved" name="Reserved" fill="#E74C3C" stroke="#000" strokeWidth={2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : renderEmpty('stock')}
            </div>

            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>💰 Stock Value by Product</h3>
              {stockValueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stockValueData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={100} />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} content={customTooltip} />
                    <Bar dataKey="value" name="Value" fill="#4A90D9" stroke="#000" strokeWidth={2} radius={[0, 4, 4, 0]}>
                      {stockValueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : renderEmpty('stock value')}
            </div>
          </div>

          {/* Row 3: Move Trend + Location/Product Pies */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📈 Move Trend</h3>
              {moveTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={moveTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                    <Tooltip content={customTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }} />
                    <Area type="monotone" dataKey="receipts" name="Receipts" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.3} strokeWidth={3} />
                    <Area type="monotone" dataKey="deliveries" name="Deliveries" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.3} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : renderEmpty('move trend')}
            </div>

            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📍 Stock by Location</h3>
              {locationStockData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={locationStockData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} strokeWidth={3} stroke="#000">
                      {locationStockData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={customTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : renderEmpty('location')}
            </div>
          </div>

          {/* Row 4: Product Status Pie */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}>
            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🏷 Product Status</h3>
              {productStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={productStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} strokeWidth={3} stroke="#000">
                      {productStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={customTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : renderEmpty('product')}
            </div>

            {/* Low Stock Table */}
            <div className="card">
              <h3 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>⚠ Low Stock Alert</h3>
              {(dashboard?.low_stock_items || []).length > 0 ? (
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table className="table">
                    <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th></tr></thead>
                    <tbody>
                      {(dashboard?.low_stock_items || []).map((item, i) => (
                        <tr key={i}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--color-secondary)', fontSize: 14, fontWeight: 700 }}>
                  ✓ All stock levels healthy
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
