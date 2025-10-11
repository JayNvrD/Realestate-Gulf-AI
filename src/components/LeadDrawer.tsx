import React, { useState } from 'react';
import { Lead, Activity } from '../types/db';
import { X, Phone, Mail, MapPin, DollarSign, TrendingUp, Calendar, Plus } from 'lucide-react';

interface LeadDrawerProps {
  lead: Lead | null;
  activities: Activity[];
  onClose: () => void;
  onAddActivity: (type: 'note' | 'task' | 'status', message: string, dueAt?: string) => void;
}

export default function LeadDrawer({ lead, activities, onClose, onAddActivity }: LeadDrawerProps) {
  const [activityType, setActivityType] = useState<'note' | 'task' | 'status'>('note');
  const [activityMessage, setActivityMessage] = useState('');
  const [dueAt, setDueAt] = useState('');

  if (!lead) return null;

  const handleAddActivity = () => {
    if (!activityMessage.trim()) return;
    onAddActivity(activityType, activityMessage, activityType === 'task' ? dueAt : undefined);
    setActivityMessage('');
    setDueAt('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">{lead.full_name || 'Anonymous Lead'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {lead.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm">{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm">{lead.email}</span>
                </div>
              )}
              {lead.preferred_location && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm">{lead.preferred_location}</span>
                </div>
              )}
              {lead.budget > 0 && (
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm">${lead.budget.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Probability</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">3 Months</span>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.round(lead.conversion_probability['3m'] * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">6 Months</span>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.round(lead.conversion_probability['6m'] * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">9 Months</span>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.round(lead.conversion_probability['9m'] * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Activity</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['note', 'task', 'status'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActivityType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activityType === type
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <textarea
                value={activityMessage}
                onChange={(e) => setActivityMessage(e.target.value)}
                placeholder={`Enter ${activityType} details...`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                rows={3}
              />

              {activityType === 'task' && (
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              )}

              <button
                onClick={handleAddActivity}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add {activityType.charAt(0).toUpperCase() + activityType.slice(1)}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-gray-600 text-sm">No activities yet</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'note' ? 'bg-blue-100' :
                        activity.type === 'task' ? 'bg-amber-100' :
                        'bg-emerald-100'
                      }`}>
                        {activity.type === 'task' && <Calendar className="w-5 h-5 text-amber-600" />}
                        {activity.type === 'note' && <TrendingUp className="w-5 h-5 text-blue-600" />}
                        {activity.type === 'status' && <TrendingUp className="w-5 h-5 text-emerald-600" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600 uppercase">{activity.type}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      {activity.due_at && (
                        <p className="text-xs text-gray-600 mt-1">
                          Due: {new Date(activity.due_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
