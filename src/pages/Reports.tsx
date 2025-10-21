import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileText } from 'lucide-react';
import ChartCard from '../components/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const dateRanges = ['day', 'week', 'month', 'quarter', 'year', 'custom'] as const;

type DateRange = (typeof dateRanges)[number];

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const sampleData = useMemo(
    () => [
      { name: 'Week 1', leads: 12, conversions: 3 },
      { name: 'Week 2', leads: 19, conversions: 5 },
      { name: 'Week 3', leads: 15, conversions: 4 },
      { name: 'Week 4', leads: 22, conversions: 7 },
    ],
    [],
  );

  const handleExportPDF = () => {
    alert('PDF export functionality would be implemented with a library like jsPDF');
  };

  const handleExportCSV = () => {
    const csv = [
      ['Period', 'Total Leads', 'Conversions', 'Conversion Rate'],
      ...sampleData.map((item) => [
        item.name,
        item.leads,
        item.conversions,
        `${Math.round((item.conversions / item.leads) * 100)}%`,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Insights</p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-fluid-3xl">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Generate interactive performance reports with exportable summaries.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-700"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <Calendar className="h-5 w-5 text-cyan-600" />
            <span>Select range</span>
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:hidden"
            >
              {dateRanges.map((range) => (
                <option key={range} value={range}>
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </option>
              ))}
            </select>
            <div className="hidden gap-2 sm:flex">
              {dateRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    dateRange === range
                      ? 'bg-cyan-600 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  type="button"
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {dateRange === 'custom' && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <span className="flex items-center justify-center text-sm font-semibold text-slate-500">to</span>
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Total Leads', value: '68', change: '+15% from last period' },
          { title: 'Conversion Rate', value: '28%', change: '+3% from last period' },
          { title: 'Avg Response Time', value: '1.5s', change: '-0.3s from last period' },
        ].map((metric) => (
          <article
            key={metric.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{metric.title}</h3>
            <p className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{metric.value}</p>
            <p className={`mt-2 text-sm ${metric.change.includes('-') ? 'text-amber-600' : 'text-emerald-600'}`}>{metric.change}</p>
          </article>
        ))}
      </section>

      <ChartCard title="Lead Generation & Conversion Trends" subtitle="Weekly performance overview">
        <div className="h-64 sm:h-72 lg:h-[22rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sampleData} barSize={32} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip wrapperClassName="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg" />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="leads" fill="#06b6d4" name="Total Leads" radius={[8, 8, 0, 0]} />
              <Bar dataKey="conversions" fill="#10b981" name="Conversions" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Saved Report Templates</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {['Weekly Performance Summary', 'Monthly Conversion Report', 'Lead Source Analysis', 'Agent Performance Review'].map(
            (template) => (
              <div
                key={template}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-cyan-200 hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-cyan-600" />
                  <span className="text-sm font-semibold text-slate-700">{template}</span>
                </div>
                <button className="text-sm font-semibold text-cyan-600 transition hover:text-cyan-700">Generate</button>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
