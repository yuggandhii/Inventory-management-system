import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import toast from 'react-hot-toast';

const createSchema = z.object({
  name: z.string().min(1, 'Required'),
  sku: z.string().min(1, 'Required'),
  category_id: z.string().optional().nullable(),
  unit_of_measure: z.string().optional(),
  cost_per_unit: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Required'),
  sku: z.string().min(1, 'Required'),
  category_id: z.string().optional().nullable(),
  unit_of_measure: z.string().optional(),
  cost_per_unit: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | product object

  const { data: result, isLoading } = useQuery({
    queryKey: ['products', { search, catFilter }],
    queryFn: () => api.get('/products', { params: { search: search || undefined, category_id: catFilter || undefined } }).then((r) => r.data.data),
    staleTime: 30000,
  });

  const products = result?.data || [];

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => api.get('/products/categories').then((r) => r.data.data),
    staleTime: 60000,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(createSchema),
  });

  const openNew = () => {
    setModal('new');
    reset({ name: '', sku: '', category_id: '', unit_of_measure: '', cost_per_unit: 0, notes: '' });
  };
  const openEdit = (p) => {
    setModal(p);
    reset({
      name: p.name,
      sku: p.sku,
      category_id: p.category_id || '',
      unit_of_measure: p.unit_of_measure || '',
      cost_per_unit: p.cost_per_unit || 0,
      notes: p.notes || '',
    });
  };

  const saveMut = useMutation({
    mutationFn: (values) => {
      const payload = { ...values };
      if (!payload.category_id) delete payload.category_id;
      if (modal === 'new') return api.post('/products', payload);
      return api.put(`/products/${modal.id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(modal === 'new' ? 'Product created' : 'Product updated');
      setModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => api.patch(`/products/${id}/toggle-active`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="page page-enter">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <button className="btn btn-primary" onClick={openNew}>New Product +</button>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select className="select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div>{[1,2,3].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Unit</th><th>Cost</th><th>Active</th></tr></thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">🏷</div><div className="empty-state-text">No products found</div></div></td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => openEdit(p)}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.sku}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.category_name || '—'}</td>
                  <td>{p.unit_of_measure || '—'}</td>
                  <td>₹{Number(p.cost_per_unit || 0).toFixed(2)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={`toggle${p.is_active ? ' active' : ''}`} onClick={() => toggleMut.mutate(p.id)}>
                      <div className="toggle-knob" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modal === 'new' ? 'New Product' : 'Edit Product'}</div>
            <form onSubmit={handleSubmit((v) => saveMut.mutate(v))}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="input-group">
                  <label className="input-label">Name</label>
                  <input className={`input${errors.name ? ' input-error' : ''}`} {...register('name')} />
                  {errors.name && <span className="input-hint input-hint-error">{errors.name.message}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label">SKU</label>
                  <input className={`input${errors.sku ? ' input-error' : ''}`} {...register('sku')} />
                  {errors.sku && <span className="input-hint input-hint-error">{errors.sku.message}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select className="select" {...register('category_id')}>
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Unit of Measure</label>
                  <input className="input" {...register('unit_of_measure')} placeholder="e.g. pcs, kg" />
                </div>
                <div className="input-group">
                  <label className="input-label">Cost Per Unit</label>
                  <input className="input" type="number" step="0.01" {...register('cost_per_unit')} />
                </div>
                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <textarea className="input" rows={3} {...register('notes')} placeholder="Optional notes..." />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || saveMut.isPending}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
