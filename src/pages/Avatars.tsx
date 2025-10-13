import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AIAvatar } from '../types/db';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Bot, Save, X } from 'lucide-react';

export default function Avatars() {
  const { user } = useAuth();
  const [avatars, setAvatars] = useState<AIAvatar[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
      const { data, error } = await supabase
        .from('ai_avatars')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvatars(data || []);
    } catch (error: any) {
      console.error('Error loading avatars:', error);
      setError(error.message || 'Failed to load avatars');
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
          .from('ai_avatars')
          .update({
            name: formData.name,
            heygen_avatar_id: formData.heygen_avatar_id,
            system_prompt: formData.system_prompt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_avatars').insert({
          name: formData.name,
          heygen_avatar_id: formData.heygen_avatar_id,
          system_prompt: formData.system_prompt,
          is_active: true,
          created_by: user.id,
        });

        if (error) throw error;
      }

      resetForm();
      loadAvatars();
    } catch (error) {
      console.error('Error saving avatar:', error);
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
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_avatars')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      loadAvatars();
    } catch (error) {
      console.error('Error toggling avatar:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this avatar? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from('ai_avatars').delete().eq('id', id);
      if (error) throw error;
      loadAvatars();
    } catch (error) {
      console.error('Error deleting avatar:', error);
      alert('Error deleting avatar. It may be in use by a public link.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
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
    setFormData({
      ...formData,
      system_prompt: getDefaultPromptTemplate(),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading avatars...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Avatars</h1>
          <p className="text-gray-600">
            Create and manage AI avatar configurations with custom prompts
            {avatars.length > 0 && <span className="ml-2 text-cyan-600 font-semibold">({avatars.length} avatar{avatars.length !== 1 ? 's' : ''})</span>}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Avatar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800 mb-1">Error Loading Avatars</h4>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadAvatars}
              className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Avatar' : 'Create New Avatar'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Realestate AI - Property Expert"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HeyGen Avatar ID</label>
                <input
                  type="text"
                  value={formData.heygen_avatar_id}
                  onChange={(e) => setFormData({ ...formData, heygen_avatar_id: e.target.value })}
                  placeholder="Wayne_20240711"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">System Prompt</label>
                {!formData.system_prompt && (
                  <button
                    type="button"
                    onClick={fillDefaultPrompt}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Load Template
                  </button>
                )}
              </div>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                placeholder="Enter your AI avatar system prompt following best practices..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none font-mono text-sm"
                rows={20}
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Follow the prompt engineering framework: Role, Personality, Company Details, Objective, Process, Conversation Flow, and Strict Rules.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update Avatar' : 'Create Avatar'}
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
        {avatars.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No AI avatars created yet</p>
            <p className="text-sm text-gray-500">Create your first avatar to get started</p>
          </div>
        ) : (
          avatars.map((avatar) => (
            <div key={avatar.id} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Bot className="w-5 h-5 text-cyan-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{avatar.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        avatar.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {avatar.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mb-3">
                    <code className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      {avatar.heygen_avatar_id}
                    </code>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">System Prompt Preview:</p>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {avatar.system_prompt.substring(0, 300)}
                        {avatar.system_prompt.length > 300 && '...'}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Created: {new Date(avatar.created_at).toLocaleDateString()}</span>
                    <span>Updated: {new Date(avatar.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(avatar)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit Avatar"
                  >
                    <Edit className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(avatar.id, avatar.is_active)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      avatar.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {avatar.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(avatar.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Avatar"
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
