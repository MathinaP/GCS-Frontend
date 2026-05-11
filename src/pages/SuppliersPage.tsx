import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../lib/api';
import { type Supplier } from '../types';
import SlideOver from '../components/SlideOver';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';

interface FormState {
  name: string;
  contact_person: string;
  address: string;
  mobile: string;
  email: string;
  pan_number: string;
  gstin: string;
  state_name: string;
  state_code: string;
}

const empty = (): FormState => ({
  name: '', contact_person: '', address: '', mobile: '',
  email: '', pan_number: '', gstin: '', state_name: 'Tamil Nadu', state_code: '33',
});

export default function SuppliersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<{ data: Supplier[] }>('/suppliers').then(r => r.data.data),
  });

  const suppliers = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.mobile || '').includes(q) ||
      (s.gstin || '').toLowerCase().includes(q) ||
      (s.contact_person || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const saveMutation = useMutation({
    mutationFn: (payload: FormState) =>
      editing
        ? api.put(`/suppliers/${editing.id}`, payload).then(r => r.data)
        : api.post('/suppliers', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast(editing ? 'Supplier updated.' : 'Supplier added.');
      setSlideOpen(false);
    },
    onError: () => toast('Save failed.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast('Supplier deleted.');
      setDeleteId(null);
    },
    onError: () => toast('Delete failed.', 'error'),
  });

  function openNew() { setEditing(null); setForm(empty()); setSlideOpen(true); }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name, contact_person: s.contact_person || '', address: s.address,
      mobile: s.mobile, email: s.email || '', pan_number: s.pan_number || '',
      gstin: s.gstin || '', state_name: s.state_name || '', state_code: s.state_code || '',
    });
    setSlideOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Suppliers</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, mobile, GSTIN..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Contact Person</th>
              <th className="px-4 py-3 text-left font-medium">Mobile</th>
              <th className="px-4 py-3 text-left font-medium">GSTIN</th>
              <th className="px-4 py-3 text-left font-medium">State</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>}
            {!isLoading && suppliers.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No suppliers found.</td></tr>}
            {suppliers.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.contact_person || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{s.mobile}</td>
                <td className="px-4 py-3 text-gray-600">{s.gstin || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{s.state_name || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(s)} className="text-brand hover:text-brand-dark"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteId(s.id)} className="text-brand hover:text-brand-dark"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(
            [
              { key: 'name', label: 'Name *', required: true, disabled: false },
              { key: 'contact_person', label: 'Contact Person', required: false, disabled: false },
              { key: 'mobile', label: 'Mobile *', required: true, disabled: false },
              { key: 'email', label: 'Email', required: false, disabled: false },
              { key: 'state_name', label: 'State Name', required: false, disabled: true },
              { key: 'state_code', label: 'State Code', required: false, disabled: true },
            ] as { key: keyof FormState; label: string; required: boolean; disabled: boolean }[]
          ).map(({ key, label, required, disabled }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                required={required}
                disabled={disabled}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
            <textarea
              required
              rows={3}
              value={form.address}
              onChange={e => set('address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PAN Number</label>
            <input
              value={form.pan_number}
              onChange={e => set('pan_number', e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
            <input
              value={form.gstin}
              onChange={e => set('gstin', e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand uppercase"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="submit" disabled={saveMutation.isPending} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteId !== null}
        message="Are you sure you want to delete this supplier?"
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
