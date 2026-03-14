import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const statuses = ['draft', 'waiting', 'ready', 'done'];

export default function DeliveryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: delivery, isLoading } = useQuery({
    queryKey: ['delivery', id],
    queryFn: () => api.get(`/deliveries/${id}`).then((r) => r.data.data),
    staleTime: 30000,
  });

  const todoMut = useMutation({
    mutationFn: () => api.post(`/deliveries/${id}/todo`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery', id] }); qc.invalidateQueries({ queryKey: ['deliveries'] }); toast.success('Moved forward'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const validateMut = useMutation({
    mutationFn: () => api.post(`/deliveries/${id}/validate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery', id] }); qc.invalidateQueries({ queryKey: ['deliveries'] }); toast.success('Delivery validated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const cancelMut = useMutation({
    mutationFn: () => api.post(`/deliveries/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivery', id] }); qc.invalidateQueries({ queryKey: ['deliveries'] }); toast.success('Delivery cancelled'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <div className="page"><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!delivery) return <div className="page"><div className="empty-state"><div className="empty-state-text">Delivery not found</div></div></div>;

  const currentStatus = (delivery.status || 'draft').toLowerCase();
  const statusIdx = statuses.indexOf(currentStatus);

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/deliveries')}>← Back</button>
          <h1 className="page-title" style={{ fontSize: 22, fontFamily: 'monospace' }}>{delivery.reference}</h1>
          <span className={`badge badge-${currentStatus}`}>{currentStatus}</span>
        </div>
      </div>

      {/* Status Flow */}
      <div className="status-flow">
        {statuses.map((s, i) => (
          <div key={s} className={`status-flow-step${i < statusIdx ? ' completed' : ''}${i === statusIdx ? ' active' : ''}`}>
            {i < statusIdx ? '✓ ' : ''}{s}
          </div>
        ))}
      </div>

      {/* Actions */}
      {currentStatus !== 'done' && currentStatus !== 'cancelled' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {(currentStatus === 'draft' || currentStatus === 'waiting') && (
            <button className="btn btn-primary" onClick={() => todoMut.mutate()} disabled={todoMut.isPending}>TODO →</button>
          )}
          {currentStatus === 'ready' && (
            <button className="btn btn-success" onClick={() => validateMut.mutate()} disabled={validateMut.isPending}>Validate ✓</button>
          )}
          <button className="btn btn-secondary" onClick={() => window.print()}>Print 🖨</button>
          <button className="btn btn-danger" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>Cancel ✕</button>
        </div>
      )}

      {/* Details Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">From</label>
            <input className="input input-readonly" value={delivery.from_location_name || ''} readOnly />
          </div>
          <div className="input-group">
            <label className="input-label">Deliver To</label>
            <input className="input input-readonly" value={delivery.to_location_name || ''} readOnly />
          </div>
          <div className="input-group">
            <label className="input-label">Contact</label>
            <input className="input input-readonly" value={delivery.contact_name || ''} readOnly />
          </div>
          <div className="input-group">
            <label className="input-label">Schedule Date</label>
            <input className="input input-readonly" value={delivery.scheduled_date ? new Date(delivery.scheduled_date).toLocaleDateString() : ''} readOnly />
          </div>
          <div className="input-group">
            <label className="input-label">Responsible</label>
            <input className="input input-readonly" value={user?.login_id || ''} readOnly />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <h3 style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 14, letterSpacing: 1, marginBottom: 16 }}>Products</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Product</th><th>SKU</th><th>Demand</th><th>Done</th><th>On Hand</th></tr></thead>
            <tbody>
              {(delivery.lines || []).length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 24 }}>No products added</td></tr>
              ) : (delivery.lines || []).map((l, i) => {
                const insufficient = Number(l.qty_on_hand) < Number(l.qty_demand);
                return (
                  <tr key={l.id || i} className={insufficient ? 'row-danger' : ''} title={insufficient ? 'Insufficient stock' : ''}>
                    <td style={{ fontWeight: 600 }}>{l.product_name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{l.sku}</td>
                    <td>{l.qty_demand}</td>
                    <td style={{ fontWeight: 700 }}>{l.qty_done}</td>
                    <td style={{ fontWeight: 700, color: insufficient ? 'var(--color-danger)' : 'inherit' }}>{l.qty_on_hand}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
