import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function DeliveryCreatePage() {
  const navigate = useNavigate();
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [contactName, setContactName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ product_id: '', qty_demand: '' }]);
  const [error, setError] = useState('');

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/warehouses/locations').then((r) => r.data.data),
  });

  const { data: productResult } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data.data),
  });
  const products = productResult?.data || [];

  const createMut = useMutation({
    mutationFn: (body) => api.post('/deliveries', body),
    onSuccess: (res) => {
      toast.success('Delivery created');
      navigate(`/deliveries/${res.data.data.id}`);
    },
    onError: (err) => setError(err.response?.data?.error || 'Failed to create delivery'),
  });

  const addLine = () => setLines([...lines, { product_id: '', qty_demand: '' }]);
  const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    setLines(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const validLines = lines.filter((l) => l.product_id && Number(l.qty_demand) > 0).map((l) => ({
      product_id: l.product_id,
      qty_demand: Number(l.qty_demand),
    }));
    if (!fromLocationId || !toLocationId || !contactName || validLines.length === 0) {
      setError('Please fill all required fields and add at least one product');
      return;
    }
    createMut.mutate({
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      contact_name: contactName,
      scheduled_date: scheduledDate || null,
      notes: notes || null,
      lines: validLines,
    });
  };

  return (
    <div className="page page-enter" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/deliveries')}>← Back</button>
          <h1 className="page-title">New Delivery</h1>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">From Location *</label>
              <select className="select" value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)}>
                <option value="">Select...</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.short_code})</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">To Location *</label>
              <select className="select" value={toLocationId} onChange={(e) => setToLocationId(e.target.value)}>
                <option value="">Select...</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.short_code})</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Contact Name *</label>
              <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="input-group">
              <label className="input-label">Schedule Date</label>
              <input className="input" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
          </div>
          <div className="input-group" style={{ marginTop: 16 }}>
            <label className="input-label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
        </div>

        {/* Product Lines */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 14, letterSpacing: 1 }}>Products *</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>+ Add</button>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: 12, marginBottom: 8, alignItems: 'end' }}>
              <div className="input-group">
                {idx === 0 && <label className="input-label">Product</label>}
                <select className="select" value={line.product_id} onChange={(e) => updateLine(idx, 'product_id', e.target.value)}>
                  <option value="">Select product...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="input-group">
                {idx === 0 && <label className="input-label">Qty</label>}
                <input className="input" type="number" min="1" value={line.qty_demand} onChange={(e) => updateLine(idx, 'qty_demand', e.target.value)} placeholder="0" />
              </div>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLine(idx)} disabled={lines.length === 1} style={{ height: 42 }}>✕</button>
            </div>
          ))}
        </div>

        <button type="submit" className="btn btn-primary" disabled={createMut.isPending} style={{ width: '100%' }}>
          {createMut.isPending ? 'Creating...' : 'Create Delivery →'}
        </button>
      </form>
    </div>
  );
}
