import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  Folder, Gamepad2, Users, GraduationCap, PlayCircle, 
  Briefcase, MessageCircle, Palette, HelpCircle,
  Save, Wand2, BarChart3, Clock, AlertCircle,
  Filter
} from 'lucide-react';

const CATEGORY_ICONS = {
  'folder': Folder,
  'gamepad-2': Gamepad2,
  'users': Users,
  'graduation-cap': GraduationCap,
  'play-circle': PlayCircle,
  'briefcase': Briefcase,
  'message-circle': MessageCircle,
  'palette': Palette,
  'help-circle': HelpCircle
};

export default function Categories() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [categoryUsage, setCategoryUsage] = useState(null);
  const [apps, setApps] = useState([]);
  const [appMappings, setAppMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('limits');
  const [appFilter, setAppFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadInitialData = useCallback(async () => {
    try {
      const [childrenRes, _categoriesRes, appsRes] = await Promise.all([
        api.get('/children'),
        api.get('/categories'),
        api.get('/categories/apps')
      ]);
      
      const childrenData = Array.isArray(childrenRes.data) ? childrenRes.data : (childrenRes.data?.children || []);
      setChildren(childrenData);
      // setCategories is not used in render, skipping setting it
      // setCategories(_categoriesRes.data); 
      const appsData = appsRes.data?.apps || [];
      const mappingsData = appsRes.data?.mappings || {};
      setApps(appsData);
      setAppMappings(mappingsData);
      
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      showNotification('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  const loadChildData = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      const [limitsRes, usageRes] = await Promise.all([
        api.get(`/categories/limits/${selectedChild}`),
        api.get(`/categories/usage/${selectedChild}`)
      ]);
      
      const limitsData = Array.isArray(limitsRes.data) ? limitsRes.data : (limitsRes.data?.limits || []);
      setCategoryLimits(limitsData);
      setCategoryUsage(usageRes.data);
    } catch (err) {
      console.error('Error loading child data:', err);
      showNotification('error', 'Failed to load child data');
    }
  }, [selectedChild]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedChild) {
      loadChildData();
    }
  }, [selectedChild, loadChildData]);

  const handleLimitChange = (categoryId, value) => {
    setCategoryLimits(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, daily_limit_minutes: parseInt(value) || 0 }
          : cat
      )
    );
  };

  const handleLimitToggle = (categoryId) => {
    setCategoryLimits(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, is_active: !cat.is_active }
          : cat
      )
    );
  };

  const saveLimits = async () => {
    setSaving(true);
    try {
      await Promise.all(
        categoryLimits.map(cat => 
          api.put(`/categories/limits/${selectedChild}`, {
            categoryId: cat.id,
            dailyLimitMinutes: cat.daily_limit_minutes,
            isActive: cat.is_active
          })
        )
      );
      showNotification('success', 'Category limits saved!');
      loadChildData();
    } catch (err) {
      console.error('Error saving limits:', err);
      showNotification('error', 'Failed to save limits');
    } finally {
      setSaving(false);
    }
  };

  const autoCategorize = async () => {
    setAutoCategorizing(true);
    try {
      const res = await api.post('/categories/auto-categorize');
      
      const appsRes = await api.get('/categories/apps');
      const appsData = appsRes.data?.apps || [];
      const mappingsData = appsRes.data?.mappings || {};
      setApps(appsData);
      setAppMappings(mappingsData);
      
      const categorizedCount = res.data?.categorized?.length || 0;
      showNotification('success', `Auto-categorized ${categorizedCount} apps!`);
    } catch (err) {
      console.error('Error auto-categorizing:', err);
      showNotification('error', 'Failed to auto-categorize');
    } finally {
      setAutoCategorizing(false);
    }
  };

  const filteredApps = (apps || []).filter(app => 
    app && app.toLowerCase().includes(appFilter.toLowerCase())
  );

  const uncategorizedApps = filteredApps.filter(app => !appMappings[app]);

  const getUsageForCategory = (categoryId) => {
    if (!categoryUsage) return { used: 0, limit: 60, percent: 0 };
    const cat = categoryUsage.categories.find(c => c.id === categoryId);
    if (!cat) return { used: 0, limit: 60, percent: 0 };
    
    const used = Math.floor(cat.used_seconds / 60);
    const limit = cat.daily_limit_minutes;
    const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    
    return { used, limit, percent, isActive: cat.is_limit_active };
  };

  if (loading) {
    return (
      <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Header />
        <div className="container" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '24px', color: '#6b7280' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 24px',
          borderRadius: '12px',
          background: notification.type === 'success' ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#ef4444',
          color: 'white',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      <main className="container animate-fade-in" style={{ padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h1 style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'center',
            margin: 0
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Folder size={24} />
            </div>
            App Categories
          </h1>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={selectedChild || ''}
              onChange={e => setSelectedChild(e.target.value)}
              style={{ minWidth: '150px', margin: 0 }}
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
            
            <button 
              onClick={saveLimits} 
              disabled={saving}
              style={{ width: 'auto' }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="card" style={{ marginBottom: '20px', padding: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { id: 'limits', label: 'Category Limits', icon: Clock },
              { id: 'apps', label: 'App Categories', icon: Folder },
              { id: 'insights', label: 'Insights', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#f3f4f6',
                  color: activeTab === tab.id ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: activeTab === tab.id ? '600' : '500'
                }}
              >
                <tab.icon size={18} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Limits Tab */}
        {activeTab === 'limits' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {categoryLimits.map((category, index) => {
              const usage = getUsageForCategory(category.id);
              const Icon = CATEGORY_ICONS[category.icon] || Folder;
              
              return (
                <div 
                  key={category.id} 
                  className="card animate-slide-up"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    borderLeft: `4px solid ${category.color}`,
                    opacity: category.is_active ? 1 : 0.6
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '12px', 
                        background: `${category.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={22} color={category.color} />
                      </div>
                      
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{category.name}</h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                          {category.description}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleLimitToggle(category.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: category.is_active ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#e5e7eb',
                        color: category.is_active ? 'white' : '#6b7280',
                        width: 'auto'
                      }}
                    >
                      {category.is_active ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Usage Bar */}
                  {categoryUsage && (
                    <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '12px', 
                        marginBottom: '6px' 
                      }}>
                        <span>Today's Usage</span>
                        <span style={{ 
                          color: usage.percent >= 100 ? '#ef4444' : usage.percent >= 75 ? '#f59e0b' : '#14B8A6',
                          fontWeight: 'bold'
                        }}>
                          {usage.used}m / {usage.limit}m
                        </span>
                      </div>
                      
                      <div style={{ 
                        height: '8px', 
                        background: '#e5e7eb', 
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${usage.percent}%`,
                          background: usage.percent >= 100 ? '#ef4444' : usage.percent >= 75 ? '#f59e0b' : category.color,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Limit Input */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Daily Limit (minutes)</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                      <input
                        type="number"
                        value={category.daily_limit_minutes || ''}
                        onChange={e => handleLimitChange(category.id, e.target.value)}
                        min="0"
                        style={{ margin: 0, flex: 1 }}
                        disabled={!category.is_active}
                      />
                      <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {Math.floor((category.daily_limit_minutes || 0) / 60)}h {(category.daily_limit_minutes || 0) % 60}m
                      </span>
                    </div>
                  </div>

                  {usage.percent >= 100 && category.is_active && (
                    <div className="alert alert-error" style={{ marginTop: '15px', marginBottom: 0, padding: '10px 12px' }}>
                      <AlertCircle size={14} />
                      Limit reached for today
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Other tabs would follow similar patterns */}
        {activeTab === 'apps' && (
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label>Filter Apps</label>
                  <div style={{ position: 'relative' }}>
                    <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search apps..."
                      value={appFilter}
                      onChange={e => setAppFilter(e.target.value)}
                      style={{ paddingLeft: '40px', margin: 0 }}
                    />
                  </div>
                </div>
                
                <button
                  onClick={autoCategorize}
                  disabled={autoCategorizing}
                  style={{ width: 'auto' }}
                >
                  <Wand2 size={16} /> {autoCategorizing ? 'Working...' : 'Auto-Categorize'}
                </button>
              </div>
            </div>

            {uncategorizedApps.length > 0 && (
              <div className="card" style={{ marginBottom: '20px', background: '#fefce8', border: '1px solid #fde047' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HelpCircle size={20} color="#eab308" />
                  Uncategorized Apps ({uncategorizedApps.length})
                </h3>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && categoryUsage && (
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>Daily Summary for {categoryUsage.childName}</h3>
              <p style={{ color: '#6b7280' }}>
                Date: {new Date(categoryUsage.date).toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
