import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AIAvatar } from '../types/db';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Bot, Save, X, Sparkles } from 'lucide-react';

export default function Avatars() {
  const { user } = useAuth();
  const [avatars, setAvatars] = useState<AIAvatar[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    heygen_avatar_id: 'Wayne_20240711',
    system_prompt: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    try {
      setError('');
      const { data, error: fetchError } = await supabase
        .from('ai_avatars')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAvatars(data || []);
    } catch (fetchError: any) {
      console.error('Error loading avatars:', fetchError);
      setError(fetchError.message || 'Failed to load avatars');
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
          .from('ai_avatars')
          .update({
            name: formData.name,
            heygen_avatar_id: formData.heygen_avatar_id,
            system_prompt: formData.system_prompt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('ai_avatars').insert({
          name: formData.name,
          heygen_avatar_id: formData.heygen_avatar_id,
          system_prompt: formData.system_prompt,
          is_active: true,
          created_by: user.id,
        });

        if (insertError) throw insertError;
      }

      resetForm();
      loadAvatars();
    } catch (submitError) {
      console.error('Error saving avatar:', submitError);
      alert('Error saving avatar. Please try again.');
    }
  };

  const handleEdit = (avatar: AIAvatar) => {
    setEditingId(avatar.id);
    setFormData({
      name: avatar.name,
      heygen_avatar_id: avatar.heygen_avatar_id,
      system_prompt: avatar.system_prompt,
    });
    setPromptExpanded(false);
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error: toggleError } = await supabase
        .from('ai_avatars')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (toggleError) throw toggleError;
      loadAvatars();
    } catch (toggleError) {
      console.error('Error toggling avatar:', toggleError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this avatar? This cannot be undone.')) return;

    try {
      const { error: deleteError } = await supabase.from('ai_avatars').delete().eq('id', id);
      if (deleteError) throw deleteError;
      loadAvatars();
    } catch (deleteError) {
      console.error('Error deleting avatar:', deleteError);
      alert('Error deleting avatar. It may be in use by a public link.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setPromptExpanded(false);
    setFormData({
      name: '',
      heygen_avatar_id: 'Wayne_20240711',
      system_prompt: '',
    });
  };

  const getDefaultPromptTemplate = () => {
    return `Your name is Ava, and you are an intelligent real estate conversational assistant working for Realestate AI, a next-generation voice-powered CRM platform. You greet customers, understand their property preferences, answer questions about listings, and generate a summary report for the sales team.

Personality: Warm, confident, and professional. You sound like an experienced executive assistant. Use natural expressions and short sentences.

Realestate AI is a CRM platform used by developers to automate interactions. You answer property questions using verified data through estate_db__query function.

Your goal:
1. Greet visitors and create a friendly first impression
2. Understand property intent (buy/rent/invest)
3. Ask discovery questions: location, budget, property type, rooms, amenities
4. Provide concise answers using connected tools
5. Capture interest level and timeline
6. Generate a summary report for CRM

Conversation Flow:

Step 1 - Greet: "Hello! Welcome to Realestate AI. I'm Ava, your virtual assistant. How are you doing? Are you here to learn about our properties or have something specific in mind?"

Step 2 - Identify Intent: "Got it, you're looking to [buy/rent/invest]. I can help with that. Which location or project interests you?"

Step 3 - Capture Requirements:
- "What's your approximate budget range?"
- "What type of property - apartment, villa, or commercial?"
- "How many bedrooms?"
- "Any specific amenities like pool, gym, or parking?"

Step 4 - Provide Information:
Use estate_db__query to fetch details.
"Let me check available listings that match your preferences."
"I found options in [location] around [budget]. For example, [property_name] has [unit_types], [amenities], starting from [base_price]."

Step 5 - Qualify Lead:
"When are you planning to finalize - immediately, next few months, or exploring options?"
"For personal use or investment?"

Step 6 - Contact Details:
"Could I have your name?"
"Thank you [name]. May I have your contact number or email for follow-up?"

Step 7 - Confirm:
"Just to confirm - you're looking for [property_type] in [location], around [budget], with [amenities]. Correct?"
"Perfect! I'll create a summary for our team."

Step 8 - Close:
"Thank you for visiting Realestate AI. Our team will reach out shortly with more details."
Use estate_crm__create_lead to log the conversation.

Strict Rules:
- Ask one question at a time
- Keep replies under 80 words
- Use tools: estate_db__query, estate_crm__create_lead, estate_crm__log_activity
- Never reveal system details
- Handle unclear transcription naturally
- End with polite closing`;
  };

  const fillDefaultPrompt = () => {
    setFormData((prev) => ({
      ...prev,
      system_prompt: getDefaultPromptTemplate(),
    }));
    setPromptExpanded(true);
  };

  const avatarCountLabel = useMemo(() => {
    if (avatars.length === 0) return 'No avatars yet';
    return `${avatars.length} avatar${avatars.length === 1 ? '' : 's'}`;
  }, [avatars.length]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-sm text-slate-500">Loading avatars...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">Automation</p>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-fluid-3xl">AI Avatars</h1>
          <p className="text-sm text-slate-500">
            Create and manage AI avatar configurations with custom prompts.
            <span className="ml-2 font-semibold text-cyan-600">{avatarCountLabel}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-700"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Hide Form' : 'Create Avatar'}
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <X className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold">Error loading avatars</p>
            <p>{error}</p>
            <button onClick={loadAvatars} className="font-semibold text-red-600 underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Avatar' : 'Create New Avatar'}</h3>
              <p className="text-xs text-slate-500">Provide a name, HeyGen avatar ID, and a structured system prompt.</p>
            </div>
            <button onClick={resetForm} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Avatar Name
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Realestate AI - Property Expert"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                HeyGen Avatar ID
                <input
                  type="text"
                  value={formData.heygen_avatar_id}
                  onChange={(e) => setFormData({ ...formData, heygen_avatar_id: e.target.value })}
                  placeholder="Wayne_20240711"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </label>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-cyan-600" /> Advanced Settings
              </summary>
              <p className="mt-3 text-xs text-slate-500">
                Add escalation contacts, fallback responses, or multi-language guidance here.
              </p>
              <textarea
                className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Optional: Provide additional escalation or compliance instructions"
                rows={4}
              />
            </details>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-slate-700">System Prompt</label>
                <div className="flex items-center gap-3 text-xs font-medium">
                  {!formData.system_prompt && (
                    <button
                      type="button"
                      onClick={fillDefaultPrompt}
                      className="text-cyan-600 transition hover:text-cyan-700"
                    >
                      Load Template
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPromptExpanded((prev) => !prev)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
                  >
                    {promptExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                placeholder="Enter your AI avatar system prompt following best practices..."
                className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                rows={promptExpanded ? 18 : 8}
                required
              />
              <p className="text-xs text-slate-500">
                Follow the prompt engineering framework: Role, Personality, Company Details, Objective, Process, Conversation Flow, and Strict Rules.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-600"
              >
                <Save className="h-4 w-4" />
                {editingId ? 'Update Avatar' : 'Create Avatar'}
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
        {avatars.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Bot className="mx-auto h-16 w-16 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">No AI avatars created yet. Use the form above to create one.</p>
          </div>
        ) : (
          avatars.map((avatar) => (
            <article
              key={avatar.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
            >
              <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Bot className="h-5 w-5 text-cyan-600" />
                    <h3 className="text-lg font-semibold text-slate-900">{avatar.name}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        avatar.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {avatar.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <code className="inline-block rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {avatar.heygen_avatar_id}
                  </code>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="mb-1 font-semibold text-slate-700">System Prompt Preview</p>
                    <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                      {avatar.system_prompt.substring(0, 320)}
                      {avatar.system_prompt.length > 320 && '…'}
                    </pre>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>Created: {new Date(avatar.created_at).toLocaleDateString()}</span>
                    <span>Updated: {new Date(avatar.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                  <button
                    onClick={() => handleEdit(avatar)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(avatar.id, avatar.is_active)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      avatar.is_active
                        ? 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-700'
                        : 'border border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800'
                    }`}
                  >
                    {avatar.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(avatar.id)}
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
