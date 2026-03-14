import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  short_code: z.string().min(1, 'Short code is required').max(10),
  address: z.string().optional(),
});

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  short_code: z.string().min(1, 'Short code is required').max(20),
  warehouse_id: z.string().min(1, 'Select a warehouse'),
  type: z.enum(['internal', 'vendor', 'customer']).default('internal'),
});

export default function SettingsPage() {
  const qc = useQueryClient();

  /* ── Warehouses ── */
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data.data),
    staleTime: 30000,
  });

  const whForm = useForm({ resolver: zodResolver(warehouseSchema), defaultValues: { name: '', short_code: '', address: '' } });

  const createWhMut = useMutation({
    mutationFn: (values) => api.post('/warehouses', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created');
      whForm.reset();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  /* ── Locations ── */
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/warehouses/locations').then((r) => r.data.data),
    staleTime: 30000,
  });

  const locForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', short_code: '', warehouse_id: '', type: 'internal' },
  });

  const createLocMut = useMutation({
    mutationFn: (values) => api.post('/warehouses/locations', values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location created');
      locForm.reset();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="page page-enter" style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* ── WAREHOUSE SECTION ── */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h2 style={{ fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 }}>🏭 Warehouses</h2>

        <form onSubmit={whForm.handleSubmit((v) => createWhMut.mutate(v))}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="input-group">
              <label className="input-label">Name</label>
              <input className={`input${whForm.formState.errors.name ? ' input-error' : ''}`} placeholder="Main Warehouse" {...whForm.register('name')} />
              {whForm.formState.errors.name && <span className="input-hint input-hint-error">{whForm.formState.errors.name.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Short Code</label>
              <input className={`input${whForm.formState.errors.short_code ? ' input-error' : ''}`} placeholder="WH01" {...whForm.register('short_code')} />
              {whForm.formState.errors.short_code && <span className="input-hint input-hint-error">{whForm.formState.errors.short_code.message}</span>}
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Address</label>
            <textarea className="input" rows={2} placeholder="123 Warehouse Street..." {...whForm.register('address')} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={createWhMut.isPending}>
            {createWhMut.isPending ? 'Saving...' : 'Save Warehouse'}
          </button>
        </form>

        {/* List of warehouses */}
        {warehouses.length > 0 && (
          <div className="table-wrapper" style={{ marginTop: 24 }}>
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Short Code</th><th>Address</th></tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{w.short_code}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{w.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── LOCATION SECTION ── */}
      <div className="card">
        <h2 style={{ fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 }}>📍 Locations</h2>

        <form onSubmit={locForm.handleSubmit((v) => createLocMut.mutate(v))}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="input-group">
              <label className="input-label">Name</label>
              <input className={`input${locForm.formState.errors.name ? ' input-error' : ''}`} placeholder="Shelf A1" {...locForm.register('name')} />
              {locForm.formState.errors.name && <span className="input-hint input-hint-error">{locForm.formState.errors.name.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Short Code</label>
              <input className={`input${locForm.formState.errors.short_code ? ' input-error' : ''}`} placeholder="A1" {...locForm.register('short_code')} />
              {locForm.formState.errors.short_code && <span className="input-hint input-hint-error">{locForm.formState.errors.short_code.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Warehouse</label>
              <select className={`select${locForm.formState.errors.warehouse_id ? ' input-error' : ''}`} {...locForm.register('warehouse_id')}>
                <option value="">Select warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.short_code})</option>
                ))}
              </select>
              {locForm.formState.errors.warehouse_id && <span className="input-hint input-hint-error">{locForm.formState.errors.warehouse_id.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Type</label>
              <select className="select" {...locForm.register('type')}>
                <option value="internal">Internal</option>
                <option value="vendor">Vendor</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={createLocMut.isPending}>
            {createLocMut.isPending ? 'Saving...' : 'Save Location'}
          </button>
        </form>

        {/* List of locations */}
        {locations.length > 0 && (
          <div className="table-wrapper" style={{ marginTop: 24 }}>
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Short Code</th><th>Type</th><th>Warehouse</th></tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.name}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{l.short_code}</td>
                    <td><span className={`badge badge-${l.type || 'draft'}`}>{l.type || 'internal'}</span></td>
                    <td>{warehouses.find(w => w.id === l.warehouse_id)?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
