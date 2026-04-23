import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { 
  Settings, Bell, Shield, Download, Trash2, 
  User, Moon, Sun, Monitor, Lock, Save, AlertTriangle,
  CheckCircle, ChevronRight, Database
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [accountData, setAccountData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    timeLimitAlerts: true,
    blockedAppAlerts: true,
    deviceOfflineAlerts: true,
    dailySummary: false,
    weeklyReport: true
  });
  
  const [defaultPolicy, setDefaultPolicy] = useState({
    dailyLimitMinutes: 120,
    blockedApps: '',
    alwaysAllowedApps: ''
  });
  
  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedNotifications = localStorage.getItem('notification_prefs');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
      
      const policyRes = await api.get('/settings/default-policy');
      if (policyRes.data) {
        setDefaultPolicy({
          dailyLimitMinutes: policyRes.data.dailyLimitMinutes || 120,
          blockedApps: (policyRes.data.blockedApps || []).join(', '),
          alwaysAllowedApps: (policyRes.data.alwaysAllowedApps || []).join(', ')
        });
      }
      
      const savedPrefs = localStorage.getItem('app_preferences');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        setPreferences({
          language: parsed.language || 'en',
          timezone: parsed.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      }
    } catch {
      console.error('Failed to load settings');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (accountData.newPassword !== accountData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (accountData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setLoading(true);
      await api.post('/auth/change-password', {
        currentPassword: accountData.currentPassword,
        newPassword: accountData.newPassword
      });
      
      setSuccess('Password changed successfully!');
      setAccountData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setLoading(true);
      localStorage.setItem('notification_prefs', JSON.stringify(notifications));
      setSuccess('Notification preferences saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to save notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaultPolicy = async () => {
    try {
      setLoading(true);
      await api.put('/settings/default-policy', {
        dailyLimitMinutes: parseInt(defaultPolicy.dailyLimitMinutes),
        blockedApps: defaultPolicy.blockedApps.split(',').map(s => s.trim()).filter(s => s),
        alwaysAllowedApps: defaultPolicy.alwaysAllowedApps.split(',').map(s => s.trim()).filter(s => s)
      });
      
      setSuccess('Default policy saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save default policy');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('app_preferences', JSON.stringify(preferences));
    setSuccess('Preferences saved!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/export-data');
      
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screensprout-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Data exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?')) {
      return;
    }
    
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      setError('Account deletion cancelled');
      return;
    }
    
    try {
      setLoading(true);
      await api.delete('/auth/account');
      localStorage.clear();
      window.location.href = '/login';
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'policy', label: 'Default Policy', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'data', label: 'Data & Privacy', icon: Database }
  ];

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: 'var(--bg-color, #f8fafc)' }}>
      <Header />
      <div className="container animate-fade-in">
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px' 
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
              <Settings size={24} />
            </div>
            Settings
          </h1>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <CheckCircle size={20} />
            {success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '30px' }}>
          {/* Sidebar */}
          <div className="card" style={{ padding: '12px', height: 'fit-content' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '10px',
                    background: isActive ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : 'transparent',
                    color: isActive ? 'white' : '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: isActive ? '600' : '500',
                    marginBottom: '4px',
                    fontSize: '14px'
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                  <ChevronRight 
                    size={16} 
                    style={{ marginLeft: 'auto', opacity: isActive ? 1 : 0 }} 
                  />
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div>
            {/* Account Settings */}
            {activeTab === 'account' && (
              <div className="card animate-fade-in">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB'
                  }}>
                    <Lock size={18} />
                  </div>
                  Change Password
                </h2>
                
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={accountData.currentPassword}
                      onChange={e => setAccountData({ ...accountData, currentPassword: e.target.value })}
                      required
                      placeholder="Enter your current password"
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={accountData.newPassword}
                      onChange={e => setAccountData({ ...accountData, newPassword: e.target.value })}
                      required
                      placeholder="Enter new password"
                      minLength={6}
                    />
                    <small style={{ color: '#6b7280' }}>Minimum 6 characters</small>
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={accountData.confirmPassword}
                      onChange={e => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                      required
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button type="submit" disabled={loading} style={{ width: 'auto' }}>
                    <Save size={16} /> {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>

                <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

                <h2 style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  marginBottom: '25px', 
                  color: '#dc2626' 
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626'
                  }}>
                    <Trash2 size={18} />
                  </div>
                  Delete Account
                </h2>
                
                <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                  Permanently delete your account and all associated data including children profiles, 
                  devices, and activity history. This action cannot be undone.
                </p>

                <button 
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="btn-danger"
                  style={{ width: 'auto' }}
                >
                  <AlertTriangle size={16} /> Delete My Account
                </button>
              </div>
            )}

            {/* Other tabs content would follow similar patterns */}
            {activeTab === 'notifications' && (
              <div className="card animate-fade-in">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB'
                  }}>
                    <Bell size={18} />
                  </div>
                  Notification Preferences
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
                    { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
                    { key: 'timeLimitAlerts', label: 'Time Limit Alerts', desc: 'When screen time limit is reached' },
                    { key: 'blockedAppAlerts', label: 'Blocked App Alerts', desc: 'When child tries to access blocked apps' },
                    { key: 'deviceOfflineAlerts', label: 'Device Offline Alerts', desc: 'When device goes offline' },
                    { key: 'dailySummary', label: 'Daily Summary', desc: 'Daily activity summary email' },
                    { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly analytics report' }
                  ].map(option => (
                    <div key={option.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{option.label}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{option.desc}</div>
                      </div>
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '48px',
                        height: '24px'
                      }}>
                        <input
                          type="checkbox"
                          checked={notifications[option.key]}
                          onChange={e => setNotifications({ ...notifications, [option.key]: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: notifications[option.key] ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#e5e7eb',
                          borderRadius: '24px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '18px',
                            width: '18px',
                            left: notifications[option.key] ? '26px' : '4px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleSaveNotifications}
                  disabled={loading}
                  style={{ marginTop: '30px', width: 'auto' }}
                >
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            )}

            {activeTab === 'policy' && (
              <div className="card animate-fade-in">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB'
                  }}>
                    <Shield size={18} />
                  </div>
                  Default Screen Time Policy
                </h2>
                
                <p style={{ color: '#6b7280', marginBottom: '25px' }}>
                  These settings will be applied as defaults when creating new child profiles or enrolling new devices.
                </p>

                <div className="form-group">
                  <label>Default Daily Limit (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    value={defaultPolicy.dailyLimitMinutes}
                    onChange={e => setDefaultPolicy({ ...defaultPolicy, dailyLimitMinutes: e.target.value })}
                    required
                  />
                  <small style={{ color: '#6b7280' }}>Recommended: 60-120 minutes for children</small>
                </div>

                <div className="form-group">
                  <label>Default Blocked Apps (comma separated)</label>
                  <input
                    value={defaultPolicy.blockedApps}
                    onChange={e => setDefaultPolicy({ ...defaultPolicy, blockedApps: e.target.value })}
                    placeholder="e.g., tiktok, snapchat, fortnite"
                  />
                </div>

                <div className="form-group">
                  <label>Default Always Allowed Apps</label>
                  <input
                    value={defaultPolicy.alwaysAllowedApps}
                    onChange={e => setDefaultPolicy({ ...defaultPolicy, alwaysAllowedApps: e.target.value })}
                    placeholder="e.g., calculator, notepad, duolingo"
                  />
                </div>

                <button 
                  onClick={handleSaveDefaultPolicy}
                  disabled={loading}
                  style={{ width: 'auto' }}
                >
                  <Save size={16} /> Save Default Policy
                </button>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="card animate-fade-in">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--info-light, #dbeafe)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--info, #2563EB)'
                  }}>
                    <Settings size={18} />
                  </div>
                  Application Preferences
                </h2>

                <div className="form-group">
                  <label>Theme</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setTheme('light')}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: `2px solid ${theme === 'light' ? 'var(--primary-blue, #2563EB)' : 'var(--border-color, #e5e7eb)'}`,
                        background: theme === 'light' ? 'var(--info-light, #eff6ff)' : 'var(--card-bg, white)',
                        color: 'var(--text-main, #374151)'
                      }}
                    >
                      <Sun size={24} style={{ marginBottom: '8px' }} />
                      <div>Light</div>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: `2px solid ${theme === 'dark' ? 'var(--primary-blue, #2563EB)' : 'var(--border-color, #e5e7eb)'}`,
                        background: theme === 'dark' ? 'var(--bg-secondary, #1f2937)' : 'var(--card-bg, white)',
                        color: theme === 'dark' ? 'var(--text-heading, white)' : 'var(--text-main, #374151)'
                      }}
                    >
                      <Moon size={24} style={{ marginBottom: '8px' }} />
                      <div>Dark</div>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: `2px solid ${theme === 'system' ? 'var(--primary-blue, #2563EB)' : 'var(--border-color, #e5e7eb)'}`,
                        background: theme === 'system' ? 'var(--info-light, #eff6ff)' : 'var(--card-bg, white)',
                        color: 'var(--text-main, #374151)'
                      }}
                    >
                      <Monitor size={24} style={{ marginBottom: '8px' }} />
                      <div>System</div>
                    </button>
                  </div>
                  <small style={{ color: 'var(--text-muted, #6b7280)', marginTop: '8px', display: 'block' }}>
                    {theme === 'system' ? 'Follows your device preference' : `Active: ${theme} mode`}
                  </small>
                </div>

                <div className="form-group">
                  <label>Language</label>
                  <select
                    value={preferences.language}
                    onChange={e => setPreferences({ ...preferences, language: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <button 
                  onClick={handleSavePreferences}
                  disabled={loading}
                  style={{ width: 'auto' }}
                >
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="card animate-fade-in">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB'
                  }}>
                    <Database size={18} />
                  </div>
                  Data & Privacy
                </h2>

                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ marginBottom: '10px' }}>Export Your Data</h3>
                  <p style={{ color: '#6b7280', marginBottom: '15px' }}>
                    Download a copy of all your data including children profiles, devices, activity logs, and settings.
                  </p>
                  <button 
                    onClick={handleExportData}
                    disabled={loading}
                    style={{ width: 'auto' }}
                  >
                    <Download size={16} /> Export All Data
                  </button>
                </div>

                <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ marginBottom: '10px' }}>Data Retention</h3>
                  <p style={{ color: '#6b7280', marginBottom: '15px' }}>
                    Activity logs are retained for 90 days. Older data is automatically deleted to protect your privacy.
                  </p>
                  <div className="alert alert-success">
                    <strong>Privacy First:</strong>
                    <ul style={{ margin: '10px 0 0 20px' }}>
                      <li>All data is encrypted at rest</li>
                      <li>We never sell your personal information</li>
                      <li>You can delete your data at any time</li>
                      <li>Third-party access is strictly limited</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
