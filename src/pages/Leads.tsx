import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, Activity } from '../types/db';
import LeadTable from '../components/LeadTable';
import LeadDrawer from '../components/LeadDrawer';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, Download } from 'lucide-react';

const segmentFilters = [
  { id: 'all', label: 'All Leads' },
  { id: 'high-intent', label: 'High Intent' },
  { id: 'qualified', label: 'Qualified' },
];

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadActivities, setLeadActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      loadLeadActivities(selectedLead.id);
    }
  }, [selectedLead]);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeadActivities = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeadActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleAddActivity = async (type: 'note' | 'task' | 'status', message: string, dueAt?: string) => {
    if (!selectedLead || !user) return;

    try {
      const { error } = await supabase.from('activities').insert({
        lead_id: selectedLead.id,
        type,
        message,
        due_at: dueAt || null,
        created_by: user.id,
      });

      if (error) throw error;
      loadLeadActivities(selectedLead.id);
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const filteredLeads = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return leads.filter((lead) => {
      const matchesQuery =
        lead.full_name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.phone.toLowerCase().includes(query) ||
        lead.preferred_location.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (activeSegment === 'high-intent') {
        return lead.intent_level === 'high';
      }
      if (activeSegment === 'qualified') {
        return lead.stage === 'Qualified';
      }

      return true;
    });
  }, [leads, searchQuery, activeSegment]);

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Location', 'Budget', 'Intent', 'Stage', 'Created'],
      ...filteredLeads.map((lead) => [
        lead.full_name,
        lead.email,
        lead.phone,
        lead.preferred_location,
        lead.budget.toString(),
        lead.intent_level,
        lead.stage,
        new Date(lead.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Loading leads...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Pipeline</p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-fluid-3xl">Lead Management</h1>
          <p className="text-sm text-slate-500">View and manage all your real estate leads with quick filters and actions.</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, or location"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {segmentFilters.map((segment) => {
            const isActive = activeSegment === segment.id;
            const count =
              segment.id === 'all'
                ? filteredLeads.length
                : segment.id === 'high-intent'
                ? filteredLeads.filter((l) => l.intent_level === 'high').length
                : filteredLeads.filter((l) => l.stage === 'Qualified').length;
            return (
              <button
                key={segment.id}
                onClick={() => setActiveSegment(segment.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {segment.label}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-white/20' : 'bg-white text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <LeadTable leads={filteredLeads} onSelectLead={setSelectedLead} />

      <LeadDrawer
        lead={selectedLead}
        activities={leadActivities}
        onClose={() => setSelectedLead(null)}
        onAddActivity={handleAddActivity}
        onLeadUpdated={loadLeads}
      />
    </div>
  );
}
