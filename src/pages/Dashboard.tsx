import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, ShoppingCart, MessageSquare, Plus } from 'lucide-react';
import api from '../lib/api';
import { type DashboardStats, type Document } from '../types';
import { formatIndian } from '../lib/numberToWords';

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

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  });

  const { data: recent } = useQuery<{ data: Document[] }>({
    queryKey: ['documents-recent'],
    queryFn: () => api.get('/documents?per_page=10').then(r => r.data),
  });

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
      <h2 className="text-base font-semibold text-gray-700 mb-3">Recent Documents</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
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
            {(!recent?.data || recent.data.length === 0) && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No documents yet.</td></tr>
            )}
            {recent?.data?.map((doc, i) => (
              <tr key={doc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
      </div>
    </div>
  );
}
