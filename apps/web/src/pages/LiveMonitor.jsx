import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  Monitor, Smartphone, Activity, Battery, BatteryCharging, 
  Pause, Play, MessageSquare, Wifi, WifiOff, Clock,
  AlertCircle, CheckCircle, XCircle, RefreshCw, Send
} from 'lucide-react';

export default function LiveMonitor() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [pauseDuration, setPauseDuration] = useState(30);
  const [pauseMessage, setPauseMessage] = useState('');
  const [deviceMessage, setDeviceMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const wsRef = useRef(null);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/devices/live-status');
      const devicesData = Array.isArray(res.data) ? res.data : (res.data?.devices || []);
      setDevices(devicesData);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = window.location.protocol === 'https:'
      ? `wss://${window.location.host}/api/ws`
      : `ws://${window.location.host}/api/ws`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('[Live Monitor] WebSocket connected');
      socket.send(JSON.stringify({ type: 'auth', token }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'device_status_changed') {
        loadDevices();
      }
    };

    socket.onclose = () => {
      setTimeout(connectWebSocket, 5000);
    };
  }, [loadDevices]);

  useEffect(() => {
    loadDevices();
    connectWebSocket();
    
    const interval = setInterval(loadDevices, 30000);
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loadDevices, connectWebSocket]);

  const getDeviceIcon = (type) => {
    if (type === 'windows' || type === 'macos' || type === 'linux') {
      return <Monitor size={24} />;
    }
    return <Smartphone size={24} />;
  };

  const getStatusBadge = (device) => {
    if (device.isPaused) {
      return (
        <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>
          <Pause size={12} /> Paused
        </span>
      );
    }
    
    switch (device.status) {
      case 'online':
        return (
          <span className="badge badge-active">
            <Wifi size={12} /> Online
          </span>
        );
      case 'stale':
        return (
          <span className="badge badge-warning">
            <Clock size={12} /> Stale
          </span>
        );
      default:
        return (
          <span className="badge badge-inactive">
            <WifiOff size={12} /> Offline
          </span>
        );
    }
  };

  const getBatteryIcon = (level, charging) => {
    if (charging) return <BatteryCharging size={16} color="#14B8A6" />;
    if (level === undefined || level === null) return <Battery size={16} color="#9ca3af" />;
    if (level <= 20) return <Battery size={16} color="#ef4444" />;
    if (level <= 50) return <Battery size={16} color="#f59e0b" />;
    return <Battery size={16} color="#14B8A6" />;
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handlePause = async () => {
    if (!selectedDevice) return;
    
    try {
      setActionLoading(true);
      await api.post(`/devices/${selectedDevice.id}/pause`, {
        durationMinutes: parseInt(pauseDuration),
        message: pauseMessage
      });
      setPauseModalOpen(false);
      setPauseMessage('');
      loadDevices();
    } catch (err) {
      console.error('Failed to pause device:', err);
      alert('Failed to pause device');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async (device) => {
    try {
      setActionLoading(true);
      await api.post(`/devices/${device.id}/resume`);
      loadDevices();
    } catch (err) {
      console.error('Failed to resume device:', err);
      alert('Failed to resume device');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDevice || !deviceMessage.trim()) return;
    
    try {
      setActionLoading(true);
      await api.post(`/devices/${selectedDevice.id}/message`, {
        message: deviceMessage
      });
      setMessageModalOpen(false);
      setDeviceMessage('');
      alert('Message sent successfully!');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message');
    } finally {
      setActionLoading(false);
    }
  };

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const pausedCount = devices.filter(d => d.isPaused).length;
  const totalUsedMinutes = devices.reduce((sum, d) => sum + (d.used_seconds_today || 0) / 60, 0);

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
              <Activity size={24} />
            </div>
            Live Monitor
          </h1>
          
          <button 
            onClick={loadDevices} 
            style={{ width: 'auto' }} 
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #14B8A6' }}>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#14B8A6' }}>{onlineCount}</div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Online Devices</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f59e0b' }}>{pausedCount}</div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Paused</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#3b82f6' }}>{Math.round(totalUsedMinutes)}</div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Minutes Today</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#8b5cf6' }}>{devices.length}</div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Devices</div>
          </div>
        </div>

        {/* Devices Grid */}
        {devices.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <Monitor size={48} style={{ opacity: 0.3, marginBottom: '20px', color: '#2563EB' }} />
            <h3>No devices found</h3>
            <p style={{ color: '#6b7280' }}>Enroll a device to start monitoring.</p>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {devices.map((device, index) => (
              <div 
                key={device.id} 
                className="card animate-slide-up"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  borderLeft: `4px solid ${device.status === 'online' ? '#14B8A6' : device.isPaused ? '#f59e0b' : '#9ca3af'}`,
                  position: 'relative'
                }}
              >
                {/* Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  marginBottom: '15px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      padding: '12px', 
                      background: device.status === 'online' ? '#ccfbf1' : '#f3f4f6', 
                      borderRadius: '12px',
                      color: device.status === 'online' ? '#0f766e' : '#6b7280'
                    }}>
                      {getDeviceIcon(device.device_type)}
                    </div>
                    
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{device.device_name}</h3>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {getStatusBadge(device)}
                        {device.child_name && (
                          <span className="badge badge-info">
                            {device.child_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {device.battery_level !== undefined && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6b7280' }}>
                        {getBatteryIcon(device.battery_level, device.battery_charging)}
                        {device.battery_level}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Current Activity */}
                    <div style={{ 
                      background: device.status === 'online' ? '#f0fdfa' : '#f9fafb', 
                      padding: '12px', 
                      borderRadius: '10px',
                      marginBottom: '15px'
                    }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    {device.status === 'online' ? 'Currently Active' : 'Last Activity'}
                  </div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>
                    {device.current_app || device.last_app_used || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                    {formatTimeAgo(device.last_heartbeat_at || device.last_seen)}
                  </div>
                </div>

                {/* Usage Stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Today's Usage</div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{Math.floor(device.used_seconds_today / 60)}m</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Daily Limit</div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{device.daily_limit_minutes || 120}m</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Remaining</div>
                    <div style={{ fontWeight: '600', color: '#14B8A6' }}>{Math.max(0, (device.daily_limit_minutes || 120) - Math.floor(device.used_seconds_today / 60))}m</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {device.isPaused ? (
                    <button 
                      onClick={() => handleResume(device)}
                      disabled={actionLoading}
                      className="btn-success"
                      style={{ flex: 1, fontSize: '13px' }}
                    >
                      <Play size={14} /> Resume
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setSelectedDevice(device); setPauseModalOpen(true); }}
                      disabled={actionLoading || device.status !== 'online'}
                      className="btn-warning"
                      style={{ flex: 1, fontSize: '13px' }}
                    >
                      <Pause size={14} /> Pause
                    </button>
                  )}
                  
                  <button 
                    onClick={() => { setSelectedDevice(device); setMessageModalOpen(true); }}
                    disabled={actionLoading}
                    style={{ flex: 1, fontSize: '13px' }}
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pause Modal */}
      {pauseModalOpen && selectedDevice && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPauseModalOpen(false); }}>
          <div className="modal-content">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Pause size={24} color="#f59e0b" /> Pause Device
            </h2>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Temporarily pause {selectedDevice.device_name}. The device will show a pause screen.
            </p>
            
            <div className="form-group">
              <label>Duration (minutes)</label>
              <select 
                value={pauseDuration} 
                onChange={e => setPauseDuration(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4 hours</option>
                <option value="1440">Until tomorrow</option>
              </select>
            </div>

            <div className="form-group">
              <label>Message (optional)</label>
              <input 
                type="text"
                value={pauseMessage}
                onChange={e => setPauseMessage(e.target.value)}
                placeholder="e.g., Time for dinner!"
                maxLength={100}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
              <button 
                type="button" 
                onClick={() => setPauseModalOpen(false)} 
                className="btn-secondary" 
                style={{ width: '100%' }}
              >
                Cancel
              </button>
              <button 
                onClick={handlePause}
                disabled={actionLoading}
                className="btn-warning"
                style={{ width: '100%' }}
              >
                {actionLoading ? 'Pausing...' : 'Pause Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageModalOpen && selectedDevice && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMessageModalOpen(false); }}>
          <div className="modal-content">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={24} color="#2563EB" /> Send Message
            </h2>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Send a message to {selectedDevice.device_name}. It will appear as a notification on the device.
            </p>
            
            <div className="form-group">
              <label>Message</label>
              <textarea 
                value={deviceMessage}
                onChange={e => setDeviceMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                maxLength={500}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <small style={{ color: '#9ca3af' }}>{deviceMessage.length}/500 characters</small>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
              <button 
                type="button" 
                onClick={() => setMessageModalOpen(false)} 
                className="btn-secondary" 
                style={{ width: '100%' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSendMessage}
                disabled={actionLoading || !deviceMessage.trim()}
                style={{ width: '100%' }}
              >
                <Send size={16} /> {actionLoading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
