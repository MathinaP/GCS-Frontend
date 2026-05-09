import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../lib/api';
import { type Material } from '../types';
import SlideOver from '../components/SlideOver';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';

const UNITS = ['Nos', 'Kg', 'Ltr', 'Box', 'Set', 'Pair', 'Meter', 'Sq.Ft', 'Hours', 'MT', 'Bag'];
const GST_RATES = [0, 5, 12, 18, 28];

interface FormState {
  material_name: string;
  unit_of_measurement: string;
  hsn_code: string;
  default_rate: string;
  gst_rate: string;
  is_active: boolean;
}

const empty = (): FormState => ({
  material_name: '',
  unit_of_measurement: 'Nos',
  hsn_code: '',
  default_rate: '0.00',
  gst_rate: '18',
  is_active: true,
});

export default function MaterialsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get<{ data: Material[] }>('/materials').then(r => r.data.data),
  });

  const materials = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter(m =>
      m.material_name.toLowerCase().includes(q) ||
      (m.hsn_code || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const saveMutation = useMutation({
    mutationFn: (payload: Omit<FormState, 'default_rate' | 'gst_rate'> & { default_rate: number; gst_rate: number }) =>
      editing
        ? api.put(`/materials/${editing.id}`, payload).then(r => r.data)
        : api.post('/materials', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      toast(editing ? 'Material updated.' : 'Material added.');
      setSlideOpen(false);
    },
    onError: () => toast('Save failed.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/materials/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      toast('Material deleted.');
      setDeleteId(null);
    },
    onError: () => toast('Delete failed.', 'error'),
  });

  function openNew() {
    setEditing(null);
    setForm(empty());
    setSlideOpen(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    setForm({
      material_name: m.material_name,
      unit_of_measurement: m.unit_of_measurement,
      hsn_code: m.hsn_code || '',
      default_rate: String(m.default_rate),
      gst_rate: String(m.gst_rate),
      is_active: m.is_active,
    });
    setSlideOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      default_rate: parseFloat(form.default_rate) || 0,
      gst_rate: parseFloat(form.gst_rate) || 0,
    });
  }

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Materials</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark"
        >
          <Plus size={16} /> Add Material
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or HSN..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Material Name</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-left font-medium">HSN Code</th>
              <th className="px-4 py-3 text-right font-medium">Rate (₹)</th>
              <th className="px-4 py-3 text-right font-medium">GST %</th>
              <th className="px-4 py-3 text-center font-medium">Active</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            )}
            {!isLoading && materials.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No materials found.</td></tr>
            )}
            {materials.map((m, i) => (
              <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-medium text-gray-800">{m.material_name}</td>
                <td className="px-4 py-3 text-gray-600">{m.unit_of_measurement}</td>
                <td className="px-4 py-3 text-gray-600">{m.hsn_code || '—'}</td>
                <td className="px-4 py-3 text-right text-gray-800">
                  {Number(m.default_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right text-gray-800">{m.gst_rate}%</td>
                <td className="px-4 py-3 text-center">
                  {m.is_active
                    ? <ToggleRight className="text-green-500 mx-auto" size={20} />
                    : <ToggleLeft className="text-gray-400 mx-auto" size={20} />
                  }
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(m)} className="text-brand hover:text-brand-dark">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setDeleteId(m.id)} className="text-brand hover:text-brand-dark">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SlideOver form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editing ? 'Edit Material' : 'Add Material'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Material Name *</label>
            <input
              required
              value={form.material_name}
              onChange={e => set('material_name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit of Measurement *</label>
            <select
              required
              value={form.unit_of_measurement}
              onChange={e => set('unit_of_measurement', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">HSN Code</label>
            <input
              value={form.hsn_code}
              onChange={e => set('hsn_code', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Rate (₹) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.default_rate}
              onChange={e => set('default_rate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate (%) *</label>
            <select
              required
              value={form.gst_rate}
              onChange={e => set('gst_rate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Active</label>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'} relative`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setSlideOpen(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </SlideOver>

      {/* Confirm delete */}
      <ConfirmDialog
        open={deleteId !== null}
        message="Are you sure you want to delete this material?"
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
