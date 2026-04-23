import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  Globe, Shield, Plus, Trash2, ToggleLeft, ToggleRight, 
  AlertTriangle, Clock, Users, Search, Lock, Unlock,
  BarChart3, History, Filter, X, CheckCircle, AlertCircle,
  ExternalLink, BookOpen, Gamepad, ShoppingCart, Newspaper
} from 'lucide-react';

const CATEGORY_ICONS = {
  'adult': AlertTriangle,
  'gambling': AlertTriangle,
  'violence': AlertTriangle,
  'drugs': AlertTriangle,
  'social': Users,
  'gaming': Gamepad,
  'entertainment': ExternalLink,
  'shopping': ShoppingCart,
  'news': Newspaper,
  'education': BookOpen
};

const CATEGORY_COLORS = {
  'adult': '#dc2626',
  'gambling': '#dc2626',
  'violence': '#dc2626',
  'drugs': '#dc2626',
  'social': '#8b5cf6',
  'gaming': '#f59e0b',
  'entertainment': '#ec4899',
  'shopping': '#3b82f6',
  'news': '#22c55e',
  'education': '#14b8a6'
};

export default function WebFiltering() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    ruleType: 'block',
    target: '',
    targetType: 'domain',
    appliesToAll: false,
    description: ''
  });
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);

  const loadChildren = useCallback(async () => {
    try {
      const res = await api.get('/children');
      const childrenData = Array.isArray(res.data) ? res.data : (res.data?.children || []);
      setChildren(childrenData);
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (err) {
      console.error('Failed to load children:', err);
    }
  }, [selectedChild]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/web-filter/categories');
      const categoriesData = Array.isArray(res.data) ? res.data : (res.data?.categories || []);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedChild) return;
    
    setLoading(true);
    try {
      const [policyRes, rulesRes, historyRes, statsRes] = await Promise.all([
        api.get(`/web-filter/policy/${selectedChild}`),
        api.get(`/web-filter/rules?childId=${selectedChild}`),
        api.get(`/web-filter/history?childId=${selectedChild}&date=${historyDate}&limit=50`),
        api.get(`/web-filter/stats?childId=${selectedChild}`)
      ]);
      
      setPolicy(policyRes.data);
      setRules(rulesRes.data);
      setHistory(historyRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load web filter data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedChild, historyDate]);

  useEffect(() => {
    loadChildren();
    loadCategories();
  }, [loadChildren, loadCategories]);

  useEffect(() => {
    if (selectedChild) {
      loadData();
    }
  }, [selectedChild, historyDate, loadData]);

  const updatePolicy = async (updates) => {
    try {
      const res = await api.put(`/web-filter/policy/${selectedChild}`, updates);
      setPolicy(res.data);
    } catch (err) {
      console.error('Failed to update policy:', err);
      alert('Failed to update policy');
    }
  };

  const toggleCategory = (category) => {
    const currentBlocked = policy?.blocked_categories || [];
    const newBlocked = currentBlocked.includes(category)
      ? currentBlocked.filter(c => c !== category)
      : [...currentBlocked, category];
    
    updatePolicy({ blockedCategories: newBlocked });
  };

  const createRule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/web-filter/rules', {
        childId: ruleForm.appliesToAll ? null : selectedChild,
        ruleType: ruleForm.ruleType,
        target: ruleForm.target,
        targetType: ruleForm.targetType,
        appliesToAll: ruleForm.appliesToAll,
        description: ruleForm.description
      });
      
      setShowAddRuleModal(false);
      setRuleForm({
        ruleType: 'block',
        target: '',
        targetType: 'domain',
        appliesToAll: false,
        description: ''
      });
      loadData();
    } catch (err) {
      console.error('Failed to create rule:', err);
      alert('Failed to create rule');
    }
  };

  const toggleRule = async (ruleId, isActive) => {
    try {
      await api.put(`/web-filter/rules/${ruleId}`, { isActive: !isActive });
      loadData();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const deleteRule = async (ruleId) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await api.delete(`/web-filter/rules/${ruleId}`);
      loadData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const _getCategoryIcon = (category) => {
    const Icon = CATEGORY_ICONS[category] || Globe;
    return <Icon size={20} color={CATEGORY_COLORS[category] || '#6b7280'} />;
  };

  const tabs = [
    { id: 'settings', label: 'Filter Settings', icon: Shield },
    { id: 'rules', label: 'Custom Rules', icon: Filter },
    { id: 'history', label: 'Browsing History', icon: History },
    { id: 'stats', label: 'Statistics', icon: BarChart3 }
  ];

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      <div className="container animate-fade-in">
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
              <Globe size={24} />
            </div>
            Web Filtering
          </h1>
        </div>

        {/* Child Selector */}
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #2563EB' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            <Users size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Select Child
          </label>
          <select
            value={selectedChild || ''}
            onChange={e => setSelectedChild(e.target.value)}
            style={{ maxWidth: '300px', marginBottom: 0 }}
          >
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '30px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '2px'
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? '#2563EB' : 'transparent'}`,
                  background: 'transparent',
                  color: isActive ? '#2563EB' : '#6b7280',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '-2px',
                  fontSize: '14px'
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading && !policy ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="animate-spin" style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #e5e7eb', 
              borderTopColor: '#2563EB',
              borderRadius: '50%',
              margin: '0 auto 20px'
            }} />
            <p style={{ color: '#6b7280' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* Settings Tab */}
            {activeTab === 'settings' && policy && (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Main Settings */}
                <div className="card" style={{ borderLeft: '4px solid #2563EB' }}>
                  <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={24} color="#2563EB" />
                    Filter Settings
                  </h3>

                  <div style={{ marginBottom: '25px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '15px',
                      background: policy.filter_enabled ? '#ecfdf5' : '#f3f4f6',
                      borderRadius: '12px',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          Web Filtering
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {policy.filter_enabled ? 'Active and protecting' : 'Currently disabled'}
                        </div>
                      </div>
                      <button
                        onClick={() => updatePolicy({ filterEnabled: !policy.filter_enabled })}
                        style={{ 
                          width: 'auto', 
                          padding: '8px 16px',
                          background: policy.filter_enabled ? '#10b981' : '#6b7280'
                        }}
                      >
                        {policy.filter_enabled ? (
                          <><Lock size={16} /> Enabled</>
                        ) : (
                          <><Unlock size={16} /> Disabled</>
                        )}
                      </button>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '15px',
                      background: policy.block_adult_content ? '#fef2f2' : '#f3f4f6',
                      borderRadius: '12px',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px', color: '#dc2626' }} />
                          Block Adult Content
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          Automatically block adult websites
                        </div>
                      </div>
                      <button
                        onClick={() => updatePolicy({ blockAdultContent: !policy.block_adult_content })}
                        className="btn-secondary"
                        style={{ width: 'auto' }}
                      >
                        {policy.block_adult_content ? (
                          <ToggleRight size={24} color="#10b981" />
                        ) : (
                          <ToggleLeft size={24} color="#9ca3af" />
                        )}
                      </button>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '15px',
                      background: policy.safe_search_enabled ? '#eff6ff' : '#f3f4f6',
                      borderRadius: '12px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          <Search size={16} style={{ display: 'inline', marginRight: '6px', color: '#2563EB' }} />
                          Safe Search
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          Enforce safe search on Google, Bing, YouTube
                        </div>
                      </div>
                      <button
                        onClick={() => updatePolicy({ safeSearchEnabled: !policy.safe_search_enabled })}
                        className="btn-secondary"
                        style={{ width: 'auto' }}
                      >
                        {policy.safe_search_enabled ? (
                          <ToggleRight size={24} color="#10b981" />
                        ) : (
                          <ToggleLeft size={24} color="#9ca3af" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Blocks */}
                <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
                  <h3 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Filter size={24} color="#dc2626" />
                    Blocked Categories
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {categories.map(cat => {
                      const isBlocked = policy.blocked_categories?.includes(cat.category);
                      const Icon = CATEGORY_ICONS[cat.category] || Globe;
                      
                      return (
                        <div
                          key={cat.category}
                          onClick={() => toggleCategory(cat.category)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 15px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            background: isBlocked ? '#fef2f2' : '#f3f4f6',
                            border: `2px solid ${isBlocked ? '#dc2626' : 'transparent'}`,
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: isBlocked ? '#dc2626' : '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isBlocked ? 'white' : '#6b7280'
                          }}>
                            <Icon size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>
                              {cat.category_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {cat.description}
                            </div>
                          </div>
                          {isBlocked && (
                            <Lock size={18} color="#dc2626" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3>Custom Rules</h3>
                  <button 
                    onClick={() => setShowAddRuleModal(true)}
                    style={{ width: 'auto' }}
                  >
                    <Plus size={18} /> Add Rule
                  </button>
                </div>

                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
                  {rules.map(rule => (
                    <div 
                      key={rule.id} 
                      className="card"
                      style={{ 
                        borderLeft: `4px solid ${rule.rule_type === 'block' ? '#dc2626' : '#10b981'}`,
                        opacity: rule.is_active ? 1 : 0.5
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: rule.rule_type === 'block' ? '#fef2f2' : '#ecfdf5',
                          color: rule.rule_type === 'block' ? '#dc2626' : '#10b981',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {rule.rule_type === 'block' ? (
                            <><Lock size={12} /> Block</>
                          ) : (
                            <><Unlock size={12} /> Allow</>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => toggleRule(rule.id, rule.is_active)}
                            className="btn-secondary"
                            style={{ padding: '6px', width: 'auto', background: 'transparent' }}
                          >
                            {rule.is_active ? (
                              <ToggleRight size={20} color="#10b981" />
                            ) : (
                              <ToggleLeft size={20} color="#9ca3af" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="btn-danger"
                            style={{ padding: '6px', width: 'auto' }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <code style={{ 
                          background: '#f3f4f6', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}>
                          {rule.target}
                        </code>
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '12px', 
                          color: '#6b7280',
                          textTransform: 'uppercase'
                        }}>
                          {rule.target_type}
                        </span>
                      </div>

                      {rule.description && (
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                          {rule.description}
                        </p>
                      )}

                      {rule.applies_to_all && (
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#2563EB',
                          background: '#eff6ff',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Applies to all children
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {rules.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px',
                    background: 'white',
                    borderRadius: '16px',
                    border: '2px dashed #e5e7eb'
                  }}>
                    <Filter size={48} style={{ marginBottom: '20px', opacity: 0.5, color: '#2563EB' }} />
                    <h3>No custom rules yet</h3>
                    <p style={{ color: '#6b7280' }}>
                      Create rules to block specific websites or allow exceptions.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="card">
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <History size={24} color="#2563EB" />
                    Browsing History
                  </h3>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={e => setHistoryDate(e.target.value)}
                    style={{ width: 'auto', marginBottom: 0 }}
                  />
                </div>

                <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                  {history.map(item => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '12px 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: item.was_blocked ? '#fef2f2' : '#ecfdf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.was_blocked ? (
                          <Lock size={18} color="#dc2626" />
                        ) : (
                          <Globe size={18} color="#10b981" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: '500', 
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.page_title || item.domain}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {item.domain} • {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {item.was_blocked && (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          BLOCKED
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {history.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <Globe size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                    <p>No browsing history for this date.</p>
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {stats.total_visits || 0}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Visits</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#dc2626' }}>
                    {stats.blocked_visits || 0}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>Blocked</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>
                    {stats.unique_domains || 0}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>Unique Sites</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {stats.active_days || 0}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>Active Days</div>
                </div>

                {/* Top Domains */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ marginBottom: '20px' }}>Top Domains</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stats.top_domains?.map((domain, index) => (
                      <div 
                        key={domain.domain}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          padding: '12px',
                          background: '#f8fafc',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600' }}>{domain.domain}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {domain.visit_count} visits
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '600', color: '#2563EB' }}>
                            {Math.round(domain.total_duration / 60)}m
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            total time
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <div 
          className="modal-overlay" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddRuleModal(false); }}
        >
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
              <Plus size={24} color="#2563EB" />
              Add Filter Rule
            </h2>

            <form onSubmit={createRule}>
              <div className="form-group">
                <label>Rule Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setRuleForm({ ...ruleForm, ruleType: 'block' })}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: `2px solid ${ruleForm.ruleType === 'block' ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      background: ruleForm.ruleType === 'block' ? '#fef2f2' : 'white',
                      color: ruleForm.ruleType === 'block' ? '#dc2626' : '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <Lock size={18} style={{ marginBottom: '4px' }} />
                    <div>Block</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleForm({ ...ruleForm, ruleType: 'allow' })}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: `2px solid ${ruleForm.ruleType === 'allow' ? '#10b981' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      background: ruleForm.ruleType === 'allow' ? '#ecfdf5' : 'white',
                      color: ruleForm.ruleType === 'allow' ? '#10b981' : '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <Unlock size={18} style={{ marginBottom: '4px' }} />
                    <div>Allow</div>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Target Type</label>
                <select
                  value={ruleForm.targetType}
                  onChange={e => setRuleForm({ ...ruleForm, targetType: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="domain">Domain (e.g., example.com)</option>
                  <option value="pattern">Pattern (e.g., *.example.com)</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  {ruleForm.targetType === 'domain' ? 'Domain' : 'Pattern'}
                </label>
                <input
                  type="text"
                  value={ruleForm.target}
                  onChange={e => setRuleForm({ ...ruleForm, target: e.target.value })}
                  placeholder={ruleForm.targetType === 'domain' ? 'example.com' : '*.example.com'}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={ruleForm.description}
                  onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                  placeholder="Why this rule?"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ruleForm.appliesToAll}
                    onChange={e => setRuleForm({ ...ruleForm, appliesToAll: e.target.checked })}
                  />
                  Apply to all children
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Cancel
                </button>
                <button type="submit" style={{ width: '100%' }}>
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
