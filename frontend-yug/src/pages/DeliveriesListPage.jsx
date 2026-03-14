import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const statusOptions = ['all', 'draft', 'waiting', 'ready', 'done', 'cancelled'];

export default function DeliveriesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('list');

  const { data: result, isLoading } = useQuery({
    queryKey: ['deliveries', { search, status }],
    queryFn: () => api.get('/deliveries', { params: { search: search || undefined, status: status !== 'all' ? status : undefined } }).then((r) => r.data.data),
    staleTime: 30000,
  });

  const deliveries = result?.data || [];

  const badgeClass = (s) => `badge badge-${s?.toLowerCase() || 'draft'}`;
  const kanbanCols = ['draft', 'waiting', 'ready', 'done', 'cancelled'];

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Deliveries</h1>
        <button className="btn btn-primary" onClick={() => navigate('/deliveries/new')}>New +</button>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search by reference or contact..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
          {statusOptions.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className={`btn-icon${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>☰</button>
          <button className={`btn-icon${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>▦</button>
        </div>
      </div>

      {isLoading ? (
        <div>{[1,2,3].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
      ) : view === 'list' ? (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Reference</th><th>From</th><th>To</th><th>Contact</th><th>Schedule Date</th><th>Status</th></tr></thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📤</div><div className="empty-state-text">No deliveries found</div></div></td></tr>
              ) : deliveries.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => navigate(`/deliveries/${d.id}`)}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.reference}</td>
                  <td>{d.from_location_name || '—'}</td>
                  <td>{d.to_location_name || '—'}</td>
                  <td>{d.contact_name || '—'}</td>
                  <td>{d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td><span className={badgeClass(d.status)}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {kanbanCols.map((col) => (
            <div key={col}>
              <div style={{ marginBottom: 12, textAlign: 'center' }}>
                <span className={badgeClass(col)} style={{ fontSize: 13, padding: '6px 16px' }}>{col}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deliveries.filter((d) => (d.status || '').toLowerCase() === col).map((d) => (
                  <div key={d.id} className="card card-hoverable" style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(`/deliveries/${d.id}`)}>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, marginBottom: 4 }}>{d.reference}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{d.contact_name || 'No contact'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
