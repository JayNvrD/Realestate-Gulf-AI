import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PublicLink } from '../types/db';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Copy, Eye, Edit, Trash2, Link as LinkIcon } from 'lucide-react';

export default function Links() {
  const { user } = useAuth();
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    assistantPrompt: '',
    model: 'gpt-4o-mini',
    avatarName: 'Estate Buddy',
    voice: 'en-US-JennyNeural',
    rateLimitPerMin: 10,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('public_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('public_links').insert({
        slug: formData.slug,
        title: formData.title,
        is_enabled: true,
        config: {
          assistantPrompt: formData.assistantPrompt,
          model: formData.model,
          avatarName: formData.avatarName,
          voice: formData.voice,
        },
        rate_limit_per_min: formData.rateLimitPerMin,
        created_by: user.id,
      });

      if (error) throw error;

      setShowForm(false);
      setFormData({
        slug: '',
        title: '',
        assistantPrompt: '',
        model: 'gpt-4o-mini',
        avatarName: 'Estate Buddy',
        voice: 'en-US-JennyNeural',
        rateLimitPerMin: 10,
      });
      loadLinks();
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Error creating link. Please check the slug is unique.');
    }
  };

  const handleToggleEnabled = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('public_links')
        .update({ is_enabled: !currentState })
        .eq('id', id);

      if (error) throw error;
      loadLinks();
    } catch (error) {
      console.error('Error toggling link:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const { error } = await supabase.from('public_links').delete().eq('id', id);
      if (error) throw error;
      loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/avatar/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading links...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Public Links</h1>
          <p className="text-gray-600">Create and manage shareable avatar links</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Link
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Public Link</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="property-showcase"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Property Showcase"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Prompt</label>
              <textarea
                value={formData.assistantPrompt}
                onChange={(e) => setFormData({ ...formData, assistantPrompt: e.target.value })}
                placeholder="You are Estate Buddy, a helpful real estate assistant..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar Name</label>
                <input
                  type="text"
                  value={formData.avatarName}
                  onChange={(e) => setFormData({ ...formData, avatarName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit/Min</label>
                <input
                  type="number"
                  value={formData.rateLimitPerMin}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerMin: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Create Link
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {links.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No public links created yet</p>
          </div>
        ) : (
          links.map((link) => (
            <div key={link.id} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{link.title}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        link.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {link.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <code className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      /avatar/{link.slug}
                    </code>
                    <button
                      onClick={() => copyToClipboard(link.slug)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Model</p>
                      <p className="font-medium text-gray-900">{link.config.model || 'gpt-4o-mini'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avatar</p>
                      <p className="font-medium text-gray-900">{link.config.avatarName || 'Estate Buddy'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rate Limit</p>
                      <p className="font-medium text-gray-900">{link.rate_limit_per_min}/min</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`/avatar/${link.slug}`, '_blank')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleToggleEnabled(link.id, link.is_enabled)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      link.is_enabled
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {link.is_enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
