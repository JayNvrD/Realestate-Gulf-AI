import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PublicLink, AIAvatar } from '../types/db';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Copy, Eye, Edit, Trash2, Link as LinkIcon, X } from 'lucide-react';

export default function Links() {
  const { user } = useAuth();
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [avatars, setAvatars] = useState<AIAvatar[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    avatarId: '',
    model: 'gpt-4o-mini',
    rateLimitPerMin: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError('');
      const [linksRes, avatarsRes] = await Promise.all([
        supabase.from('public_links').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_avatars').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      ]);

      if (linksRes.error) throw linksRes.error;
      if (avatarsRes.error) throw avatarsRes.error;

      setLinks(linksRes.data || []);
      setAvatars(avatarsRes.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('public_links')
          .update({
            slug: formData.slug,
            title: formData.title,
            avatar_id: formData.avatarId || null,
            config: {
              model: formData.model,
            },
            rate_limit_per_min: formData.rateLimitPerMin,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('public_links').insert({
          slug: formData.slug,
          title: formData.title,
          is_enabled: true,
          avatar_id: formData.avatarId || null,
          config: {
            model: formData.model,
          },
          rate_limit_per_min: formData.rateLimitPerMin,
          created_by: user.id,
        });

        if (error) throw error;
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving link:', error);
      alert('Error saving link. Please check the slug is unique.');
    }
  };

  const handleEdit = (link: PublicLink) => {
    setEditingId(link.id);
    setFormData({
      slug: link.slug,
      title: link.title,
      avatarId: link.avatar_id || '',
      model: link.config.model || 'gpt-4o-mini',
      rateLimitPerMin: link.rate_limit_per_min,
    });
    setShowForm(true);
  };

  const handleToggleEnabled = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('public_links')
        .update({ is_enabled: !currentState })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling link:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const { error } = await supabase.from('public_links').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/avatar/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      slug: '',
      title: '',
      avatarId: '',
      model: 'gpt-4o-mini',
      rateLimitPerMin: 10,
    });
  };

  const getAvatarName = (avatarId: string | null) => {
    if (!avatarId) return 'No avatar';
    const avatar = avatars.find(a => a.id === avatarId);
    return avatar ? avatar.name : 'Unknown avatar';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading public links...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Public Links</h1>
          <p className="text-gray-600">
            Create shareable links for your AI avatars
            {links.length > 0 && <span className="ml-2 text-cyan-600 font-semibold">({links.length} link{links.length !== 1 ? 's' : ''})</span>}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Link
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800 mb-1">Error Loading Data</h4>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {avatars.length === 0 && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            No active avatars found. Please create an avatar first in the AI Avatars page.
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Public Link' : 'Create New Public Link'}
          </h3>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Avatar
                <span className="ml-2 text-xs text-gray-500">({avatars.length} available)</span>
              </label>
              <select
                value={formData.avatarId}
                onChange={(e) => setFormData({ ...formData, avatarId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
                disabled={avatars.length === 0}
              >
                <option value="">
                  {avatars.length === 0 ? 'No active avatars available' : 'Select an avatar...'}
                </option>
                {avatars.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.name} ({avatar.heygen_avatar_id})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                The avatar's system prompt will be used for this link. Only active avatars are shown.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                {editingId ? 'Update Link' : 'Create Link'}
              </button>
              <button
                type="button"
                onClick={resetForm}
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
                      <p className="text-gray-600">Avatar</p>
                      <p className="font-medium text-gray-900">{getAvatarName(link.avatar_id)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Model</p>
                      <p className="font-medium text-gray-900">{link.config.model || 'gpt-4o-mini'}</p>
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
                    onClick={() => handleEdit(link)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-5 h-5 text-gray-600" />
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
