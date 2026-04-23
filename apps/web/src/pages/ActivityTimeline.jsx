import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import {
  Clock, Calendar, Smartphone, User, Filter, ChevronLeft, ChevronRight,
  Activity, TrendingUp, Layers, Timer, BarChart3, PieChart, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Category colors fallback
const CATEGORY_COLORS = {
  'Games': '#ef4444',
  'Social Media': '#8b5cf6',
  'Education': '#22c55e',
  'Entertainment': '#f59e0b',
  'Productivity': '#3b82f6',
  'Communication': '#06b6d4',
  'Creativity': '#ec4899',
  'Utilities': '#6b7280',
  'Uncategorized': '#9ca3af'
};

// Format duration in human readable form
const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

// Format timestamp to time string
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date for display
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export default function ActivityTimeline() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activities, setActivities] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [topApps, setTopApps] = useState([]);
  const [summary, setSummary] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    uniqueApps: 0,
    devicesUsed: 0
  });
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState('timeline'); // 'timeline' or 'hourly'

  // Load children on mount
  useEffect(() => {
    api.get('/children')
      .then(res => {
        const childrenData = Array.isArray(res.data) ? res.data : (res.data?.children || []);
        setChildren(childrenData);
        if (childrenData.length > 0) {
          setSelectedChild(childrenData[0].id);
        }
      })
      .catch(err => console.error('Failed to load children:', err));
  }, []);

  // Load activity data
  const loadData = useCallback(async () => {
    if (!selectedChild) return;

    setLoading(true);
    try {
      // Load timeline
      const timelineRes = await api.get(`/activity/timeline?childId=${selectedChild}&date=${selectedDate}&limit=50&offset=${offset}`);
      setActivities(prev => offset === 0 ? timelineRes.data.activities : [...prev, ...timelineRes.data.activities]);
      setSummary(timelineRes.data.summary);
      setPagination(timelineRes.data.pagination);

      // Load hourly breakdown
      const hourlyRes = await api.get(`/activity/hourly?childId=${selectedChild}&date=${selectedDate}`);
      setHourlyData(hourlyRes.data.hourly);

      // Load top apps
      const topAppsRes = await api.get(`/activity/top-apps?childId=${selectedChild}&date=${selectedDate}&limit=5`);
      setTopApps(topAppsRes.data.apps);
    } catch (err) {
      console.error('Failed to load activity data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedChild, selectedDate, offset]);

  useEffect(() => {
    setOffset(0);
    setActivities([]);
  }, [selectedChild, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateChange = (direction) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(date.toISOString().split('T')[0]);
    setOffset(0);
  };

  const loadMore = () => {
    setOffset(prev => prev + 50);
  };

  // Group activities by hour for the timeline view
  const groupedActivities = activities.reduce((acc, activity) => {
    const hour = new Date(activity.timestamp).getHours();
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(activity);
    return acc;
  }, {});

  const sortedHours = Object.keys(groupedActivities).sort((a, b) => b - a);

  return (
    <div className="page-container min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />

      <main className="container animate-fade-in py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600" />
            Activity Timeline
          </h1>
          <p className="text-slate-600 mt-2">
            View detailed app usage history and session breakdown for each child.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Child Selector */}
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a child</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDateChange('prev')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                <Calendar className="w-5 h-5 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none"
                />
                <span className="text-sm text-slate-500 font-medium">
                  {formatDate(selectedDate)}
                </span>
              </div>
              <button
                onClick={() => handleDateChange('next')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-auto">
              <button
                onClick={() => setView('timeline')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'timeline'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                  }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setView('hourly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'hourly'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                  }`}
              >
                Hourly Breakdown
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {selectedChild && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Clock className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Time</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatDuration(summary.totalMinutes * 60)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Layers className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sessions</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.totalSessions}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Smartphone className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Apps Used</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.uniqueApps}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Devices</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.devicesUsed}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {selectedChild ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Timeline or Hourly Chart */}
            <div className="lg:col-span-2 space-y-6">
              {view === 'timeline' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Timer className="w-5 h-5 text-indigo-600" />
                      Session Timeline
                    </h2>
                  </div>

                  <div className="p-4">
                    {loading && activities.length === 0 ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>No activity recorded for this date.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {sortedHours.map(hour => (
                          <div key={hour} className="relative">
                            {/* Hour Label */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-16 text-sm font-semibold text-slate-500">
                                {hour.toString().padStart(2, '0')}:00
                              </div>
                              <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Activities for this hour */}
                            <div className="space-y-2 ml-16">
                              {groupedActivities[hour].map(activity => (
                                <div
                                  key={activity.id}
                                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                  {/* App Icon/Category Color */}
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                    style={{ backgroundColor: activity.category?.color || '#9ca3af' }}
                                  >
                                    {activity.appName.charAt(0).toUpperCase()}
                                  </div>

                                  {/* App Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 truncate">
                                      {activity.appName}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <span>{activity.category?.name || 'Uncategorized'}</span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Smartphone className="w-3 h-3" />
                                        {activity.device?.name || 'Unknown Device'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Duration & Time */}
                                  <div className="text-right">
                                    <p className="font-medium text-slate-800">
                                      {formatDuration(activity.durationSeconds)}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      {formatTime(activity.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Load More */}
                        {pagination.hasMore && (
                          <button
                            onClick={loadMore}
                            disabled={loading}
                            className="w-full py-3 text-center text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {loading ? 'Loading...' : 'Load More'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                  <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-600" />
                      Hourly Activity Breakdown
                    </h2>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="hourLabel"
                          tick={{ fontSize: 12 }}
                          interval={2}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}m`}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} minutes`, 'Screen Time']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="totalMinutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Top Apps & Stats */}
            <div className="space-y-6">
              {/* Top Apps */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-600" />
                    Top Apps
                  </h2>
                </div>
                <div className="p-4">
                  {topApps.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No app data available</p>
                  ) : (
                    <div className="space-y-3">
                      {topApps.map((app, index) => (
                        <div key={app.appName} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {index + 1}
                          </div>
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: app.color }}
                          >
                            {app.appName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">{app.appName}</p>
                            <p className="text-xs text-slate-500">{app.sessionCount} sessions</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-800">{app.totalMinutes}m</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-4 text-white">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Daily Insights
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-indigo-100">Avg session</span>
                    <span className="font-medium">
                      {summary.totalSessions > 0
                        ? formatDuration(Math.round((summary.totalMinutes * 60) / summary.totalSessions))
                        : '0m'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-100">Most active hour</span>
                    <span className="font-medium">
                      {hourlyData.length > 0
                        ? hourlyData.reduce((max, h) => h.totalMinutes > max.totalMinutes ? h : max, hourlyData[0])?.hourLabel || '--'
                        : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-100">Apps per hour</span>
                    <span className="font-medium">
                      {summary.totalSessions > 0
                        ? (summary.uniqueApps / 24).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">Select a Child</h3>
            <p className="text-slate-500">Choose a child from the dropdown above to view their activity timeline.</p>
          </div>
        )}
      </main>
    </div>
  );
}
