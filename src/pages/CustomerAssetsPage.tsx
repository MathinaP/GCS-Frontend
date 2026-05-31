import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../lib/api';
import { type CustomerAsset, type Customer } from '../types';
import SlideOver from '../components/SlideOver';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { useToast } from '../context/ToastContext';

const PER_PAGE = 10;
const PRODUCTS = ['ENCAP', 'EG SERIES', 'RECPIT', 'HORIZON SERIES', 'GLOBAL SERIES'];
const COMPRESSOR_MAKES = ['ELGI', 'ATLASCOPCO', 'CP COMPRESSOR', 'KEAISER', 'IR COMPRESSOR', 'CHINA COMPRESSOR', 'AIRWA'];

interface FormState {
  customer_id: string;
  fabrication_number: string;
  compressor_model: string;
  service_dealer: string;
  product: string;
  compressor_make: string;
  service_engineer: string;
  contact_person_name: string;
  contact_person_mail: string;
  contact_person_number: string;
  alternate_person_name: string;
  alternate_person_mail: string;
  alternate_person_number: string;
  hours_meter_reading: string;
  hmr_date: string;
  amc: boolean;
  amc_start_date: string;
  amc_end_date: string;
}

const empty = (): FormState => ({
  customer_id: '',
  fabrication_number: '',
  compressor_model: '',
  service_dealer: 'Go Care Solutions',
  product: '',
  compressor_make: '',
  service_engineer: '',
  contact_person_name: '',
  contact_person_mail: '',
  contact_person_number: '',
  alternate_person_name: '',
  alternate_person_mail: '',
  alternate_person_number: '',
  hours_meter_reading: '',
  hmr_date: '',
  amc: false,
  amc_start_date: '',
  amc_end_date: '',
});

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand';
const LABEL = 'block text-xs font-medium text-gray-600 mb-1';

