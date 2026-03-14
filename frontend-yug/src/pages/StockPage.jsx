import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function StockPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [qtyCounted, setQtyCounted] = useState('');
  const [reason, setReason] = useState('');

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['stock', search],
    queryFn: () => api.get('/stock', { params: { search: search || undefined } }).then((r) => r.data.data),
    staleTime: 30000,
  });

  const adjustMut = useMutation({
    mutationFn: (body) => api.post('/adjustments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Stock adjusted');
      setModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const openModal = (item) => {
    setModal(item);
    setQtyCounted(item.qty_on_hand?.toString() || '0');
    setReason('');
  };

  const handleAdjust = (e) => {
    e.preventDefault();
    adjustMut.mutate({
      product_id: modal.product_id,
      location_id: modal.location_id,
      qty_counted: Number(qtyCounted),
      reason: reason || undefined,
    });
  };

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Stock</h1>
        <input className="input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
      </div>

      {isLoading ? (
        <div>{[1,2,3,4].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Location</th><th>Cost/Unit</th><th>On Hand</th><th>Free to Use</th><th>Reserved</th></tr>
            </thead>
            <tbody>
              {stock.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-text">No stock data</div></div></td></tr>
              ) : stock.map((s, i) => (
                <tr key={`${s.product_id}-${s.location_id}-${i}`} className="clickable" onClick={() => openModal(s)}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{s.sku}</td>
                  <td>{s.location_name}</td>
                  <td>₹{Number(s.cost_per_unit || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 700 }}>{s.qty_on_hand}</td>
                  <td style={{ fontWeight: 700, color: s.free_to_use < s.qty_on_hand ? 'var(--color-warning)' : 'inherit' }}>
                    {s.free_to_use}
                  </td>
                  <td style={{ color: s.qty_reserved > 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                    {s.qty_reserved}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjustment Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Adjust Stock</div>
            <form onSubmit={handleAdjust}>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Product</label>
                <input className="input input-readonly" value={modal.name} readOnly />
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Location</label>
                <input className="input input-readonly" value={modal.location_name} readOnly />
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Current On Hand</label>
                <input className="input input-readonly" value={modal.qty_on_hand} readOnly />
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Counted Quantity</label>
                <input className="input" type="number" value={qtyCounted} onChange={(e) => setQtyCounted(e.target.value)} min="0" />
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Reason</label>
                <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for adjustment..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adjustMut.isPending}>
                  {adjustMut.isPending ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
