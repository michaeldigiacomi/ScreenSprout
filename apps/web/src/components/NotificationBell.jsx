import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import api from '../lib/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  // Load notifications and setup WebSocket
  useEffect(() => {
    // Load initial data
    const loadInitialData = async () => {
      try {
        const [notifRes, countRes] = await Promise.all([
          api.get('/notifications?limit=20'),
          api.get('/notifications/unread-count')
        ]);
        // Ensure notifications is always an array - API may return object or null
        const notificationsData = Array.isArray(notifRes.data) ? notifRes.data : (notifRes.data?.data || notifRes.data?.notifications || []);
        setNotifications(notificationsData);
        // Handle count as number or object
        const count = typeof countRes.data === 'number' ? countRes.data : (countRes.data?.count || 0);
        setUnreadCount(count);
      } catch (err) {
        console.error('Failed to load notifications:', err);
        // Set safe defaults on error
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    loadInitialData();

    // Setup WebSocket
    const token = localStorage.getItem('token');
    if (token) {
      const wsUrl = window.location.protocol === 'https:'
        ? `wss://${window.location.host}/api/ws`
        : `ws://${window.location.host}/api/ws`;

      const connectWebSocket = () => {
        try {
          const socket = new WebSocket(wsUrl);
          socketRef.current = socket;

          socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'auth', token }));
          };

          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);

              if (data.type === 'new_notification') {
                setNotifications(prev => [data.data, ...prev]);
                setUnreadCount(prev => prev + 1);
                
                if (Notification.permission === 'granted') {
                  new Notification(data.data.title, {
                    body: data.data.message,
                    icon: '/favicon.ico'
                  });
                }
              }
            } catch (parseErr) {
              console.error('Failed to parse WebSocket message:', parseErr);
            }
          };

          socket.onerror = (err) => {
            console.warn('WebSocket error:', err);
          };

          socket.onclose = () => {
            // Only retry if component is still mounted (token still exists)
            if (localStorage.getItem('token')) {
              setTimeout(connectWebSocket, 5000);
            }
          };
        } catch (err) {
          console.error('Failed to create WebSocket connection:', err);
        }
      };

      connectWebSocket();
    }

    // Handle click outside
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'time_limit': return '⏰';
      case 'blocked_app': return '🚫';
      case 'schedule_started': return '📅';
      case 'device_offline': return '💻';
      case 'goal_completed': return '🎯';
      case 'reward_redeemed': return '🎉';
      case 'redemption_status': return '🎁';
      case 'bonus_granted': return '🎁';
      case 'time_request': return '⏳';
      case 'time_request_response': return '✓';
      default: return '🔔';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diff = Math.floor((now - notifDate) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Bell size={20} color="#374151" />
        
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: '0',
          width: '380px',
          maxHeight: '500px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Notifications {unreadCount > 0 && `(${unreadCount} new)`}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}
                >
                  Mark all read
                </button>
              )}
              
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'white'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <Bell size={32} style={{ marginBottom: '10px', opacity: 0.3, color: '#2563EB' }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: notification.is_read ? 'white' : '#eff6ff',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    transition: 'background 0.2s'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: notification.is_read ? '500' : '600',
                      fontSize: '14px',
                      color: '#111827',
                      marginBottom: '2px'
                    }}>
                      {notification.title}
                    </div>
                    
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      lineHeight: '1.4'
                    }}>
                      {notification.message}
                    </div>
                    
                    <div style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      marginTop: '4px'
                    }}>
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px'
                        }}
                        title="Mark as read"
                      >
                        <Check size={14} color="#2563EB" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} color="#9ca3af" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer - View All Link */}
          {notifications.length > 0 && (
            <a
              href="/notifications"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                window.location.href = '/notifications';
              }}
              style={{
                display: 'block',
                padding: '12px 16px',
                textAlign: 'center',
                color: '#2563EB',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                borderTop: '1px solid #f3f4f6',
                background: '#f8fafc',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              View All Notifications →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
