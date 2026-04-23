import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  Webhook, Plus, Trash2, RefreshCw, CheckCircle, XCircle, 
  AlertTriangle, Eye, EyeOff, Copy, ExternalLink, Clock,
  CheckSquare, Square, ChevronDown, ChevronUp, Activity
} from 'lucide-react';

const WEBHOOK_EVENTS = [
  { id: 'time_limit_reached', label: 'Time Limit Reached', description: 'When a child reaches their daily screen time limit' },
  { id: 'device_offline', label: 'Device Offline', description: 'When a device goes offline for more than 5 minutes' },
  { id: 'device_online', label: 'Device Online', description: 'When a device comes back online' },
  { id: 'blocked_app_attempt', label: 'Blocked App Attempt', description: 'When a child tries to open a blocked application' },
  { id: 'bonus_time_granted', label: 'Bonus Time Granted', description: 'When bonus time is granted to a child' },
  { id: 'bonus_time_used', label: 'Bonus Time Used', description: 'When granted bonus time is consumed' },
  { id: 'schedule_violation', label: 'Schedule Violation', description: 'When a child uses device outside scheduled hours' },
  { id: 'device_enrolled', label: 'Device Enrolled', description: 'When a new device is enrolled' },
  { id: 'device_paused', label: 'Device Paused', description: 'When a device is remotely paused' },
  { id: 'device_resumed', label: 'Device Resumed', description: 'When a device is resumed from pause' },
  { id: 'parent_message_sent', label: 'Parent Message Sent', description: 'When a message is sent to a device' },
  { id: 'daily_summary', label: 'Daily Summary', description: 'Daily digest of screen time activity' },
  { id: 'weekly_report', label: 'Weekly Report', description: 'Weekly summary of usage statistics' },
];

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: ['time_limit_reached', 'device_offline']
  });
  const [, _setShowSecret] = useState(false);
  const [newSecret, setNewSecret] = useState(null);

  useEffect(() => {
    loadWebhooks();
    loadStats();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/webhooks');
      setWebhooks(res.data.webhooks);
      setError('');
    } catch (err) {
      console.error('Failed to load webhooks:', err);
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/webhooks/stats?days=30');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load webhook stats:', err);
    }
  };

  const loadDeliveries = async (webhookId) => {
    try {
      const res = await api.get(`/webhooks/${webhookId}/deliveries?limit=20`);
      setDeliveries(res.data.deliveries);
      setShowDeliveries(true);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/webhooks', formData);
      setNewSecret(res.data.secret);
      setShowAddForm(false);
      setFormData({ name: '', url: '', events: ['time_limit_reached', 'device_offline'] });
      loadWebhooks();
      loadStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create webhook');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await api.delete(`/webhooks/${id}`);
      loadWebhooks();
      loadStats();
    } catch {
      setError('Failed to delete webhook');
    }
  };

  const handleRegenerateSecret = async (id) => {
    if (!confirm('Regenerating the secret will invalidate the old one. Continue?')) return;
    try {
      const res = await api.post(`/webhooks/${id}/regenerate-secret`);
      setNewSecret(res.data.secret);
      loadWebhooks();
    } catch {
      setError('Failed to regenerate secret');
    }
  };

  const handleTest = async (id) => {
    setTestResult(null);
    try {
      const res = await api.post(`/webhooks/${id}/test`);
      setTestResult({ id, ...res.data });
    } catch (err) {
      setTestResult({ id, success: false, error: err.response?.data?.error || 'Test failed' });
    }
  };

  const handleToggleActive = async (webhook) => {
    try {
      await api.put(`/webhooks/${webhook.id}`, { is_active: !webhook.is_active });
      loadWebhooks();
    } catch {
      setError('Failed to update webhook');
    }
  };

  const toggleEvent = (eventId) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const _getStatusColor = (success) => {
    return success ? '#10b981' : '#ef4444';
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      <div className="container animate-fade-in" style={{ maxWidth: '1200px' }}>
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
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Webhook size={24} />
            </div>
            Webhook Notifications
          </h1>
          
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ width: 'auto' }}>
            <Plus size={16} /> Add Webhook
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            <AlertTriangle size={18} style={{ marginRight: '8px' }} />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {stats.webhooks.total}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Webhooks</div>
            </div>
            
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                {stats.webhooks.active}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Active</div>
            </div>
            
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                {stats.deliveries.successful}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Deliveries (30d)</div>
            </div>
            
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
                {stats.deliveries.avg_duration_ms}ms
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Avg Response</div>
            </div>
          </div>
        )}

        {/* New Secret Alert */}
        {newSecret && (
          <div className="card" style={{ 
            marginBottom: '20px', 
            borderLeft: '4px solid #f59e0b',
            background: '#fffbeb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <strong>Secret Generated</strong>
            </div>
            <p style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Copy this secret now. It will not be shown again!
            </p>
            <div style={{ 
              background: '#1f2937', 
              color: '#10b981', 
              padding: '12px', 
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ wordBreak: 'break-all' }}>{newSecret}</span>
              <button 
                onClick={() => copyToClipboard(newSecret)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
              >
                <Copy size={14} />
              </button>
            </div>
            <button 
              onClick={() => setNewSecret(null)}
              className="btn-secondary"
              style={{ marginTop: '15px', width: 'auto' }}
            >
              I've Copied It
            </button>
          </div>
        )}

        {/* Add Webhook Form */}
        {showAddForm && (
          <div className="card animate-slide-up" style={{ marginBottom: '30px', borderLeft: '4px solid #8b5cf6' }}>
            <h3 style={{ marginTop: 0 }}>New Webhook</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Discord Notifications"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://hooks.example.com/webhook"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Events</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '10px',
                  marginTop: '10px'
                }}>
                  {WEBHOOK_EVENTS.map(event => (
                    <div
                      key={event.id}
                      onClick={() => toggleEvent(event.id)}
                      style={{
                        padding: '12px',
                        border: `2px solid ${formData.events.includes(event.id) ? '#8b5cf6' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: formData.events.includes(event.id) ? '#f5f3ff' : 'white'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {formData.events.includes(event.id) ? (
                          <CheckSquare size={18} color="#8b5cf6" />
                        ) : (
                          <Square size={18} color="#9ca3af" />
                        )}
                        <span style={{ fontWeight: 600 }}>{event.label}</span>
                      </div>
                      <p style={{ 
                        margin: '4px 0 0 26px', 
                        fontSize: '12px', 
                        color: '#6b7280' 
                      }}>
                        {event.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1 }}>
                  Create Webhook
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Webhooks List */}
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: '#8b5cf6' }} />
              <p style={{ color: '#6b7280', marginTop: '15px' }}>Loading webhooks...</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <Webhook size={48} style={{ color: '#d1d5db', marginBottom: '20px' }} />
              <h3 style={{ marginBottom: '10px' }}>No Webhooks Configured</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                Set up webhooks to receive real-time notifications at external URLs.
              </p>
              <button onClick={() => setShowAddForm(true)} style={{ width: 'auto' }}>
                <Plus size={16} /> Create Your First Webhook
              </button>
            </div>
          ) : (
            webhooks.map(webhook => (
              <div 
                key={webhook.id} 
                className="card"
                style={{ 
                  borderLeft: `4px solid ${webhook.is_active ? '#8b5cf6' : '#9ca3af'}`,
                  opacity: webhook.is_active ? 1 : 0.7
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0 }}>{webhook.name}</h3>
                      <span 
                        className="badge"
                        style={{ 
                          background: webhook.is_active ? '#dcfce7' : '#f3f4f6',
                          color: webhook.is_active ? '#166534' : '#6b7280'
                        }}
                      >
                        {webhook.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {webhook.failure_count > 5 && (
                        <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                          <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                          {webhook.failure_count} Failures
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <code style={{ 
                        background: '#f3f4f6', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: '#4b5563'
                      }}>
                        {webhook.url}
                      </code>
                      <a 
                        href={webhook.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#8b5cf6' }}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {webhook.events.map(event => (
                        <span 
                          key={event}
                          className="badge"
                          style={{ 
                            background: '#ede9fe', 
                            color: '#7c3aed',
                            fontSize: '11px'
                          }}
                        >
                          {WEBHOOK_EVENTS.find(e => e.id === event)?.label || event}
                        </span>
                      ))}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#6b7280' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        Last triggered: {formatDate(webhook.last_triggered_at)}
                      </span>
                      <span>Created: {formatDate(webhook.created_at)}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => handleToggleActive(webhook)}
                      className="btn-secondary"
                      style={{ padding: '8px', width: 'auto' }}
                      title={webhook.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {webhook.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    
                    <button 
                      onClick={() => handleTest(webhook.id)}
                      className="btn-secondary"
                      style={{ padding: '8px', width: 'auto' }}
                      title="Test Webhook"
                    >
                      <Activity size={16} />
                    </button>
                    
                    <button 
                      onClick={() => {
                        setSelectedWebhook(webhook.id);
                        loadDeliveries(webhook.id);
                      }}
                      className="btn-secondary"
                      style={{ padding: '8px', width: 'auto' }}
                      title="View History"
                    >
                      <Clock size={16} />
                    </button>
                    
                    <button 
                      onClick={() => handleRegenerateSecret(webhook.id)}
                      className="btn-secondary"
                      style={{ padding: '8px', width: 'auto' }}
                      title="Regenerate Secret"
                    >
                      <RefreshCw size={16} />
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(webhook.id)}
                      className="btn-danger"
                      style={{ padding: '8px', width: 'auto' }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Test Result */}
                {testResult?.id === webhook.id && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    borderRadius: '8px',
                    background: testResult.success ? '#dcfce7' : '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    {testResult.success ? (
                      <CheckCircle size={20} color="#10b981" />
                    ) : (
                      <XCircle size={20} color="#ef4444" />
                    )}
                    <div>
                      <strong>{testResult.success ? 'Test Successful' : 'Test Failed'}</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                        {testResult.success 
                          ? `Response: ${testResult.statusCode} (${testResult.duration}ms)`
                          : testResult.error
                        }
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Delivery History */}
                {showDeliveries && selectedWebhook === webhook.id && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0 }}>Recent Deliveries</h4>
                      <button onClick={() => setShowDeliveries(false)} className="btn-secondary" style={{ width: 'auto', padding: '4px 8px' }}>
                        <ChevronUp size={16} />
                      </button>
                    </div>
                    
                    {deliveries.length === 0 ? (
                      <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No deliveries yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {deliveries.map(delivery => (
                          <div 
                            key={delivery.id}
                            style={{
                              padding: '12px',
                              background: delivery.success ? '#f0fdf4' : '#fef2f2',
                              borderRadius: '8px',
                              border: `1px solid ${delivery.success ? '#bbf7d0' : '#fecaca'}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {delivery.success ? (
                                  <CheckCircle size={16} color="#10b981" />
                                ) : (
                                  <XCircle size={16} color="#ef4444" />
                                )}
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                  {WEBHOOK_EVENTS.find(e => e.id === delivery.event_type)?.label || delivery.event_type}
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {new Date(delivery.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              gap: '15px', 
                              marginTop: '8px',
                              fontSize: '13px',
                              color: '#6b7280'
                            }}>
                              {delivery.response_status && (
                                <span>Status: {delivery.response_status}</span>
                              )}
                              {delivery.delivery_duration_ms && (
                                <span>Duration: {delivery.delivery_duration_ms}ms</span>
                              )}
                            </div>
                            {delivery.error_message && (
                              <p style={{ 
                                margin: '8px 0 0 0', 
                                fontSize: '12px', 
                                color: '#ef4444',
                                fontFamily: 'monospace'
                              }}>
                                {delivery.error_message}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
