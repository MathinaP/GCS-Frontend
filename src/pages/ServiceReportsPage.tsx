import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FileDown, Pencil } from 'lucide-react';
import api from '../lib/api';
import { type ServiceReport, type Customer, type CustomerAsset } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { useToast } from '../context/ToastContext';

const PER_PAGE = 20;
const SERVICE_TYPES = ['Sales Call', 'Schedule Service', 'Schedule Service - AMC', 'Complaint Call'];

export default function ServiceReportsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selCustomer, setSelCustomer] = useState('');
  const [selAsset, setSelAsset] = useState('');
  const [selType, setSelType] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['service-reports'],
    queryFn: () => api.get<{ data: ServiceReport[] }>('/service-reports').then(r => r.data.data),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<{ data: Customer[] }>('/customers').then(r => r.data.data),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['customer-assets'],
    queryFn: () => api.get<{ data: CustomerAsset[] }>('/customer-assets').then(r => r.data.data),
  });

  const filteredAssets = useMemo(
    () => selCustomer ? assets.filter(a => String(a.customer_id) === selCustomer) : [],
    [assets, selCustomer],
  );

  useEffect(() => { setSelAsset(''); }, [selCustomer]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter(r =>
      r.report_number.toLowerCase().includes(q) ||
      (r.company_name || '').toLowerCase().includes(q) ||
      (r.fabrication_number || '').toLowerCase().includes(q),
    );
  }, [data, search]);

  useEffect(() => { setPage(1); }, [search]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const createMutation = useMutation({
    mutationFn: () => api.post('/service-reports', {
      customer_id: Number(selCustomer),
      customer_asset_id: Number(selAsset),
      service_type: selType,
    }).then(r => r.data.data ?? r.data),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['service-reports'] });
      setCreateOpen(false);
      navigate(`/service-reports/${report.id}`);
    },
    onError: () => toast('Failed to create report.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/service-reports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-reports'] });
      toast('Report deleted.');
      setDeleteId(null);
    },
    onError: () => toast('Delete failed.', 'error'),
  });

  function handleDownloadPdf(r: ServiceReport) {
    window.open(`${import.meta.env.VITE_API_BASE_URL ?? '/api'}/service-reports/${r.id}/pdf`, '_blank');
  }

  const statusBadge = (s: string) => s === 'completed'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Completed</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 font-medium">Draft</span>;

  const canCreate = selCustomer && selAsset && selType;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Service Reports</h1>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark">
          <Plus size={16} /> New Report
        </button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search report no, company, fab..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Report No</th>
              <th className="px-4 py-3 text-left font-medium">Type of Call</th>
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Fab. Number</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-400">No reports found.</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/service-reports/${r.id}`)} className="font-medium text-brand hover:underline">
                    {r.report_number}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.service_type}</td>
                <td className="px-4 py-3 text-gray-600">{r.company_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.fabrication_number || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.report_date || '—'}</td>
                <td className="px-4 py-3">{statusBadge(r.status)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => navigate(`/service-reports/${r.id}`)} className="text-brand hover:text-brand-dark"><Pencil size={15} /></button>
                    <button onClick={() => handleDownloadPdf(r)} className="text-brand hover:text-brand-dark"><FileDown size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} lastPage={lastPage} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold text-gray-800 mb-4">New Service Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                <select value={selCustomer} onChange={e => setSelCustomer(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">— Select Customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fabrication Number *</label>
                <select value={selAsset} onChange={e => setSelAsset(e.target.value)} disabled={!selCustomer}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100">
                  <option value="">— Select Fab. Number —</option>
                  {filteredAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.fabrication_number} — {a.compressor_model}</option>
                  ))}
                </select>
                {selCustomer && filteredAssets.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No assets found for this customer.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service Type *</label>
                <select value={selType} onChange={e => setSelType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">— Select Type —</option>
                  {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canCreate || createMutation.isPending}
                className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Report'}
              </button>
              <button onClick={() => setCreateOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        message="Delete this service report?"
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
