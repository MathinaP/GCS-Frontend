import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import api from '../lib/api';
import { type DocumentCounter } from '../types';
import { useToast } from '../context/ToastContext';

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_order: 'Purchase Order',
  quotation: 'Quotation',
};

type Drafts = Record<number, Pick<DocumentCounter, 'prefix' | 'last_number' | 'financial_year'>>;

export default function DocumentCountersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Drafts>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ['document-counters'],
    queryFn: () => api.get<{ data: DocumentCounter[] }>('/document-counters').then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Drafts[number] }) =>
      api.put(`/document-counters/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-counters'] });
      toast('Document counter updated.');
    },
    onError: () => toast('Counter save failed.', 'error'),
  });

  function value(counter: DocumentCounter) {
    return drafts[counter.id] ?? {
      prefix: counter.prefix,
      last_number: counter.last_number,
      financial_year: counter.financial_year,
    };
  }

  function setField(id: number, field: keyof Drafts[number], next: string) {
    const original = data.find(c => c.id === id);
    if (!original) return;
    setDrafts(prev => ({
      ...prev,
      [id]: {
        ...value(original),
        [field]: field === 'last_number' ? Number(next) || 0 : next,
      },
    }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Document Counters</h1>
        <p className="mt-1 text-sm text-gray-500">Manage prefixes, financial year and next running numbers.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Document</th>
              <th className="px-4 py-3 text-left font-medium">Prefix</th>
              <th className="px-4 py-3 text-right font-medium">Last Number</th>
              <th className="px-4 py-3 text-left font-medium">Financial Year</th>
              <th className="px-4 py-3 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Loading...</td></tr>}
            {!isLoading && data.map(counter => {
              const row = value(counter);
              return (
                <tr key={counter.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-800">{TYPE_LABEL[counter.type] ?? counter.type}</td>
                  <td className="px-4 py-3">
                    <input value={row.prefix} onChange={e => setField(counter.id, 'prefix', e.target.value)} className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" min="0" value={row.last_number} onChange={e => setField(counter.id, 'last_number', e.target.value)} className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </td>
                  <td className="px-4 py-3">
                    <input value={row.financial_year} onChange={e => setField(counter.id, 'financial_year', e.target.value)} className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => saveMutation.mutate({ id: counter.id, payload: row })} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                      <Save size={14} /> Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
