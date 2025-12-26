// CRM Dashboard Component
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendUp,
  CurrencyDollar,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Target,
  ChartBar
} from '@phosphor-icons/react';
import { useCRM } from '../contexts/CRMContext';
import { CRM_STAGES, CRM_PRIORITIES, DASHBOARD_METRICS } from '../constants';
import { CRMActivity } from '../types';
import { format } from 'date-fns';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: {
    value: number;
    label: string;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        {trend && (
          <p className="text-sm mt-2 flex items-center">
            <TrendUp size={16} className="mr-1" />
            <span className={trend.value > 0 ? 'text-green-600' : 'text-red-600'}>
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
        <Icon size={24} className={color} />
      </div>
    </div>
  </motion.div>
);

// Pipeline Stage Card
interface PipelineStageCardProps {
  stage: string;
  stageLabel: string;
  count: number;
  total: number;
  color: string;
}

const PipelineStageCard: React.FC<PipelineStageCardProps> = ({ stage, stageLabel, count, total, color }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {stageLabel}
        </h3>
        <span className={`text-lg font-bold ${color}`}>{count}</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-500')}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{percentage}% of total</p>
    </motion.div>
  );
};

// Activity Item Component
interface ActivityItemProps {
  activity: CRMActivity;
  leadName: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, leadName }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'meeting': return '👥';
      case 'email': return '📧';
      case 'site_visit': return '📍';
      case 'whatsapp': return '💬';
      default: return '📝';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className="text-lg">{getActivityIcon(activity.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {activity.title}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {leadName} • {format(activity.createdAt, 'MMM dd, hh:mm a')}
        </p>
        {activity.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activity.description}
          </p>
        )}
      </div>
      {activity.scheduledAt && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {format(activity.scheduledAt, 'MMM dd')}
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
const CRMDashboard: React.FC = () => {
  const { dashboardMetrics, loading, error, refreshDashboard, settings } = useCRM();
  const [upcomingActivities, setUpcomingActivities] = useState<CRMActivity[]>([]);
  const [overdueActivities, setOverdueActivities] = useState<CRMActivity[]>([]);

  // Get custom stage label from settings or fallback to default
  const getStageLabel = (stageKey: string): string => {
    if (settings?.pipelineStages && settings.pipelineStages[stageKey]) {
      return settings.pipelineStages[stageKey];
    }
    return CRM_STAGES[stageKey as keyof typeof CRM_STAGES]?.label || stageKey;
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  // Calculate metrics from dashboard data
  const metrics = dashboardMetrics || {
    totalLeads: 0,
    stageCounts: {},
    statusCounts: {},
    stageDistribution: {},
    conversionRate: 0,
    averageDealSize: 0,
    avgDealSize: 0,
    wonDeals: 0,
    lostDeals: 0,
    activeLeads: 0,
    upcomingFollowUps: [],
    overdueFollowUps: [],
    recentActivities: []
  };

  // Support both old format (statusCounts) and new format (wonDeals, activeLeads)
  const wonLeads = metrics.wonDeals ?? metrics.statusCounts?.won ?? 0;
  const lostLeads = metrics.lostDeals ?? metrics.statusCounts?.lost ?? 0;
  const activeLeads = metrics.activeLeads ?? (metrics.totalLeads - wonLeads - lostLeads);

  if (loading.dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <Warning className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading dashboard
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Pipeline Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Pipeline Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(CRM_STAGES).map(([key, stage]) => (
            <PipelineStageCard
              key={key}
              stage={key}
              stageLabel={getStageLabel(key)}
              count={(metrics.stageCounts?.[key as keyof typeof metrics.stageCounts] || metrics.stageDistribution?.[key] || 0) as number}
              total={metrics.totalLeads}
              color={stage.color.split(' ')[1]} // Extract color class
            />
          ))}
        </div>
      </div>

      {/* Activity Feed & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Recent Activities
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {metrics.recentActivities?.length > 0 ? (
              metrics.recentActivities.slice(0, 5).map((activity, index) => (
                <ActivityItem
                  key={activity.id || index}
                  activity={activity}
                  leadName={activity.title.split(' - ')[0] || 'Unknown Lead'}
                />
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                No recent activities
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Upcoming Follow-ups
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {metrics.upcomingFollowUps?.length > 0 ? (
              metrics.upcomingFollowUps.slice(0, 5).map((activity, index) => (
                <div key={activity.id || index} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {activity.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {activity.scheduledAt ? format(activity.scheduledAt, 'MMM dd, hh:mm a') : 'No date set'}
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                No upcoming follow-ups
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Performance Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              ₹{Math.round(metrics.averageDealSize || metrics.avgDealSize || 0).toLocaleString()}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Average Deal Size
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {Math.round((wonLeads / Math.max(metrics.totalLeads, 1)) * 100)}%
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Win Rate
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {Math.round((lostLeads / Math.max(metrics.totalLeads, 1)) * 100)}%
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Loss Rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
