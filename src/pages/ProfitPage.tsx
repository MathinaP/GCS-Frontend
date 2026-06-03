import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, ShoppingCart, Receipt } from 'lucide-react';
import api from '../lib/api';
import { type ProfitSummary, type ExpenseCategory } from '../types';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel_travel:     'Fuel & Travel',
  salary:          'Salaries & Labour',
  rent_utilities:  'Rent & Utilities',
  tools_equipment: 'Tools & Equipment',
  material:        'Material',
  food:            'Food',
  other:           'Other',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  fuel_travel:     'bg-blue-500',
  salary:          'bg-purple-500',
  rent_utilities:  'bg-orange-500',
  tools_equipment: 'bg-yellow-500',
  material:        'bg-green-500',
  food:            'bg-pink-500',
  other:           'bg-gray-400',
};

const MONTH_LABELS: Record<string, string> = {
  '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
  '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec',
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_LABELS[m] ?? m} ${y}`;
}

function getPreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (preset === 'this_month') return {
    from: new Date(year, month, 1).toISOString().slice(0, 10),
    to:   new Date(year, month + 1, 0).toISOString().slice(0, 10),
  };
  if (preset === 'last_month') return {
    from: new Date(year, month - 1, 1).toISOString().slice(0, 10),
    to:   new Date(year, month, 0).toISOString().slice(0, 10),
  };
  if (preset === 'this_fy') {
    const s = month >= 3 ? year : year - 1;
    return { from: `${s}-04-01`, to: `${s + 1}-03-31` };
  }
  if (preset === 'last_fy') {
    const s = month >= 3 ? year - 1 : year - 2;
    return { from: `${s}-04-01`, to: `${s + 1}-03-31` };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

const PRESETS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_fy',    label: 'This Financial Year' },
  { value: 'last_fy',    label: 'Last Financial Year' },
];

export default function ProfitPage() {
  const [preset, setPreset] = useState('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const range = preset === 'custom' ? custom : getPreset(preset);

  const { data, isLoading } = useQuery({
    queryKey: ['profit-summary', range.from, range.to],
    queryFn: () =>
      api.get<ProfitSummary>(`/expenses/summary?from=${range.from}&to=${range.to}`)
         .then(r => r.data),
    enabled: !!range.from && !!range.to,
  });

  const isProfit = (data?.profit ?? 0) >= 0;
  const totalCosts = (data?.po_costs ?? 0) + (data?.expenses ?? 0);
  const maxMonthly = Math.max(
    ...(data?.monthly.flatMap(m => [m.revenue, m.po_costs + m.expenses]) ?? [1])
  ) || 1;

  return (
    <div>
      {/* Header + period */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">Profit & Loss</h1>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.value} onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                preset === p.value ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >{p.label}</button>
          ))}
          <button onClick={() => setPreset('custom')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              preset === 'custom' ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >Custom</button>
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex gap-3 mb-4">
          <input type="date" value={custom.from}
            onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input type="date" value={custom.to}
            onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      )}

      {isLoading && <div className="text-center py-20 text-gray-400">Loading...</div>}

      {data && (
        <>
          {/* How profit is calculated — simple explanation */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-blue-600 mb-2">How your profit is calculated</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Invoices ₹{fmt(data.revenue)}</span>
              <span className="text-gray-400 font-bold">−</span>
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">Purchase Orders ₹{fmt(data.po_costs)}</span>
              <span className="text-gray-400 font-bold">−</span>
              <span className="bg-red-100 text-red-600 px-2 py-1 rounded font-medium">Other Expenses ₹{fmt(data.expenses)}</span>
              <span className="text-gray-400 font-bold">=</span>
              <span className={`px-2 py-1 rounded font-bold ${isProfit ? 'bg-brand-light text-brand' : 'bg-red-100 text-red-600'}`}>
                {isProfit ? 'Profit' : 'Loss'} ₹{fmt(Math.abs(data.profit))}
              </span>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Invoice Revenue</p>
                <div className="p-1.5 rounded-lg bg-green-50"><TrendingUp size={16} className="text-green-600" /></div>
              </div>
              <p className="text-xl font-bold text-green-600">₹ {fmt(data.revenue)}</p>
              <p className="text-xs text-gray-400 mt-1">Money customers paid you</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Purchase Orders</p>
                <div className="p-1.5 rounded-lg bg-orange-50"><ShoppingCart size={16} className="text-orange-500" /></div>
              </div>
              <p className="text-xl font-bold text-orange-500">₹ {fmt(data.po_costs)}</p>
              <p className="text-xs text-gray-400 mt-1">Money you paid suppliers</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Other Expenses</p>
                <div className="p-1.5 rounded-lg bg-red-50"><Receipt size={16} className="text-red-500" /></div>
              </div>
              <p className="text-xl font-bold text-red-500">₹ {fmt(data.expenses)}</p>
              <p className="text-xs text-gray-400 mt-1">Fuel, salary, rent etc.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">{isProfit ? 'Net Profit' : 'Net Loss'}</p>
                <div className={`p-1.5 rounded-lg ${isProfit ? 'bg-brand-light' : 'bg-red-50'}`}>
                  <Wallet size={16} className={isProfit ? 'text-brand' : 'text-red-500'} />
                </div>
              </div>
              <p className={`text-xl font-bold ${isProfit ? 'text-brand' : 'text-red-500'}`}>
                {!isProfit && '− '}₹ {fmt(Math.abs(data.profit))}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data.revenue > 0
                  ? `${((data.profit / data.revenue) * 100).toFixed(1)}% margin`
                  : 'No revenue yet'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly breakdown */}
            {data.monthly.length > 0 && (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Month-by-Month</h2>

                <div className="space-y-4">
                  {data.monthly.map(m => {
                    const totalOut = m.po_costs + m.expenses;
                    return (
                      <div key={m.month}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-gray-700">{fmtMonth(m.month)}</span>
                          <span className={`font-bold ${m.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {m.profit >= 0 ? 'Profit' : 'Loss'}: ₹{fmt(Math.abs(m.profit))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 w-14">Revenue</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-green-400 h-2 rounded-full"
                              style={{ width: `${(m.revenue / maxMonthly) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-600 w-20 text-right">₹{fmt(m.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-14">Costs</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full flex overflow-hidden"
                              style={{ width: `${(totalOut / maxMonthly) * 100}%` }}>
                              <div className="bg-orange-400 h-full"
                                style={{ width: totalOut > 0 ? `${(m.po_costs / totalOut) * 100}%` : '0%' }} />
                              <div className="bg-red-400 h-full flex-1" />
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 w-20 text-right">₹{fmt(totalOut)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-400 inline-block" /> Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-orange-400 inline-block" /> PO Cost</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" /> Expenses</span>
                </div>

                {/* Table */}
                <div className="mt-5 border-t border-gray-100 pt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left pb-2">Month</th>
                        <th className="text-right pb-2">Revenue</th>
                        <th className="text-right pb-2">PO Cost</th>
                        <th className="text-right pb-2">Expenses</th>
                        <th className="text-right pb-2">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map(m => (
                        <tr key={m.month} className="border-t border-gray-50">
                          <td className="py-1.5 text-gray-700">{fmtMonth(m.month)}</td>
                          <td className="py-1.5 text-right text-green-600">₹{fmt(m.revenue)}</td>
                          <td className="py-1.5 text-right text-orange-500">₹{fmt(m.po_costs)}</td>
                          <td className="py-1.5 text-right text-red-500">₹{fmt(m.expenses)}</td>
                          <td className={`py-1.5 text-right font-semibold ${m.profit >= 0 ? 'text-brand' : 'text-red-500'}`}>
                            {m.profit < 0 && '−'}₹{fmt(Math.abs(m.profit))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-bold">
                        <td className="pt-2">Total</td>
                        <td className="pt-2 text-right text-green-600">₹{fmt(data.revenue)}</td>
                        <td className="pt-2 text-right text-orange-500">₹{fmt(data.po_costs)}</td>
                        <td className="pt-2 text-right text-red-500">₹{fmt(data.expenses)}</td>
                        <td className={`pt-2 text-right ${isProfit ? 'text-brand' : 'text-red-500'}`}>
                          {!isProfit && '−'}₹{fmt(Math.abs(data.profit))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Expense category breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Other Expenses Breakdown</h2>
              <p className="text-xs text-gray-400 mb-4">Fuel, salary, rent etc. that you entered manually</p>

              {data.by_category.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No manual expenses added yet.<br />
                  Go to <strong>Expenses</strong> page to add fuel, salary, rent etc.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {data.by_category.map(c => {
                      const pct = data.expenses > 0
                        ? ((c.total / data.expenses) * 100).toFixed(1) : '0';
                      const cat = c.category as ExpenseCategory;
                      return (
                        <div key={c.category}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700 font-medium">{CATEGORY_LABELS[cat] ?? c.category}</span>
                            <span className="text-gray-500">₹{fmt(c.total)} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${CATEGORY_COLORS[cat] ?? 'bg-gray-400'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold text-gray-700">
                    <span>Total</span>
                    <span className="text-red-500">₹{fmt(data.expenses)}</span>
                  </div>
                </>
              )}

              {/* Total costs summary */}
              <div className="mt-4 pt-3 border-t-2 border-gray-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Purchase Orders</span>
                  <span className="text-orange-500 font-medium">₹{fmt(data.po_costs)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Other Expenses</span>
                  <span className="text-red-500 font-medium">₹{fmt(data.expenses)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-700 pt-1 border-t border-gray-100">
                  <span>Total Outflow</span>
                  <span>₹{fmt(totalCosts)}</span>
                </div>
              </div>
            </div>

            {data.monthly.length === 0 && (
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-400">
                No invoices or purchase orders found for this period.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
