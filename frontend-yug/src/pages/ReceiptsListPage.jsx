import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const statusOptions = ['all', 'draft', 'ready', 'done', 'cancelled'];

export default function ReceiptsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('list');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ['receipts', { search, status }],
    queryFn: () => api.get('/receipts', { params: { search: search || undefined, status: status !== 'all' ? status : undefined } }).then((r) => r.data.data),
    staleTime: 30000,
  });

  const receipts = result?.data || [];

  const badgeClass = (s) => `badge badge-${s?.toLowerCase() || 'draft'}`;
  const kanbanCols = ['draft', 'ready', 'done', 'cancelled'];

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Receipts</h1>
        <button className="btn btn-primary" onClick={() => navigate('/receipts/new')}>New +</button>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search by reference or contact..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
          {statusOptions.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className={`btn-icon${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List view">☰</button>
          <button className={`btn-icon${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')} title="Kanban view">▦</button>
        </div>
      </div>

      {isLoading ? (
        <div>{[1,2,3].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
      ) : view === 'list' ? (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Reference</th><th>From</th><th>To</th><th>Contact</th><th>Schedule Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📥</div><div className="empty-state-text">No receipts found</div></div></td></tr>
              ) : receipts.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => navigate(`/receipts/${r.id}`)}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.reference}</td>
                  <td>{r.from_location_name || '—'}</td>
                  <td>{r.to_location_name || '—'}</td>
                  <td>{r.contact_name || '—'}</td>
                  <td>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td><span className={badgeClass(r.status)}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kanbanCols.map((col) => (
            <div key={col}>
              <div style={{ marginBottom: 12, textAlign: 'center' }}>
                <span className={badgeClass(col)} style={{ fontSize: 13, padding: '6px 16px' }}>{col}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {receipts.filter((r) => (r.status || '').toLowerCase() === col).map((r) => (
                  <div key={r.id} className="card card-hoverable" style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(`/receipts/${r.id}`)}>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, marginBottom: 4 }}>{r.reference}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.contact_name || 'No contact'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : ''}</div>
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
