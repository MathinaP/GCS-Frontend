import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, BarChart2 } from 'lucide-react';
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
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_LABELS[m] ?? m} ${y}`;
}

// Preset date ranges
function getPreset(preset: string): { from: string; to: string } {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  if (preset === 'this_month') {
    return {
      from: new Date(year, month, 1).toISOString().slice(0, 10),
      to:   new Date(year, month + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (preset === 'last_month') {
    return {
      from: new Date(year, month - 1, 1).toISOString().slice(0, 10),
      to:   new Date(year, month, 0).toISOString().slice(0, 10),
    };
  }
  if (preset === 'this_fy') {
    const fyStart = month >= 3 ? year : year - 1;
    return {
      from: `${fyStart}-04-01`,
      to:   `${fyStart + 1}-03-31`,
    };
  }
  if (preset === 'last_fy') {
    const fyStart = month >= 3 ? year - 1 : year - 2;
    return {
      from: `${fyStart}-04-01`,
      to:   `${fyStart + 1}-03-31`,
    };
  }
  // this_year
  return {
    from: `${year}-01-01`,
    to:   `${year}-12-31`,
  };
}

const PRESETS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_fy',    label: 'This Financial Year' },
  { value: 'last_fy',    label: 'Last Financial Year' },
  { value: 'this_year',  label: 'This Calendar Year' },
];

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  prefix?: string;
}

function SummaryCard({ label, value, icon, color, textColor, prefix = '₹' }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>
        {prefix} {fmt(Math.abs(value))}
      </p>
    </div>
  );
}

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

  const isProfit  = (data?.profit ?? 0) >= 0;
  const margin    = data && data.revenue > 0
    ? ((data.profit / data.revenue) * 100).toFixed(1)
    : '0.0';

  const maxMonthly = Math.max(
    ...(data?.monthly.flatMap(m => [m.revenue, m.expenses]) ?? [1])
  ) || 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">Profit & Loss</h1>

        {/* Period selector */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                preset === p.value
                  ? 'bg-brand text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPreset('custom')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              preset === 'custom'
                ? 'bg-brand text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex gap-3 mb-4">
          <input
            type="date" value={custom.from}
            onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            type="date" value={custom.to}
            onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      )}

      {isLoading && (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              label="Total Revenue"
              value={data.revenue}
              icon={<TrendingUp size={18} className="text-green-600" />}
              color="bg-green-50"
              textColor="text-green-700"
            />
            <SummaryCard
              label="Total Expenses"
              value={data.expenses}
              icon={<TrendingDown size={18} className="text-red-500" />}
              color="bg-red-50"
              textColor="text-red-600"
            />
            <SummaryCard
              label={isProfit ? 'Net Profit' : 'Net Loss'}
              value={data.profit}
              icon={<Wallet size={18} className={isProfit ? 'text-brand' : 'text-red-500'} />}
              color={isProfit ? 'bg-brand-light' : 'bg-red-50'}
              textColor={isProfit ? 'text-brand' : 'text-red-600'}
            />
            <SummaryCard
              label="Profit Margin"
              value={parseFloat(margin)}
              icon={<BarChart2 size={18} className="text-indigo-500" />}
              color="bg-indigo-50"
              textColor={isProfit ? 'text-indigo-700' : 'text-red-600'}
              prefix=""
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly breakdown */}
            {data.monthly.length > 0 && (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Breakdown</h2>
                <div className="space-y-3">
                  {data.monthly.map(m => (
                    <div key={m.month}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="font-medium text-gray-700">{fmtMonth(m.month)}</span>
                        <span className={m.profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {m.profit >= 0 ? '+' : ''}₹{fmt(m.profit)}
                        </span>
                      </div>
                      {/* Revenue bar */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 w-16">Revenue</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-green-400 h-2 rounded-full"
                            style={{ width: `${(m.revenue / maxMonthly) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-20 text-right">₹{fmt(m.revenue)}</span>
                      </div>
                      {/* Expense bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16">Expense</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-red-400 h-2 rounded-full"
                            style={{ width: `${(m.expenses / maxMonthly) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-20 text-right">₹{fmt(m.expenses)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary table */}
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left pb-2">Month</th>
                        <th className="text-right pb-2">Revenue</th>
                        <th className="text-right pb-2">Expenses</th>
                        <th className="text-right pb-2">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map(m => (
                        <tr key={m.month} className="border-t border-gray-50">
                          <td className="py-1.5 text-gray-700">{fmtMonth(m.month)}</td>
                          <td className="py-1.5 text-right text-green-600">₹{fmt(m.revenue)}</td>
                          <td className="py-1.5 text-right text-red-500">₹{fmt(m.expenses)}</td>
                          <td className={`py-1.5 text-right font-semibold ${m.profit >= 0 ? 'text-brand' : 'text-red-500'}`}>
                            {m.profit >= 0 ? '' : '-'}₹{fmt(Math.abs(m.profit))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-bold">
                        <td className="pt-2 text-gray-700">Total</td>
                        <td className="pt-2 text-right text-green-600">₹{fmt(data.revenue)}</td>
                        <td className="pt-2 text-right text-red-500">₹{fmt(data.expenses)}</td>
                        <td className={`pt-2 text-right ${isProfit ? 'text-brand' : 'text-red-500'}`}>
                          {!isProfit && '-'}₹{fmt(Math.abs(data.profit))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Expense by category */}
            {data.by_category.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Expenses by Category</h2>
                <div className="space-y-3">
                  {data.by_category.map(c => {
                    const pct = data.expenses > 0
                      ? ((c.total / data.expenses) * 100).toFixed(1)
                      : '0';
                    const cat = c.category as ExpenseCategory;
                    return (
                      <div key={c.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700 font-medium">{CATEGORY_LABELS[cat] ?? c.category}</span>
                          <span className="text-gray-500">₹{fmt(c.total)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${CATEGORY_COLORS[cat] ?? 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm font-bold text-gray-700">
                    <span>Total Expenses</span>
                    <span className="text-red-500">₹{fmt(data.expenses)}</span>
                  </div>
                </div>
              </div>
            )}

            {data.monthly.length === 0 && data.by_category.length === 0 && (
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-400">
                No data for the selected period. Add invoices and expenses to see your profit here.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
