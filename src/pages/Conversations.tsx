import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Conversation } from '../types/db';
import { Search, Download, MessageSquare } from 'lucide-react';

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.transcript.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSentimentBadge = (sentiment?: string) => {
    const colors = {
      positive: 'bg-emerald-100 text-emerald-700',
      neutral: 'bg-gray-100 text-gray-700',
      negative: 'bg-red-100 text-red-700',
    };
    return colors[sentiment as keyof typeof colors] || colors.neutral;
  };

  const handleExport = () => {
    const csv = [
      ['Started', 'Duration', 'Sentiment', 'Transcript Preview'],
      ...filteredConversations.map((conv) => [
        new Date(conv.started_at).toLocaleString(),
        conv.ended_at
          ? Math.round((new Date(conv.ended_at).getTime() - new Date(conv.started_at).getTime()) / 1000 / 60) + ' min'
          : 'Ongoing',
        conv.sentiment_topics?.sentiment || 'N/A',
        conv.transcript.substring(0, 100).replace(/,/g, ';'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Conversations</h1>
          <p className="text-gray-600">Review all avatar interactions and transcripts</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div key={conv.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(conv.started_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {conv.ended_at
                          ? `Duration: ${Math.round(
                              (new Date(conv.ended_at).getTime() - new Date(conv.started_at).getTime()) / 1000 / 60
                            )} min`
                          : 'Ongoing'}
                      </p>
                    </div>
                  </div>
                  {conv.sentiment_topics?.sentiment && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentBadge(
                        conv.sentiment_topics.sentiment
                      )}`}
                    >
                      {conv.sentiment_topics.sentiment}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{conv.transcript || 'No transcript available'}</p>
                {conv.sentiment_topics?.topics && conv.sentiment_topics.topics.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {conv.sentiment_topics.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
