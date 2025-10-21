import React, { useEffect, useMemo, useState } from 'react';
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
  const [copySuccess, setCopySuccess] = useState('');

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
    } catch (loadError: any) {
      console.error('Error loading data:', loadError);
      setError(loadError.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('public_links')
          .update({
            slug: formData.slug,
            title: formData.title,
            avatar_id: formData.avatarId || null,
            config: { model: formData.model },
            rate_limit_per_min: formData.rateLimitPerMin,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('public_links').insert({
          slug: formData.slug,
          title: formData.title,
          is_enabled: true,
          avatar_id: formData.avatarId || null,
          config: { model: formData.model },
          rate_limit_per_min: formData.rateLimitPerMin,
          created_by: user.id,
        });

        if (insertError) throw insertError;
      }

      resetForm();
      loadData();
    } catch (submitError) {
      console.error('Error saving link:', submitError);
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
      const { error: toggleError } = await supabase
        .from('public_links')
        .update({ is_enabled: !currentState })
        .eq('id', id);

      if (toggleError) throw toggleError;
      loadData();
    } catch (toggleError) {
      console.error('Error toggling link:', toggleError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const { error: deleteError } = await supabase.from('public_links').delete().eq('id', id);
      if (deleteError) throw deleteError;
      loadData();
    } catch (deleteError) {
      console.error('Error deleting link:', deleteError);
    }
  };

  const copyToClipboard = async (slug: string) => {
    const url = `${window.location.origin}/avatar/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess('Link copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (copyError) {
      console.error('Copy failed', copyError);
    }
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
    const avatar = avatars.find((item) => item.id === avatarId);
    return avatar ? avatar.name : 'Unknown avatar';
  };

  const linkCountLabel = useMemo(() => {
    if (links.length === 0) return 'No links yet';
    return `${links.length} link${links.length === 1 ? '' : 's'}`;
  }, [links.length]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-sm text-slate-500">Loading public links...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Distribution</p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-fluid-3xl">Public Links</h1>
          <p className="text-sm text-slate-500">
            Create shareable links for your AI avatars.
            <span className="ml-2 font-semibold text-cyan-600">{linkCountLabel}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-700"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Hide Form' : 'Create Link'}
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <X className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold">Error loading data</p>
            <p>{error}</p>
            <button onClick={loadData} className="font-semibold text-red-600 underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {copySuccess && <p className="text-xs font-semibold text-emerald-600">{copySuccess}</p>}

      {avatars.length === 0 && !error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          No active avatars found. Please create an avatar first in the AI Avatars page.
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Public Link' : 'Create New Public Link'}</h3>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                URL Slug
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="property-showcase"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Title
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Property Showcase"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                AI Avatar
                <span className="ml-2 text-xs text-slate-400">{avatars.length} available</span>
              </label>
              <select
                value={formData.avatarId}
                onChange={(e) => setFormData({ ...formData, avatarId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
                disabled={avatars.length === 0}
              >
                <option value="">{avatars.length === 0 ? 'No active avatars available' : 'Select an avatar…'}</option>
                {avatars.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.name} ({avatar.heygen_avatar_id})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">The avatar's system prompt will be used for this link.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Model
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Rate Limit/Min
                <input
                  type="number"
                  value={formData.rateLimitPerMin}
                  onChange={(e) => setFormData({ ...formData, rateLimitPerMin: parseInt(e.target.value, 10) || 1 })}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  min={1}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-600"
              >
                {editingId ? 'Update Link' : 'Create Link'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="grid gap-4">
        {links.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <LinkIcon className="mx-auto h-16 w-16 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">No public links created yet.</p>
          </div>
        ) : (
          links.map((link) => (
            <article
              key={link.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
            >
              <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{link.title}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        link.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {link.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <code className="rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-700">/avatar/{link.slug}</code>
                    <button
                      onClick={() => copyToClipboard(link.slug)}
                      className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-cyan-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => window.open(`/avatar/${link.slug}`, '_blank')}
                      className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-cyan-700"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid-cols-3">
                    <div>
                      <p>Avatar</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{getAvatarName(link.avatar_id)}</p>
                    </div>
                    <div>
                      <p>Model</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{link.config.model || 'gpt-4o-mini'}</p>
                    </div>
                    <div>
                      <p>Rate Limit</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{link.rate_limit_per_min}/min</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                  <button
                    onClick={() => handleEdit(link)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleEnabled(link.id, link.is_enabled)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      link.is_enabled
                        ? 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700'
                        : 'border border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800'
                    }`}
                  >
                    {link.is_enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </header>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
