import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import api from '../lib/api';
import { type Expense, type ExpenseCategory, type Paginated } from '../types';
import SlideOver from '../components/SlideOver';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { useToast } from '../context/ToastContext';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'fuel_travel',     label: 'Fuel & Travel' },
  { value: 'salary',          label: 'Salaries & Labour' },
  { value: 'rent_utilities',  label: 'Rent & Utilities' },
  { value: 'tools_equipment', label: 'Tools & Equipment' },
  { value: 'material',        label: 'Material' },
  { value: 'food',            label: 'Food' },
  { value: 'other',           label: 'Other' },
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  fuel_travel:     'bg-blue-100 text-blue-700',
  salary:          'bg-purple-100 text-purple-700',
  rent_utilities:  'bg-orange-100 text-orange-700',
  tools_equipment: 'bg-yellow-100 text-yellow-700',
  material:        'bg-green-100 text-green-700',
  food:            'bg-pink-100 text-pink-700',
  other:           'bg-gray-100 text-gray-600',
};

const categoryLabel = (v: ExpenseCategory) =>
  CATEGORIES.find(c => c.value === v)?.label ?? v;

interface FormState {
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  notes: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const empty = (): FormState => ({
  date: today(), category: 'fuel_travel', description: '', amount: '', notes: '',
});

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [page, setPage]           = useState(1);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing]     = useState<Expense | null>(null);
  const [form, setForm]           = useState<FormState>(empty());
  const [deleteId, setDeleteId]   = useState<number | null>(null);

  const params = new URLSearchParams();
  if (search)   params.set('search', search);
  if (category) params.set('category', category);
  if (from)     params.set('from', from);
  if (to)       params.set('to', to);
  params.set('page', String(page));

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', search, category, from, to, page],
    queryFn: () => api.get<Paginated<Expense>>(`/expenses?${params}`).then(r => r.data),
  });

  useEffect(() => { setPage(1); }, [search, category, from, to]);

  const saveMutation = useMutation({
    mutationFn: (payload: Omit<FormState, 'amount'> & { amount: number }) =>
      editing
        ? api.put(`/expenses/${editing.id}`, payload).then(r => r.data)
        : api.post('/expenses', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['profit-summary'] });
      toast(editing ? 'Expense updated.' : 'Expense added.');
      setSlideOpen(false);
    },
    onError: () => toast('Save failed.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['profit-summary'] });
      toast('Expense deleted.');
      setDeleteId(null);
    },
    onError: () => toast('Delete failed.', 'error'),
  });

  function openNew() {
    setEditing(null);
    setForm(empty());
    setSlideOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setForm({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
      notes: e.notes ?? '',
    });
    setSlideOpen(true);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    saveMutation.mutate({ ...form, amount: parseFloat(form.amount) || 0 });
  }

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const expenses = data?.data ?? [];
  const meta     = data?.meta;

  const pageTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Expenses</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search description..."
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand w-52"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand appearance-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <input
          type="date" value={from} onChange={e => setFrom(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <input
          type="date" value={to} onChange={e => setTo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {(from || to || category || search) && (
          <button
            onClick={() => { setSearch(''); setCategory(''); setFrom(''); setTo(''); }}
            className="px-3 py-2 text-xs text-brand border border-brand rounded-lg hover:bg-brand-light"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table + Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand text-white">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Amount (₹)</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
              )}
              {!isLoading && expenses.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No expenses found.</td></tr>
              )}
              {expenses.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-400 text-xs">{((page - 1) * 20) + i + 1}</td>
                  <td className="px-4 py-3 text-gray-700">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[e.category]}`}>
                      {categoryLabel(e.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {e.description}
                    {e.notes && <p className="text-xs text-gray-400 mt-0.5">{e.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(e)} className="text-brand hover:text-brand-dark">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteId(e.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                    Page Total:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ₹ {pageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading && <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>}
          {!isLoading && expenses.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">No expenses found.</div>
          )}
          {expenses.map((e) => (
            <div key={e.id} className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[e.category]}`}>
                    {categoryLabel(e.category)}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString('en-IN')}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{e.description}</p>
                {e.notes && <p className="text-xs text-gray-400 mt-0.5">{e.notes}</p>}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-gray-800">
                  ₹{Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex gap-2 mt-1 justify-end">
                  <button onClick={() => openEdit(e)} className="text-brand hover:text-brand-dark">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteId(e.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {expenses.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Page Total:</span>
              <span className="font-bold text-gray-800">
                ₹ {pageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {meta && (
          <Pagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            perPage={meta.per_page}
            onChange={setPage}
          />
        )}
      </div>

      {/* Form SlideOver */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input
              required type="date" value={form.date}
              onChange={e => set('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
            <select
              required value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
            <input
              required value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Petrol for site visit to Chennai"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
            <input
              required type="number" step="0.01" min="0.01"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit" disabled={saveMutation.isPending}
              className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button" onClick={() => setSlideOpen(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={deleteId !== null}
        message="Delete this expense entry?"
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
