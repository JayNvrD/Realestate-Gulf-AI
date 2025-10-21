import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPIProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor: string;
  className?: string;
}

export default function KPI({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor,
  className = '',
}: KPIProps) {
  const changeColors: Record<string, string> = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-slate-600 bg-slate-100',
  };

  return (
    <div
      className={`flex min-h-[10rem] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[8rem] flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{value}</p>
          {change && (
            <span
              className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${changeColors[changeType]}`}
            >
              {change}
            </span>
          )}
        </div>
        <div className={`${iconColor} rounded-xl p-3 text-white shadow-inner`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
