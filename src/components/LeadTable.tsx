import React from 'react';
import { Lead } from '../types/db';
import { Eye } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const badgeStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-emerald-100 text-emerald-700',
};

const stageStyles: Record<string, string> = {
  New: 'bg-cyan-100 text-cyan-700',
  Qualified: 'bg-blue-100 text-blue-700',
  'Site Visit': 'bg-teal-100 text-teal-700',
  Negotiation: 'bg-amber-100 text-amber-700',
  Closed: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-slate-100 text-slate-600',
};

export default function LeadTable({ leads, onSelectLead }: LeadTableProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Budget</th>
                <th className="px-6 py-3">Intent</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {leads.map((lead) => (
                <tr key={lead.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{lead.full_name || 'Anonymous'}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {lead.phone && <p className="text-sm">{lead.phone}</p>}
                      {lead.email && <p className="text-xs text-slate-500">{lead.email}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">{lead.preferred_location || '-'}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {lead.budget ? `$${lead.budget.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        badgeStyles[lead.intent_level] || badgeStyles.medium
                      }`}
                    >
                      {lead.intent_level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        stageStyles[lead.stage] || stageStyles.New
                      }`}
                    >
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onSelectLead(lead)}
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 px-3 py-1.5 text-sm font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-50"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 p-4 lg:hidden">
          {leads.map((lead) => (
            <article
              key={lead.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{lead.full_name || 'Anonymous Lead'}</h3>
                  <p className="text-xs text-slate-500">
                    Added {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span
                    className={`rounded-full px-2.5 py-1 ${badgeStyles[lead.intent_level] || badgeStyles.medium}`}
                  >
                    {lead.intent_level}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 ${stageStyles[lead.stage] || stageStyles.New}`}>
                    {lead.stage}
                  </span>
                </div>
              </header>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                {(lead.phone || lead.email) && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Contact</dt>
                    <dd className="mt-1 space-y-1">
                      {lead.phone && <p>{lead.phone}</p>}
                      {lead.email && <p className="text-xs text-slate-500">{lead.email}</p>}
                    </dd>
                  </div>
                )}
                {lead.preferred_location && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Location</dt>
                    <dd className="mt-1">{lead.preferred_location}</dd>
                  </div>
                )}
                {lead.property_type && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Property</dt>
                    <dd className="mt-1">{lead.property_type}</dd>
                  </div>
                )}
                {lead.budget ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Budget</dt>
                    <dd className="mt-1 font-semibold text-slate-900">${lead.budget.toLocaleString()}</dd>
                  </div>
                ) : null}
              </dl>

              <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => onSelectLead(lead)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-600 sm:flex-none sm:px-5"
                >
                  <Eye className="h-4 w-4" />
                  Open Details
                </button>
              </footer>
            </article>
          ))}
          {leads.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No leads found</p>}
        </div>
      </div>
    </section>
  );
}
