import React, { useEffect, useState } from 'react';
import { Lead, Activity } from '../types/db';
import {
  X,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  TrendingUp,
  Calendar,
  Plus,
  Edit2,
  Save,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LeadDrawerProps {
  lead: Lead | null;
  activities: Activity[];
  onClose: () => void;
  onAddActivity: (type: 'note' | 'task' | 'status', message: string, dueAt?: string) => void;
  onLeadUpdated: () => void;
}

export default function LeadDrawer({ lead, activities, onClose, onAddActivity, onLeadUpdated }: LeadDrawerProps) {
  const [activityType, setActivityType] = useState<'note' | 'task' | 'status'>('note');
  const [activityMessage, setActivityMessage] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>(lead || {});

  useEffect(() => {
    setEditedLead(lead || {});
    setIsEditing(false);
  }, [lead]);

  if (!lead) return null;

  const handleAddActivity = () => {
    if (!activityMessage.trim()) return;
    onAddActivity(activityType, activityMessage, activityType === 'task' ? dueAt : undefined);
    setActivityMessage('');
    setDueAt('');
  };

  const handleSave = async () => {
    if (!lead) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          full_name: editedLead.full_name,
          phone: editedLead.phone,
          email: editedLead.email,
          property_type: editedLead.property_type,
          preferred_location: editedLead.preferred_location,
          budget: editedLead.budget,
          intent_level: editedLead.intent_level,
          stage: editedLead.stage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (error) throw error;

      setIsEditing(false);
      onLeadUpdated();
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedLead(lead);
    }
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />

      <aside className="safe-area-bottom absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{lead.full_name || 'Anonymous Lead'}</h2>
            <p className="text-xs text-slate-500">Last updated {new Date(lead.updated_at).toLocaleString()}</p>
          </div>
          <div className="hidden items-center gap-2 text-sm font-medium sm:flex">
            {!isEditing ? (
              <button
                onClick={handleEditToggle}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-100 px-4 py-2 text-cyan-700 transition hover:bg-cyan-200"
              >
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={handleEditToggle}
                  disabled={isSaving}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="grid gap-6">
            <section className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {isEditing ? (
                  <>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Full Name
                      <input
                        type="text"
                        value={editedLead.full_name || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, full_name: e.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Phone
                      <input
                        type="tel"
                        value={editedLead.phone || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Email
                      <input
                        type="email"
                        value={editedLead.email || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Preferred Location
                      <input
                        type="text"
                        value={editedLead.preferred_location || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, preferred_location: e.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Property Type
                      <input
                        type="text"
                        value={editedLead.property_type || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, property_type: e.target.value })}
                        placeholder="e.g., Apartment, Villa"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Budget
                      <input
                        type="number"
                        value={editedLead.budget || 0}
                        onChange={(e) => setEditedLead({ ...editedLead, budget: parseFloat(e.target.value) })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Intent Level
                      <select
                        value={editedLead.intent_level || 'medium'}
                        onChange={(e) => setEditedLead({ ...editedLead, intent_level: e.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Stage
                      <select
                        value={editedLead.stage || 'New'}
                        onChange={(e) => setEditedLead({ ...editedLead, stage: e.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed">Closed</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-2">
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-cyan-600" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-cyan-600" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                    {lead.preferred_location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-cyan-600" />
                        <span>{lead.preferred_location}</span>
                      </div>
                    )}
                    {lead.budget > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-cyan-600" />
                        <span>${lead.budget.toLocaleString()}</span>
                      </div>
                    )}
                    {lead.property_type && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-cyan-600" />
                        <span>{lead.property_type}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>Intent</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          lead.intent_level === 'high'
                            ? 'bg-emerald-100 text-emerald-700'
                            : lead.intent_level === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lead.intent_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span>Stage</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          lead.stage === 'Closed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : lead.stage === 'Lost'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {lead.stage}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Conversion Probability</h3>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {(['3m', '6m', '9m'] as const).map((range) => (
                  <div key={range} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
                      <span>{range === '3m' ? '3 Months' : range === '6m' ? '6 Months' : '9 Months'}</span>
                      <span className="text-slate-500">
                        {Math.round(lead.conversion_probability[range] * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                        style={{ width: `${lead.conversion_probability[range] * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Add Activity</h3>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(['note', 'task', 'status'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setActivityType(type)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        activityType === type
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      type="button"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                <textarea
                  value={activityMessage}
                  onChange={(e) => setActivityMessage(e.target.value)}
                  placeholder={`Enter ${activityType} details...`}
                  className="min-h-[7rem] w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:min-h-[9rem]"
                />

                {activityType === 'task' && (
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                )}

                <button
                  onClick={handleAddActivity}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-600"
                >
                  <Plus className="h-5 w-5" />
                  Add {activityType.charAt(0).toUpperCase() + activityType.slice(1)}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">Activity Timeline</h3>
              <div className="mt-4 space-y-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-slate-500">No activities yet</p>
                ) : (
                  activities.map((activity) => (
                    <article key={activity.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-start">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          activity.type === 'note'
                            ? 'bg-blue-100'
                            : activity.type === 'task'
                            ? 'bg-amber-100'
                            : 'bg-emerald-100'
                        }`}
                      >
                        {activity.type === 'task' && <Calendar className="h-5 w-5 text-amber-600" />}
                        {activity.type === 'note' && <TrendingUp className="h-5 w-5 text-blue-600" />}
                        {activity.type === 'status' && <TrendingUp className="h-5 w-5 text-emerald-600" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          <span>{activity.type}</span>
                          <span className="text-slate-400">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{activity.message}</p>
                        {activity.due_at && (
                          <p className="text-xs text-slate-500">
                            Due: {new Date(activity.due_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white px-5 py-4 shadow-[0_-6px_18px_rgba(15,23,42,0.08)] sm:hidden">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
          <button
            onClick={handleEditToggle}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${
              isEditing ? 'bg-slate-900 text-white' : 'bg-cyan-600 text-white'
            }`}
            disabled={isSaving}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
