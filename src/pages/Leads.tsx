import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, Activity } from '../types/db';
import LeadTable from '../components/LeadTable';
import LeadDrawer from '../components/LeadDrawer';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, Download } from 'lucide-react';

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadActivities, setLeadActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    return (
      lead.full_name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone.toLowerCase().includes(query) ||
      lead.preferred_location.toLowerCase().includes(query)
    );
  });

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Management</h1>
          <p className="text-gray-600">View and manage all your real estate leads</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, email, phone, or location..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="w-5 h-5" />
          Filters
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex gap-4 mb-4">
          <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium">
            All Leads ({filteredLeads.length})
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            High Intent ({filteredLeads.filter((l) => l.intent_level === 'high').length})
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            Qualified ({filteredLeads.filter((l) => l.stage === 'Qualified').length})
          </button>
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
