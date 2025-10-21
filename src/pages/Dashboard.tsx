import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import KPI from '../components/KPI';
import ChartCard from '../components/ChartCard';
import ActivityList from '../components/ActivityList';
import { Users, TrendingUp, Target, Award } from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { LeadOverview, IntentCount, ConversionAvgs, Activity } from '../types/db';

export default function Dashboard() {
  const [overview, setOverview] = useState<LeadOverview | null>(null);
  const [intentCounts, setIntentCounts] = useState<IntentCount[]>([]);
  const [conversionAvgs, setConversionAvgs] = useState<ConversionAvgs | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [overviewRes, intentRes, conversionRes, activitiesRes] = await Promise.all([
        supabase.from('lead_overview').select('*').maybeSingle(),
        supabase.from('insight_intent_counts').select('*'),
        supabase.from('insight_conversion_avgs').select('*').maybeSingle(),
        supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      if (overviewRes.data) setOverview(overviewRes.data);
      if (intentRes.data) setIntentCounts(intentRes.data);
      if (conversionRes.data) setConversionAvgs(conversionRes.data);
      if (activitiesRes.data) setRecentActivities(activitiesRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const intentChartData = useMemo(
    () =>
      intentCounts.map((item) => ({
        name: item.intent_level,
        value: item.count,
      })),
    [intentCounts],
  );

  const conversionChartData = useMemo(() => {
    if (!conversionAvgs) return [];
    return [
      { period: '3 Months', probability: Math.round((conversionAvgs.avg_3m || 0) * 100) },
      { period: '6 Months', probability: Math.round((conversionAvgs.avg_6m || 0) * 100) },
      { period: '9 Months', probability: Math.round((conversionAvgs.avg_9m || 0) * 100) },
    ];
  }, [conversionAvgs]);

  const COLORS = ['#06b6d4', '#3b82f6', '#6366f1', '#10b981', '#f59e0b'];

  const highIntentPercent = overview
    ? overview.total_leads > 0
      ? Math.round((overview.high_intent / overview.total_leads) * 100)
      : 0
    : 0;

  const avgConversion = conversionAvgs
    ? Math.round(((conversionAvgs.avg_3m + conversionAvgs.avg_6m + conversionAvgs.avg_9m) / 3) * 100)
    : 0;

  const kpis = [
    {
      title: 'New Leads Today',
      value: overview?.new_today || 0,
      change: '+12% from yesterday',
      changeType: 'positive' as const,
      icon: Users,
      iconColor: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    },
    {
      title: 'High Intent',
      value: `${highIntentPercent}%`,
      change: `${overview?.high_intent || 0} leads`,
      changeType: 'positive' as const,
      icon: Target,
      iconColor: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    {
      title: 'Avg Conversion',
      value: `${avgConversion}%`,
      change: '3-9 month outlook',
      changeType: 'neutral' as const,
      icon: TrendingUp,
      iconColor: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    },
    {
      title: 'Closed Deals',
      value: overview?.closed_deals || 0,
      change: `${overview?.total_leads || 0} total leads`,
      changeType: 'positive' as const,
      icon: Award,
      iconColor: 'bg-gradient-to-br from-amber-500 to-orange-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-cyan-600">Overview</p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-fluid-3xl">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back! Here's your Realestate AI overview across leads, conversations, and performance.
        </p>
      </header>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KPI
            key={kpi.title}
            {...kpi}
            className="min-w-[16rem] snap-start sm:min-w-0"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Buyer Intent Distribution" subtitle="Lead categorization by intent level">
          <div className="h-64 sm:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={intentChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius="80%"
                  dataKey="value"
                >
                  {intentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip wrapperClassName="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Conversion Probability Forecast" subtitle="Average conversion rates over time">
          <div className="h-64 sm:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip wrapperClassName="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="probability"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ fill: '#06b6d4', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Recent Activity Feed" subtitle="Latest updates across all leads">
        <ActivityList activities={recentActivities} />
      </ChartCard>
    </div>
  );
}
