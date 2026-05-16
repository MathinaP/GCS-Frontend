import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, ShoppingCart, MessageSquare, Plus } from 'lucide-react';
import api from '../lib/api';
import { type DashboardStats, type Document } from '../types';
import { formatIndian } from '../lib/numberToWords';
import Pagination from '../components/Pagination';

const PER_PAGE = 10;

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'proforma_invoice', label: 'Proforma' },
  { value: 'purchase_order', label: 'P.O.' },
  { value: 'quotation', label: 'Quotation' },
];

interface StatCardProps {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, count, total, icon, color }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{count}</p>
      <p className="text-sm text-gray-500 mt-1">₹ {formatIndian(total)}</p>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-brand-light text-brand',
};

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice',
  proforma_invoice: 'Proforma',
  purchase_order: 'P.O.',
  quotation: 'Quotation',
};

const TYPE_ROUTE: Record<string, string> = {
  invoice: 'invoices',
  proforma_invoice: 'proforma',
  purchase_order: 'purchase-orders',
  quotation: 'quotations',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  });

  const { data: recent } = useQuery<{ data: Document[] }>({
    queryKey: ['documents-recent'],
    queryFn: () => api.get('/documents?per_page=100').then(r => r.data),
  });

  const filtered = useMemo(() => {
    if (!recent?.data) return [];
    if (!typeFilter) return recent.data;
    return recent.data.filter(d => d.type === typeFilter);
  }, [recent, typeFilter]);

  useEffect(() => { setPage(1); }, [typeFilter]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const docs = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const defaultStat = { count: 0, total: 0 };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Invoices (this month)"
          count={stats?.invoice?.count ?? 0}
          total={stats?.invoice?.total ?? 0}
          icon={<FileText size={18} className="text-brand" />}
          color="bg-brand-light"
        />
        <StatCard
          label="Proforma (this month)"
          count={stats?.proforma_invoice?.count ?? defaultStat.count}
          total={stats?.proforma_invoice?.total ?? defaultStat.total}
          icon={<ClipboardList size={18} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          label="Purchase Orders (this month)"
          count={stats?.purchase_order?.count ?? defaultStat.count}
          total={stats?.purchase_order?.total ?? defaultStat.total}
          icon={<ShoppingCart size={18} className="text-orange-600" />}
          color="bg-orange-50"
        />
        <StatCard
          label="Quotations (this month)"
          count={stats?.quotation?.count ?? defaultStat.count}
          total={stats?.quotation?.total ?? defaultStat.total}
          icon={<MessageSquare size={18} className="text-green-600" />}
          color="bg-green-50"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { label: 'New Invoice', path: '/invoices/new' },
          { label: 'New Proforma', path: '/proforma/new' },
          { label: 'New P.O.', path: '/purchase-orders/new' },
          { label: 'New Quotation', path: '/quotations/new' },
        ].map(a => (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark"
          >
            <Plus size={16} /> {a.label}
          </button>
        ))}
      </div>

      {/* Recent documents */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-700">Recent Documents</h2>
        <div className="flex gap-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Doc No</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Party</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount (₹)</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No documents found.</td></tr>
            )}
            {docs.map((doc, i) => (
              <tr key={doc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                <td className="px-4 py-3 font-mono text-brand font-medium">{doc.doc_number}</td>
                <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[doc.type]}</td>
                <td className="px-4 py-3 text-gray-700">
                  {doc.customer?.name || doc.supplier?.name || '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{doc.date}</td>
                <td className="px-4 py-3 text-right font-medium">{formatIndian(doc.grand_total)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[doc.status]}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => navigate(`/${TYPE_ROUTE[doc.type]}/${doc.id}`)}
                    className="text-brand hover:text-brand-dark text-xs font-medium"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} lastPage={lastPage} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>
    </div>
  );
}
