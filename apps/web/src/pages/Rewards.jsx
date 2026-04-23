import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { Gift, Plus, Clock, Trash2, AlertCircle, CheckCircle, Hourglass } from 'lucide-react';

const PRESET_REWARDS = [
  { name: 'Quick Bonus', minutes: 15, icon: '⚡' },
  { name: 'Good Job!', minutes: 30, icon: '⭐' },
  { name: 'Big Reward', minutes: 60, icon: '🏆' },
  { name: 'Super Star', minutes: 120, icon: '🌟' }
];

const EXPIRY_OPTIONS = [
  { label: 'Never', hours: null },
  { label: '1 Hour', hours: 1 },
  { label: 'Today', hours: 24 },
  { label: 'This Week', hours: 168 }
];

export default function Rewards() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [bonusGrants, setBonusGrants] = useState([]);
  const [availableBonus, setAvailableBonus] = useState({ totalMinutes: 0, grantCount: 0 });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    minutes: 30,
    reason: '',
    expiresInHours: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadChildren = useCallback(async () => {
    try {
      const res = await api.get('/children');
      const childrenData = Array.isArray(res.data) ? res.data : (res.data?.children || []);
      setChildren(childrenData);
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load children');
    }
  }, [selectedChild]);

  const loadBonusGrants = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const res = await api.get(`/bonus-time?childId=${selectedChild}`);
      const grantsData = Array.isArray(res.data) ? res.data : (res.data?.grants || []);
      setBonusGrants(grantsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load bonus time grants');
    }
  }, [selectedChild]);

  const loadAvailableBonus = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const res = await api.get(`/bonus-time/available?childId=${selectedChild}`);
      setAvailableBonus(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [selectedChild]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    loadBonusGrants();
    loadAvailableBonus();
  }, [loadBonusGrants, loadAvailableBonus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/bonus-time', {
        childId: selectedChild,
        minutes: parseInt(formData.minutes),
        reason: formData.reason,
        expiresInHours: formData.expiresInHours
      });
      
      setSuccess('Bonus time granted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setShowModal(false);
      setFormData({ minutes: 30, reason: '', expiresInHours: null });
      loadBonusGrants();
      loadAvailableBonus();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to grant bonus time');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickGrant = async (minutes, name) => {
    setLoading(true);
    setError('');
    
    try {
      await api.post('/bonus-time', {
        childId: selectedChild,
        minutes: minutes,
        reason: `Quick reward: ${name}`,
        expiresInHours: null
      });
      
      setSuccess(`${minutes} minutes granted!`);
      setTimeout(() => setSuccess(''), 3000);
      loadBonusGrants();
      loadAvailableBonus();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to grant bonus time');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this bonus time?')) return;
    
    try {
      await api.delete(`/bonus-time/${id}`);
      loadBonusGrants();
      loadAvailableBonus();
      setSuccess('Bonus time removed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete bonus time');
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const grantDate = new Date(date);
    const diff = Math.floor((now - grantDate) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return grantDate.toLocaleDateString();
  };

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return 'Never expires';
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    
    if (expiry < now) return 'Expired';
    
    const diff = Math.floor((expiry - now) / 1000);
    if (diff < 3600) return `Expires in ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Expires in ${Math.floor(diff / 3600)}h`;
    return `Expires in ${Math.floor(diff / 86400)}d`;
  };

  const selectedChildName = children.find(c => c.id === selectedChild)?.name || '';

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      <div className="container animate-fade-in">
        {/* Header Section */}
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
              <Gift size={24} />
            </div>
            Rewards & Bonus Time
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
              onClick={() => setShowModal(true)}
              className="btn-warning"
              style={{ width: 'auto' }}
              disabled={loading}
            >
              <Plus size={18} /> Grant Bonus
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <CheckCircle size={20} />
            {success}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div className="card" style={{ 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderLeft: '4px solid #2563EB'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎁</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2563EB' }}>
              {availableBonus.totalMinutes}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Available Bonus Minutes</div>
          </div>
          
          <div className="card" style={{ 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
            borderLeft: '4px solid #14B8A6'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#14B8A6' }}>
              {availableBonus.grantCount}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Active Bonus Grants</div>
          </div>
          
          <div className="card" style={{ 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderLeft: '4px solid #f59e0b'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏆</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>
              {bonusGrants.filter(g => g.is_used).reduce((sum, g) => sum + g.minutes, 0)}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Minutes Used Today</div>
          </div>
        </div>

        {/* Quick Grant Buttons */}
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={20} color="#2563EB" /> Quick Grant
        </h2>
        
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
          {PRESET_REWARDS.map((reward) => (
            <button
              key={reward.name}
              onClick={() => handleQuickGrant(reward.minutes, reward.name)}
              disabled={loading || !selectedChild}
              className="btn-secondary"
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                opacity: loading ? 0.6 : 1
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>{reward.icon}</div>
              <div style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>{reward.name}</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>{reward.minutes} minutes</div>
            </button>
          ))}
        </div>

        {/* Bonus History */}
        <h2 style={{ marginBottom: '15px' }}>Bonus Time History</h2>
        
        <div className="card">
          {bonusGrants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Gift size={48} style={{ marginBottom: '15px', opacity: 0.3, color: '#2563EB' }} />
              <p>No bonus time granted yet.</p>
              <p style={{ fontSize: '14px' }}>Grant bonus time as a reward for good behavior!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Minutes</th>
                    <th>Reason</th>
                    <th>Granted</th>
                    <th>Expires</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bonusGrants.map((grant) => (
                    <tr key={grant.id}>
                      <td>
                        {grant.is_used ? (
                          <span className="badge badge-inactive">
                            <CheckCircle size={12} /> Used
                          </span>
                        ) : grant.expires_at && new Date(grant.expires_at) < new Date() ? (
                          <span className="badge badge-error">
                            <Hourglass size={12} /> Expired
                          </span>
                        ) : (
                          <span className="badge badge-active">
                            <Gift size={12} /> Active
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{grant.minutes} min</td>
                      <td>{grant.reason || '-'}</td>
                      <td style={{ color: '#6b7280', fontSize: '14px' }}>{formatTimeAgo(grant.created_at)}</td>
                      <td style={{ color: '#6b7280', fontSize: '14px' }}>{formatExpiry(grant.expires_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {!grant.is_used && (
                          <button
                            onClick={() => handleDelete(grant.id)}
                            className="btn-danger"
                            style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                            title="Remove bonus time"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Grant Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Gift size={24} color="#f59e0b" />
              Grant Bonus Time
            </h2>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Granting bonus time to: <strong>{selectedChildName}</strong>
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Minutes to Grant *</label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={formData.minutes}
                  onChange={e => setFormData({ ...formData, minutes: e.target.value })}
                  required
                  placeholder="e.g., 30"
                />
                <small style={{ color: '#6b7280' }}>Maximum 480 minutes (8 hours)</small>
              </div>

              <div className="form-group">
                <label>Reason (Optional)</label>
                <input
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g., Finished homework early"
                />
              </div>

              <div className="form-group">
                <label>Expires</label>
                <select
                  value={formData.expiresInHours || ''}
                  onChange={e => setFormData({ ...formData, expiresInHours: e.target.value ? parseInt(e.target.value) : null })}
                >
                  {EXPIRY_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.hours || ''}>{opt.label}</option>
                  ))}
                </select>
                <small style={{ color: '#6b7280' }}>Unused bonus time will expire after this period</small>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="btn-secondary" 
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-warning"
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? 'Granting...' : 'Grant Bonus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
