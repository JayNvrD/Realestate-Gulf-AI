import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface ConversationRow {
  id: string;
  date_of_visit: string;
  person_name: string;
  conversation_summary: string;
  flat_specification: string;
  facing_preference: string;
  interest_level: string;
  period_to_buy: string;
  responsibility: string;
  key_action_points: string;
  preferred_floor: string;
}

const interestBadges: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-emerald-100 text-emerald-700',
};

export default function Conversations() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInterest, setFilterInterest] = useState('All');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('date_of_visit', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const matchesQuery =
        conv.person_name.toLowerCase().includes(query) ||
        conv.conversation_summary.toLowerCase().includes(query) ||
        conv.flat_specification.toLowerCase().includes(query) ||
        conv.responsibility.toLowerCase().includes(query);

      const matchesInterest = filterInterest === 'All' || conv.interest_level === filterInterest;
      return matchesQuery && matchesInterest;
    });
  }, [conversations, searchQuery, filterInterest]);

  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage) || 1;
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentConversations = filteredConversations.slice(startIndex, endIndex);

  const handleExport = () => {
    const headers = [
      'Date of Visit',
      'Person Name',
      'Conversation Summary',
      'Flat Specification',
      'Facing Preference',
      'Interest Level',
      'Period to Buy',
      'Responsibility',
      'Key Action Points',
      'Preferred Floor',
    ];

    const csvData = [
      headers.join(','),
      ...filteredConversations.map((conv) =>
        [
          new Date(conv.date_of_visit).toLocaleDateString(),
          conv.person_name,
          `"${conv.conversation_summary.replace(/"/g, '""')}"`,
          conv.flat_specification,
          conv.facing_preference,
          conv.interest_level,
          conv.period_to_buy,
          conv.responsibility,
          conv.key_action_points,
          conv.preferred_floor,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Loading conversations...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Engagement</p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-fluid-3xl">Conversations</h1>
          <p className="text-sm text-slate-500">Detailed consultation tracking and follow-up management.</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, summary, flat type, or owner"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={filterInterest}
              onChange={(e) => setFilterInterest(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="All">All Interest Levels</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Showing {filteredConversations.length === 0 ? 0 : startIndex + 1}–
          {Math.min(endIndex, filteredConversations.length)} of {filteredConversations.length} conversations
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date of Visit</th>
                <th className="px-4 py-3">Person Name</th>
                <th className="px-4 py-3 min-w-[320px]">Conversation Summary</th>
                <th className="px-4 py-3">Flat Specification</th>
                <th className="px-4 py-3">Facing Preference</th>
                <th className="px-4 py-3">Interest Level</th>
                <th className="px-4 py-3">Period to Buy</th>
                <th className="px-4 py-3">Responsibility</th>
                <th className="px-4 py-3 min-w-[220px]">Key Action Points</th>
                <th className="px-4 py-3">Preferred Floor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {currentConversations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No conversations found
                  </td>
                </tr>
              ) : (
                currentConversations.map((conv) => (
                  <tr key={conv.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">
                      {new Date(conv.date_of_visit).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{conv.person_name}</td>
                    <td className="px-4 py-3 leading-relaxed">{conv.conversation_summary}</td>
                    <td className="px-4 py-3">{conv.flat_specification}</td>
                    <td className="px-4 py-3">{conv.facing_preference}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        interestBadges[conv.interest_level] || interestBadges.Medium
                      }`}
                      >
                        {conv.interest_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">{conv.period_to_buy}</td>
                    <td className="px-4 py-3">{conv.responsibility}</td>
                    <td className="px-4 py-3">{conv.key_action_points}</td>
                    <td className="px-4 py-3">{conv.preferred_floor}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 p-4 lg:hidden">
          {currentConversations.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No conversations found</p>
          ) : (
            currentConversations.map((conv) => (
              <article
                key={conv.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{conv.person_name}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(conv.date_of_visit).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      interestBadges[conv.interest_level] || interestBadges.Medium
                    }`}
                  >
                    {conv.interest_level}
                  </span>
                </header>

                <p className="mt-3 text-sm text-slate-700">{conv.conversation_summary}</p>

                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Flat Specification</dt>
                    <dd className="mt-1">{conv.flat_specification}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Facing Preference</dt>
                    <dd className="mt-1">{conv.facing_preference}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Responsibility</dt>
                    <dd className="mt-1">{conv.responsibility}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Period to Buy</dt>
                    <dd className="mt-1">{conv.period_to_buy}</dd>
                  </div>
                </dl>

                <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">Key Action Points</summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{conv.key_action_points}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                    Preferred Floor: <span className="text-slate-600">{conv.preferred_floor}</span>
                  </p>
                </details>
              </article>
            ))
          )}
        </div>
      </section>

      {totalPages > 1 && (
        <nav className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Page {currentPageSafe} of {totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPageSafe === 1}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPageSafe === totalPages}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
