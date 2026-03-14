import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export default function MoveHistoryPage() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: result, isLoading } = useQuery({
    queryKey: ['move-history', { search, dateFrom, dateTo }],
    queryFn: () => api.get('/move-history', {
      params: {
        search: search || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined,
      },
    }).then((r) => r.data.data),
    staleTime: 30000,
  });

  const moves = result?.data || [];

  const badgeClass = (s) => `badge badge-${(s || 'draft').toLowerCase()}`;

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Move History</h1>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search by reference..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 170 }} />
          <span style={{ fontWeight: 700 }}>–</span>
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 170 }} />
        </div>
      </div>

      {isLoading ? (
        <div>{[1,2,3,4].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Reference</th><th>Type</th><th>Product</th><th>SKU</th><th>From</th><th>To</th><th>Demand</th><th>Done</th><th>Contact</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {moves.length === 0 ? (
                <tr><td colSpan={11}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No move history</div></div></td></tr>
              ) : moves.map((m, i) => (
                <tr key={`${m.id}-${i}`} className={m.move_type === 'receipt' ? 'row-receipt' : m.move_type === 'delivery' ? 'row-delivery' : ''}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{m.reference}</td>
                  <td>
                    <span className={`sticker ${m.move_type === 'receipt' ? 'sticker-success' : 'sticker-info'}`}>
                      {m.move_type === 'receipt' ? '📥 IN' : '📤 OUT'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{m.sku}</td>
                  <td>{m.from_location || '—'}</td>
                  <td>{m.to_location || '—'}</td>
                  <td>{m.qty_demand}</td>
                  <td style={{ fontWeight: 700 }}>{m.qty_done}</td>
                  <td>{m.contact_name || '—'}</td>
                  <td>{m.validated_at ? new Date(m.validated_at).toLocaleDateString() : m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td><span className={badgeClass(m.status)}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
