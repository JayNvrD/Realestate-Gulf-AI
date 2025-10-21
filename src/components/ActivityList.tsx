import React from 'react';
import { Activity } from '../types/db';
import { Calendar, FileText, TrendingUp } from 'lucide-react';

interface ActivityListProps {
  activities: Activity[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return Calendar;
      case 'note':
        return FileText;
      case 'status':
        return TrendingUp;
      default:
        return FileText;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'bg-amber-100 text-amber-600';
      case 'note':
        return 'bg-blue-100 text-blue-600';
      case 'status':
        return 'bg-emerald-100 text-emerald-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  if (activities.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No recent activities</p>;
  }

  return (
    <ul className="space-y-4">
      {activities.map((activity) => {
        const Icon = getIcon(activity.type);
        return (
          <li
            key={activity.id}
            className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition hover:bg-slate-100 sm:flex-row sm:items-center"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center self-start rounded-full sm:self-center ${getIconColor(
                activity.type,
              )}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <span>{activity.type}</span>
                <span className="text-slate-400">{new Date(activity.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-700">{activity.message}</p>
              {activity.due_at && (
                <p className="text-xs text-slate-500">Due: {new Date(activity.due_at).toLocaleString()}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