export default function CustomerAssetsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [slideOpen, setSlideOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAsset | null>(null);
  const [viewing, setViewing] = useState<CustomerAsset | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-assets'],
    queryFn: () => api.get<{ data: CustomerAsset[] }>('/customer-assets').then(r => r.data.data),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<{ data: Customer[] }>('/customers').then(r => r.data.data),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter(a =>
      a.fabrication_number.toLowerCase().includes(q) ||
      a.compressor_model.toLowerCase().includes(q) ||
      a.compressor_make.toLowerCase().includes(q) ||
      (a.customer?.name || '').toLowerCase().includes(q),
    );
  }, [data, search]);

  useEffect(() => { setPage(1); }, [search]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const assets = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const saveMutation = useMutation({
    mutationFn: (payload: FormState) => {
      const body = {
        ...payload,
        customer_id: Number(payload.customer_id),
        service_dealer: payload.service_dealer || 'Go Care Solutions',
        hours_meter_reading: payload.hours_meter_reading,
        hmr_date: payload.hmr_date,
        service_engineer: payload.service_engineer || null,
        contact_person_name: payload.contact_person_name,
        contact_person_mail: payload.contact_person_mail,
        contact_person_number: payload.contact_person_number,
        alternate_person_name: payload.alternate_person_name || null,
        alternate_person_mail: payload.alternate_person_mail || null,
        alternate_person_number: payload.alternate_person_number || null,
        amc_start_date: payload.amc ? payload.amc_start_date || null : null,
        amc_end_date: payload.amc ? payload.amc_end_date || null : null,
      };
      return editing
        ? api.put(`/customer-assets/${editing.id}`, body).then(r => r.data)
        : api.post('/customer-assets', body).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-assets'] });
      toast(editing ? 'Asset updated.' : 'Asset added.');
      setSlideOpen(false);
    },
    onError: () => toast('Save failed.', 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customer-assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-assets'] });
      toast('Asset deactivated.');
      setDeactivateId(null);
    },
    onError: () => toast('Deactivation failed.', 'error'),
  });

  function openNew() { setEditing(null); setForm(empty()); setSlideOpen(true); }

  function openEdit(a: CustomerAsset) {
    setEditing(a);
    setForm({
      customer_id: String(a.customer_id),
      fabrication_number: a.fabrication_number,
      compressor_model: a.compressor_model,
      service_dealer: a.service_dealer,
      product: a.product,
      compressor_make: a.compressor_make,
      service_engineer: a.service_engineer || '',
      contact_person_name: a.contact_person_name || '',
      contact_person_mail: a.contact_person_mail || '',
      contact_person_number: a.contact_person_number || '',
      alternate_person_name: a.alternate_person_name || '',
      alternate_person_mail: a.alternate_person_mail || '',
      alternate_person_number: a.alternate_person_number || '',
      hours_meter_reading: a.hours_meter_reading || '',
      hmr_date: a.hmr_date || '',
      amc: a.amc,
      amc_start_date: a.amc_start_date || '',
      amc_end_date: a.amc_end_date || '',
    });
    setSlideOpen(true);
  }

  function openDetail(a: CustomerAsset) {
    setViewing(a);
    setDetailOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Customer Assets</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
          <Plus size={16} /> Add Asset
        </button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search fab no, model, make, customer..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Fab. Number</th>
              <th className="px-4 py-3 text-left font-medium">Compressor Model</th>
              <th className="px-4 py-3 text-left font-medium">Service Dealer</th>
              <th className="px-4 py-3 text-left font-medium">Compressor Make</th>
              <th className="px-4 py-3 text-left font-medium">Contact No.</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            )}
            {!isLoading && assets.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No assets found.</td></tr>
            )}
            {assets.map((a, i) => (
              <tr key={a.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openDetail(a)}
                    className="font-medium text-brand hover:text-brand-dark hover:underline"
                  >
                    {a.fabrication_number}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600">{a.compressor_model}</td>
                <td className="px-4 py-3 text-gray-600">{a.service_dealer}</td>
                <td className="px-4 py-3 text-gray-600">{a.compressor_make}</td>
                <td className="px-4 py-3 text-gray-600">{a.contact_person_number || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(a)} className="text-brand hover:text-brand-dark"><Pencil size={15} /></button>
                    <button onClick={() => setDeactivateId(a.id)} className="text-brand hover:text-brand-dark"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} lastPage={lastPage} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* Add / Edit SlideOver */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Asset' : 'Add Asset'} width="w-[560px]">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Customer */}
          <div>
            <label className={LABEL}>Customer *</label>
            <select required value={form.customer_id} onChange={e => set('customer_id', e.target.value)} className={INPUT}>
              <option value="">— Select Customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Fabrication Number */}
          <div>
            <label className={LABEL}>Fabrication Number *</label>
            <input required value={form.fabrication_number} onChange={e => set('fabrication_number', e.target.value)} className={INPUT} />
          </div>

          {/* Compressor Model */}
          <div>
            <label className={LABEL}>Compressor Model *</label>
            <input required value={form.compressor_model} onChange={e => set('compressor_model', e.target.value)} className={INPUT} />
          </div>

          {/* Service Dealer */}
          <div>
            <label className={LABEL}>Service Dealer</label>
            <input value={form.service_dealer} onChange={e => set('service_dealer', e.target.value)} className={INPUT} />
          </div>

          {/* Product */}
          <div>
            <label className={LABEL}>Product *</label>
            <select required value={form.product} onChange={e => set('product', e.target.value)} className={INPUT}>
              <option value="">— Select Product —</option>
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Compressor Make */}
          <div>
            <label className={LABEL}>Compressor Make *</label>
            <select required value={form.compressor_make} onChange={e => set('compressor_make', e.target.value)} className={INPUT}>
              <option value="">— Select Make —</option>
              {COMPRESSOR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Service Engineer */}
          <div>
            <label className={LABEL}>Service Engineer</label>
            <input value={form.service_engineer} onChange={e => set('service_engineer', e.target.value)} className={INPUT} />
          </div>

          {/* Contact Person */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact Person</p>
            <div>
              <label className={LABEL}>Name *</label>
              <input required value={form.contact_person_name} onChange={e => set('contact_person_name', e.target.value)} className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Email *</label>
                <input required type="email" value={form.contact_person_mail} onChange={e => set('contact_person_mail', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Number *</label>
                <input required value={form.contact_person_number} onChange={e => set('contact_person_number', e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>

          {/* Alternate Person */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Alternate Person</p>
            <div>
              <label className={LABEL}>Name</label>
              <input value={form.alternate_person_name} onChange={e => set('alternate_person_name', e.target.value)} className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Email</label>
                <input type="email" value={form.alternate_person_mail} onChange={e => set('alternate_person_mail', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Number</label>
                <input value={form.alternate_person_number} onChange={e => set('alternate_person_number', e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>

          {/* Hours Meter Reading & HMR Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Hours Meter Reading *</label>
              <input required type="number" min="0" step="0.01" value={form.hours_meter_reading} onChange={e => set('hours_meter_reading', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>HMR Date * (dd-mm-yyyy)</label>
              <input required type="date" value={form.hmr_date} onChange={e => set('hmr_date', e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* AMC */}
          <div>
            <label className={LABEL}>AMC</label>
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="amc" checked={form.amc === true} onChange={() => set('amc', true)} className="accent-brand" />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="amc" checked={form.amc === false} onChange={() => set('amc', false)} className="accent-brand" />
                No
              </label>
            </div>
          </div>

          {form.amc && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>AMC Start Date *</label>
                <input type="date" required value={form.amc_start_date} onChange={e => set('amc_start_date', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>AMC End Date *</label>
                <input type="date" required value={form.amc_end_date} onChange={e => set('amc_end_date', e.target.value)} className={INPUT} />
              </div>
            </div>
          )}

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

      {/* Detail view SlideOver */}
      <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Asset Details" width="w-[480px]">
        {viewing && (
          <div className="space-y-3">
            <DetailRow label="Customer" value={viewing.customer?.name} />
            <DetailRow label="Fabrication Number" value={viewing.fabrication_number} />
            <DetailRow label="Compressor Model" value={viewing.compressor_model} />
            <DetailRow label="Service Dealer" value={viewing.service_dealer} />
            <DetailRow label="Product" value={viewing.product} />
            <DetailRow label="Compressor Make" value={viewing.compressor_make} />
            <DetailRow label="Service Engineer" value={viewing.service_engineer} />

            <hr className="border-gray-100 my-2" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact Person</p>
            <DetailRow label="Name" value={viewing.contact_person_name} />
            <DetailRow label="Email" value={viewing.contact_person_mail} />
            <DetailRow label="Number" value={viewing.contact_person_number} />

            <hr className="border-gray-100 my-2" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Alternate Person</p>
            <DetailRow label="Name" value={viewing.alternate_person_name} />
            <DetailRow label="Email" value={viewing.alternate_person_mail} />
            <DetailRow label="Number" value={viewing.alternate_person_number} />

            <hr className="border-gray-100 my-2" />
            <DetailRow label="Hours Meter Reading" value={viewing.hours_meter_reading} />
            <DetailRow label="HMR Date" date={viewing.hmr_date} />
            <DetailRow label="AMC" value={viewing.amc ? 'Yes' : 'No'} />
            {viewing.amc && (
              <>
                <DetailRow label="AMC Start Date" date={viewing.amc_start_date} />
                <DetailRow label="AMC End Date" date={viewing.amc_end_date} />
              </>
            )}
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={deactivateId !== null}
        title="Deactivate Asset"
        message="This will mark the asset as inactive and remove it from the list. Continue?"
        onConfirm={() => deactivateId !== null && deactivateMutation.mutate(deactivateId)}
        onCancel={() => setDeactivateId(null)}
        loading={deactivateMutation.isPending}
        confirmLabel="Deactivate"
        loadingLabel="Deactivating..."
      />
    </div>
  );
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—';
  const [y, m, d] = val.split('-');
  return `${d}-${m}-${y}`;
}

function DetailRow({ label, value, date }: { label: string; value?: string | null; date?: string | null }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs font-medium text-gray-500 w-44 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{date !== undefined ? fmtDate(date) : (value || '—')}</span>
    </div>
  );
}
