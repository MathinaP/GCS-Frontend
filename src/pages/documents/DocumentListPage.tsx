import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileDown, Pencil, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { type Document, type DocumentType } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { formatIndian } from '../../lib/numberToWords';

interface Props {
  type: DocumentType;
}

const TYPE_LABEL: Record<DocumentType, string> = {
  invoice: 'Invoices',
  proforma_invoice: 'Proforma Invoices',
  purchase_order: 'Purchase Orders',
  quotation: 'Quotations',
};

const TYPE_ROUTE: Record<DocumentType, string> = {
  invoice: 'invoices',
  proforma_invoice: 'proforma',
  purchase_order: 'purchase-orders',
  quotation: 'quotations',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-brand-light text-brand',
};

export default function DocumentListPage({ type }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const route = TYPE_ROUTE[type];

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sealTarget, setSealTarget] = useState<Document | null>(null);
  const [includeSeal, setIncludeSeal] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', type, search, status, from, to, page],
    queryFn: () => {
      const params = new URLSearchParams({ type, page: String(page) });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return api.get<{ data: Document[]; meta: { current_page: number; last_page: number; total: number } }>(
        `/documents?${params}`
      ).then(r => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast('Document deleted.');
      setDeleteId(null);
    },
    onError: () => toast('Delete failed.', 'error'),
  });

  async function runDownloadPdf(doc: Document, seal: boolean) {
    setSealTarget(null);
    try {
      const r = await api.get(`/documents/${doc.id}/pdf`, { responseType: 'blob', params: { seal: seal ? 1 : 0 } });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.doc_number}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast('Failed to download PDF. Please try again.', 'error');
    }
  }

  function downloadPdf(doc: Document) { setSealTarget(doc); }

  function partyName(doc: Document) {
    return doc.customer?.name || doc.supplier?.name || '—';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">{TYPE_LABEL[type]}</h1>
        <button
          onClick={() => navigate(`/${route}/new`)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark"
        >
          <Plus size={16} /> New {TYPE_LABEL[type].replace(/s$/, '')}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search doc no or party..."
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={e => { setFrom(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          title="From date"
        />
        <input
          type="date"
          value={to}
          onChange={e => { setTo(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          title="To date"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Doc No</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Party Name</th>
              <th className="px-4 py-3 text-right font-medium">Grand Total (₹)</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
            )}
            {!isLoading && (!data?.data || data.data.length === 0) && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No {TYPE_LABEL[type].toLowerCase()} found.</td></tr>
            )}
            {data?.data?.map((doc, i) => (
              <tr key={doc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-mono text-brand font-medium">{doc.doc_number}</td>
                <td className="px-4 py-3 text-gray-600">{doc.date}</td>
                <td className="px-4 py-3 text-gray-700">{partyName(doc)}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {formatIndian(doc.grand_total)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[doc.status]}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => navigate(`/${route}/${doc.id}`)}
                      className="text-brand hover:text-brand-dark"
                      title="View/Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => downloadPdf(doc)}
                      className="text-green-600 hover:text-green-800"
                      title="Generate PDF"
                    >
                      <FileDown size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteId(doc.id)}
                      className="text-brand hover:text-brand-dark"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.meta && data.meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Total: {data.meta.total}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-xs text-gray-600">
                {page} / {data.meta.last_page}
              </span>
              <button
                disabled={page >= data.meta.last_page}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        message="Are you sure you want to delete this document?"
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />

      {sealTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSealTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-xs w-full mx-4">
            <h3 className="font-semibold text-gray-800 mb-1">PDF Options</h3>
            <p className="text-xs text-gray-500 mb-5">Choose what to include before generating the PDF.</p>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 mb-6">
              <span className="text-sm font-medium text-gray-700">Include company seal</span>
              <button
                type="button"
                onClick={() => setIncludeSeal(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${includeSeal ? 'bg-brand' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${includeSeal ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setSealTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                Cancel
              </button>
              <button type="button" onClick={() => runDownloadPdf(sealTarget, includeSeal)} className="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-lg">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
