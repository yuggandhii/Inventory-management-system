import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data.data),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const d = data || {};

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

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

      {/* Low Stock Alert */}
      {d.low_stock_count > 0 && (
        <div className="card" style={{ marginTop: 24, overflow: 'hidden', padding: 0 }}>
          <div style={{ background: 'var(--color-danger)', padding: '12px 24px', borderBottom: '3px solid var(--color-border)' }}>
            <h2 style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>⚠ Low Stock Items ({d.low_stock_count})</h2>
          </div>
          <div style={{ padding: 0 }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>On Hand</th></tr></thead>
                <tbody>
                  {(d.low_stock_items || []).map((item, i) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
