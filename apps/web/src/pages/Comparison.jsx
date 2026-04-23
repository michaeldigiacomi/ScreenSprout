import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Users, BarChart3, Clock, Smartphone, Calendar, TrendingUp, 
  Award, Target, AlertCircle, ChevronDown, ArrowUp, ArrowDown,
  Minus, Activity, Zap, Filter
} from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const PERIODS = [
  { value: '1d', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

export default function Comparison() {
  const [comparisonData, setComparisonData] = useState(null);
  const [headToHeadData, setHeadToHeadData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('7d');
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  const loadComparisonData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/comparison?period=${period}`);
      const data = res.data || {};
      const childrenData = Array.isArray(data.children) ? data.children : [];
      setComparisonData(data);
      
      // Select first 3 children by default for head-to-head
      if (childrenData.length >= 2 && selectedChildren.length === 0) {
        setSelectedChildren(childrenData.slice(0, Math.min(3, childrenData.length)).map(c => c.id));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  }, [period, selectedChildren.length]);

  const loadHeadToHeadData = useCallback(async () => {
    if (selectedChildren.length < 2) return;
    
    try {
      const res = await api.get(`/comparison/head-to-head?childIds=${selectedChildren.join(',')}&period=${period}`);
      setHeadToHeadData(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [selectedChildren, period]);

  useEffect(() => {
    loadComparisonData();
  }, [loadComparisonData]);

  useEffect(() => {
    loadHeadToHeadData();
  }, [loadHeadToHeadData]);

  const handleChildToggle = (childId) => {
    setSelectedChildren(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), childId];
      }
      return [...prev, childId];
    });
  };

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading && !comparisonData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comparison data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadComparisonData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!comparisonData || comparisonData.children.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Children to Compare</h2>
            <p className="text-gray-600 mb-6">Add children to your account to start comparing their screen time and app usage.</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users size={20} />
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { children, mostActiveChild, leastActiveChild, averageDailyUsage } = comparisonData;
  const hasMultipleChildren = children.length > 1;

  // Prepare chart data
  const usageChartData = children.map((child, index) => ({
    name: child.name,
    minutes: child.totalMinutes,
    limit: child.dailyLimit * comparisonData.period,
    color: COLORS[index % COLORS.length]
  }));

  const avgDailyChartData = children.map((child, index) => ({
    name: child.name,
    avgMinutes: child.avgDailyMinutes,
    limit: child.dailyLimit,
    color: COLORS[index % COLORS.length]
  }));

  const radarData = hasMultipleChildren ? [
    { metric: 'Screen Time', ...children.reduce((acc, c) => ({ ...acc, [c.name]: Math.min(100, (c.totalMinutes / (comparisonData.period * 180)) * 100) }), {}) },
    { metric: 'Active Days', ...children.reduce((acc, c) => ({ ...acc, [c.name]: (c.activeDays / comparisonData.period) * 100 }), {}) },
    { metric: 'App Variety', ...children.reduce((acc, c) => ({ ...acc, [c.name]: Math.min(100, c.uniqueApps * 5) }), {}) },
    { metric: 'Limit Compliance', ...children.reduce((acc, c) => ({ ...acc, [c.name]: c.limitCompliance }), {}) },
    { metric: 'Session Count', ...children.reduce((acc, c) => ({ ...acc, [c.name]: Math.min(100, c.totalSessions / 2) }), {}) },
  ] : [];

  return (
    <div className="page-container min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                Child Comparison
              </h1>
              <p className="text-gray-600 mt-1">Compare screen time and app usage across all your children</p>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {hasMultipleChildren && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Most Active</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{mostActiveChild || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">Highest total screen time</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Least Active</span>
                <TrendingUp className="h-5 w-5 text-blue-500 rotate-180" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{leastActiveChild || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">Lowest total screen time</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Daily / Child</span>
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatMinutes(averageDailyUsage)}</p>
              <p className="text-xs text-gray-500 mt-1">Average per child per day</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Children</span>
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{comparisonData.totalChildren}</p>
              <p className="text-xs text-gray-500 mt-1">Active profiles</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'detailed', label: 'Detailed Breakdown', icon: Activity },
                ...(hasMultipleChildren ? [{ id: 'headtohead', label: 'Head-to-Head', icon: Target }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Usage Comparison Chart */}
                {hasMultipleChildren && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 size={20} />
                        Total Screen Time
                      </h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={usageChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              formatter={(value) => formatMinutes(value)}
                              contentStyle={{ borderRadius: 8 }}
                            />
                            <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                              {usageChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock size={20} />
                        Average Daily Usage
                      </h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={avgDailyChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              formatter={(value) => formatMinutes(value)}
                              contentStyle={{ borderRadius: 8 }}
                            />
                            <Bar dataKey="avgMinutes" radius={[4, 4, 0, 0]}>
                              {avgDailyChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radar Chart */}
                {hasMultipleChildren && radarData.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Zap size={20} />
                      Performance Overview
                    </h3>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          {children.map((child, index) => (
                            <Radar
                              key={child.id}
                              name={child.name}
                              dataKey={child.name}
                              stroke={COLORS[index % COLORS.length]}
                              fill={COLORS[index % COLORS.length]}
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          ))}
                          <Legend />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Single Child View */}
                {!hasMultipleChildren && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Add More Children</h3>
                    <p className="text-gray-500">Comparison features become available when you have 2 or more children.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'detailed' && (
              <div className="space-y-6">
                {children.map((child, index) => (
                  <div key={child.id} className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        >
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{child.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {child.onlineDevices > 0 && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            {child.onlineDevices} Online
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Time</p>
                        <p className="text-xl font-bold text-gray-900">{formatMinutes(child.totalMinutes)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Daily Average</p>
                        <p className="text-xl font-bold text-gray-900">{formatMinutes(child.avgDailyMinutes)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Daily Limit</p>
                        <p className="text-xl font-bold text-gray-900">{formatMinutes(child.dailyLimit)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Compliance</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-xl font-bold ${child.limitCompliance >= 80 ? 'text-green-600' : child.limitCompliance >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {child.limitCompliance}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Smartphone size={16} />
                          Top Apps
                        </h4>
                        {child.topApps.length > 0 ? (
                          <div className="space-y-2">
                            {child.topApps.map((app, i) => (
                              <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3">
                                <span className="font-medium text-gray-700">{app.name}</span>
                                <span className="text-sm text-gray-500">{formatMinutes(app.minutes)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">No app data available</p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Award size={16} />
                          Category Breakdown
                        </h4>
                        {child.categories.length > 0 ? (
                          <div className="space-y-2">
                            {child.categories.slice(0, 5).map((cat, i) => (
                              <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: cat.color }}
                                  />
                                  <span className="font-medium text-gray-700">{cat.name}</span>
                                </div>
                                <span className="text-sm text-gray-500">{formatMinutes(cat.minutes)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">No category data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'headtohead' && hasMultipleChildren && (
              <div className="space-y-6">
                {/* Child Selector */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Filter size={16} />
                    Select Children to Compare (max 4)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {children.map((child, index) => (
                      <button
                        key={child.id}
                        onClick={() => handleChildToggle(child.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedChildren.includes(child.id)
                            ? 'text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                        style={{
                          backgroundColor: selectedChildren.includes(child.id) ? COLORS[index % COLORS.length] : undefined
                        }}
                      >
                        <div 
                          className={`w-2 h-2 rounded-full ${selectedChildren.includes(child.id) ? 'bg-white' : 'bg-gray-400'}`}
                        />
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedChildren.length < 2 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-yellow-800">Select at least 2 children to see head-to-head comparison</p>
                  </div>
                )}

                {headToHeadData && selectedChildren.length >= 2 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {headToHeadData.children.map((child) => {
                        const isWinner = headToHeadData.children.every(c => 
                          c.id === child.id || child.totalMinutes >= c.totalMinutes
                        );
                        return (
                          <div 
                            key={child.id} 
                            className={`bg-white rounded-xl p-6 border-2 transition-all ${
                              isWinner ? 'border-yellow-400 shadow-lg' : 'border-gray-200'
                            }`}
                          >
                            {isWinner && (
                              <div className="flex items-center justify-center gap-1 mb-3 text-yellow-600">
                                <Award size={20} />
                                <span className="font-bold text-sm">Highest Usage</span>
                              </div>
                            )}
                            
                            <div className="text-center">
                              <div 
                                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold"
                                style={{ backgroundColor: COLORS[children.findIndex(c => c.id === child.id) % COLORS.length] }}
                              >
                                {child.name.charAt(0).toUpperCase()}
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-4">{child.name}</h3>
                              
                              <div className="space-y-3">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 uppercase tracking-wide">Total Time</p>
                                  <p className="text-2xl font-bold text-gray-900">{formatMinutes(child.totalMinutes)}</p>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 uppercase tracking-wide">Daily Average</p>
                                  <p className="text-xl font-bold text-gray-900">{formatMinutes(child.avgDailyMinutes)}</p>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 uppercase tracking-wide">Active Days</p>
                                  <p className="text-xl font-bold text-gray-900">{child.activeDays} / {headToHeadData.period}</p>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 uppercase tracking-wide">Unique Apps</p>
                                  <p className="text-xl font-bold text-gray-900">{child.uniqueApps}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {headToHeadData.sharedApps.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Smartphone size={20} />
                          Shared Apps
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">Apps used by multiple children</p>
                        
                        <div className="space-y-2">
                          {headToHeadData.sharedApps.map((app, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-medium text-gray-900">{app.name}</p>
                                  <p className="text-sm text-gray-500">Used by {app.usedByCount} children</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900">{formatMinutes(app.totalMinutes)}</p>
                                <p className="text-sm text-gray-500">total time</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
