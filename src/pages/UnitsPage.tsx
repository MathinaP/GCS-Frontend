import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../lib/api';
import { type Unit } from '../types';
import SlideOver from '../components/SlideOver';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';

interface FormState {
  name: string;
  is_active: boolean;
}

const empty = (): FormState => ({ name: '', is_active: true });

export default function UnitsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.get<{ data: Unit[] }>('/units').then(r => r.data.data),
  });

  const units = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter(u => u.name.toLowerCase().includes(q));
  }, [data, search]);

  const saveMutation = useMutation({
    mutationFn: (payload: FormState) =>
      editing
        ? api.put(`/units/${editing.id}`, payload).then(r => r.data)
        : api.post('/units', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      toast(editing ? 'Unit updated.' : 'Unit added.');
      setSlideOpen(false);
    },
    onError: () => toast('Save failed.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/units/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      toast('Unit deleted.');
      setDeleteId(null);
    },
    onError: () => toast('Delete failed.', 'error'),
  });

  function openNew() { setEditing(null); setForm(empty()); setSlideOpen(true); }

  function openEdit(u: Unit) {
    setEditing(u);
    setForm({ name: u.name, is_active: u.is_active });
    setSlideOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Units</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark"
        >
          <Plus size={16} /> Add Unit
        </button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search units..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Unit Name</th>
              <th className="px-4 py-3 text-center font-medium">Active</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Loading...</td></tr>
            )}
            {!isLoading && units.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">No units found.</td></tr>
            )}
            {units.map((u, i) => (
              <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-4 py-3 text-center">
                  {u.is_active
                    ? <ToggleRight className="text-green-500 mx-auto" size={20} />
                    : <ToggleLeft className="text-gray-400 mx-auto" size={20} />
                  }
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(u)} className="text-brand hover:text-brand-dark">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setDeleteId(u.id)} className="text-brand hover:text-brand-dark">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Unit' : 'Add Unit'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Nos, Kg, Meter"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Active</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
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

      <ConfirmDialog
        open={deleteId !== null}
        message="Are you sure you want to delete this unit?"
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
