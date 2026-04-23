import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    Bell, Check, Trash2, Filter, Search, RefreshCw, 
    CheckCheck, AlertCircle, Clock, Calendar, Monitor, 
    Target, Gift, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import Header from '../components/Header';
import api from '../lib/api';

const NOTIFICATION_TYPES = [
    { id: 'all', label: 'All', icon: Bell, color: '#6b7280' },
    { id: 'time_limit', label: 'Time Limits', icon: Clock, color: '#f59e0b' },
    { id: 'blocked_app', label: 'Blocked Apps', icon: AlertCircle, color: '#ef4444' },
    { id: 'schedule_started', label: 'Schedules', icon: Calendar, color: '#8b5cf6' },
    { id: 'device_offline', label: 'Device Status', icon: Monitor, color: '#6b7280' },
    { id: 'goal_completed', label: 'Goals', icon: Target, color: '#22c55e' },
    { id: 'reward_redeemed', label: 'Rewards', icon: Gift, color: '#ec4899' },
    { id: 'bonus_granted', label: 'Bonus Time', icon: Gift, color: '#14b8a6' },
];

const ITEMS_PER_PAGE = 20;

export default function Notifications() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'all');
    const [filterRead, setFilterRead] = useState(searchParams.get('read') || 'all');
    const [currentPage, setCurrentPage] = useState(1);
    const [stats, setStats] = useState({
        total: 0,
        unread: 0,
        today: 0
    });
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Load notifications from API
    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const res = await api.get('/notifications?limit=500');
            const notificationsData = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
            setNotifications(notificationsData);
            
            // Calculate stats
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            setStats({
                total: notificationsData.length,
                unread: notificationsData.filter(n => !n.is_read).length,
                today: notificationsData.filter(n => new Date(n.created_at) >= today).length
            });
        } catch (err) {
            console.error('Failed to load notifications:', err);
            setError('Failed to load notifications. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Filter notifications based on search, type, and read status
    useEffect(() => {
        let filtered = [...notifications];
        
        // Filter by type
        if (selectedType !== 'all') {
            filtered = filtered.filter(n => n.type === selectedType);
        }
        
        // Filter by read status
        if (filterRead === 'unread') {
            filtered = filtered.filter(n => !n.is_read);
        } else if (filterRead === 'read') {
            filtered = filtered.filter(n => n.is_read);
        }
        
        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(n => 
                n.title?.toLowerCase().includes(query) ||
                n.message?.toLowerCase().includes(query) ||
                n.child_name?.toLowerCase().includes(query)
            );
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        setFilteredNotifications(filtered);
        setCurrentPage(1);
        setSelectedItems(new Set());
    }, [notifications, selectedType, filterRead, searchQuery]);

    // Update URL params when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedType !== 'all') params.set('type', selectedType);
        if (filterRead !== 'all') params.set('read', filterRead);
        setSearchParams(params);
    }, [selectedType, filterRead, setSearchParams]);

    // Initial load
    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Mark single notification as read
    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => 
                n.id === id ? { ...n, is_read: true } : n
            ));
            setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setStats(prev => ({ ...prev, unread: 0 }));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    // Delete notification
    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            const deleted = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setStats(prev => ({
                ...prev,
                total: prev.total - 1,
                unread: deleted?.is_read ? prev.unread : Math.max(0, prev.unread - 1)
            }));
            setSelectedItems(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    // Delete selected notifications
    const deleteSelected = async () => {
        try {
            const promises = Array.from(selectedItems).map(id => 
                api.delete(`/notifications/${id}`)
            );
            await Promise.all(promises);
            
            const deletedNotifications = notifications.filter(n => selectedItems.has(n.id));
            const unreadDeleted = deletedNotifications.filter(n => !n.is_read).length;
            
            setNotifications(prev => prev.filter(n => !selectedItems.has(n.id)));
            setStats(prev => ({
                ...prev,
                total: prev.total - selectedItems.size,
                unread: Math.max(0, prev.unread - unreadDeleted)
            }));
            setSelectedItems(new Set());
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('Failed to delete selected:', err);
        }
    };

    // Delete all filtered notifications
    const deleteAllFiltered = async () => {
        try {
            const ids = filteredNotifications.map(n => n.id);
            const promises = ids.map(id => api.delete(`/notifications/${id}`));
            await Promise.all(promises);
            
            const unreadDeleted = filteredNotifications.filter(n => !n.is_read).length;
            
            setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
            setStats(prev => ({
                ...prev,
                total: prev.total - ids.length,
                unread: Math.max(0, prev.unread - unreadDeleted)
            }));
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('Failed to delete all:', err);
        }
    };

    // Toggle selection
    const toggleSelection = (id) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Select all on current page
    const selectAllOnPage = () => {
        const pageIds = paginatedNotifications.map(n => n.id);
        const allSelected = pageIds.every(id => selectedItems.has(id));
        
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (allSelected) {
                pageIds.forEach(id => next.delete(id));
            } else {
                pageIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    // Get notification icon
    const getNotificationIcon = (type) => {
        const typeConfig = NOTIFICATION_TYPES.find(t => t.id === type) || NOTIFICATION_TYPES[0];
        return typeConfig;
    };

    // Format time
    const formatTime = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diff = Math.floor((now - notifDate) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return notifDate.toLocaleDateString();
    };

    // Pagination
    const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
    const paginatedNotifications = filteredNotifications.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <Header />
            
            <div className="container" style={{ padding: '24px' }}>
                {/* Page Header */}
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <Bell size={28} color="#2563EB" />
                        Notification Center
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '15px' }}>
                        Manage all your alerts and updates in one place
                    </p>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
                            {stats.total}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                            Total Notifications
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563EB' }}>
                            {stats.unread}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                            Unread
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e' }}>
                            {stats.today}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                            Today
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    marginBottom: '16px'
                }}>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        {/* Type Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={18} color="#6b7280" />
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '14px',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                {NOTIFICATION_TYPES.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            
                            <select
                                value={filterRead}
                                onChange={(e) => setFilterRead(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '14px',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Status</option>
                                <option value="unread">Unread Only</option>
                                <option value="read">Read Only</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '300px' }}>
                            <Search size={18} color="#6b7280" />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={loadNotifications}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '14px'
                                }}
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                            
                            {stats.unread > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #22c55e',
                                        background: '#f0fdf4',
                                        color: '#16a34a',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}
                                >
                                    <CheckCheck size={16} />
                                    Mark All Read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedItems.size > 0 && (
                        <div style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                {selectedItems.size} selected
                            </span>
                            <button
                                onClick={() => setSelectedItems(new Set())}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                Clear Selection
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #ef4444',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Trash2 size={14} />
                                Delete Selected
                            </button>
                        </div>
                    )}
                </div>

                {/* Notification List */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden'
                }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 60px 1fr 120px 100px',
                        gap: '12px',
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e5e7eb',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <input
                            type="checkbox"
                            checked={paginatedNotifications.length > 0 && paginatedNotifications.every(n => selectedItems.has(n.id))}
                            onChange={selectAllOnPage}
                            style={{ cursor: 'pointer' }}
                        />
                        <div>Type</div>
                        <div>Notification</div>
                        <div>Time</div>
                        <div>Actions</div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} color="#2563EB" />
                            <p style={{ color: '#6b7280', marginTop: '12px' }}>Loading notifications...</p>
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <AlertCircle size={32} color="#ef4444" />
                            <p style={{ color: '#6b7280', marginTop: '12px' }}>{error}</p>
                            <button
                                onClick={loadNotifications}
                                style={{
                                    marginTop: '16px',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && filteredNotifications.length === 0 && (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Bell size={48} color="#d1d5db" />
                            <h3 style={{ margin: '16px 0 8px', color: '#374151', fontSize: '18px' }}>
                                No notifications found
                            </h3>
                            <p style={{ color: '#6b7280' }}>
                                {searchQuery || selectedType !== 'all' || filterRead !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'You\'ll see notifications here when events occur'}
                            </p>
                        </div>
                    )}

                    {/* Notifications */}
                    {!loading && !error && paginatedNotifications.map((notification) => {
                        const typeConfig = getNotificationIcon(notification.type);
                        const TypeIcon = typeConfig.icon;
                        
                        return (
                            <div
                                key={notification.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 60px 1fr 120px 100px',
                                    gap: '12px',
                                    padding: '16px',
                                    borderBottom: '1px solid #f3f4f6',
                                    background: notification.is_read ? 'white' : '#eff6ff',
                                    transition: 'background 0.2s',
                                    alignItems: 'center'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedItems.has(notification.id)}
                                    onChange={() => toggleSelection(notification.id)}
                                    style={{ cursor: 'pointer' }}
                                />
                                
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: `${typeConfig.color}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <TypeIcon size={20} color={typeConfig.color} />
                                </div>
                                
                                <div style={{ minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: notification.is_read ? '500' : '600',
                                        fontSize: '14px',
                                        color: '#111827',
                                        marginBottom: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        {notification.title}
                                        {!notification.is_read && (
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#2563EB'
                                            }} />
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        color: '#6b7280',
                                        lineHeight: '1.4',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {notification.message}
                                    </div>
                                    {notification.child_name && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#2563EB',
                                            marginTop: '4px'
                                        }}>
                                            Child: {notification.child_name}
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    {formatTime(notification.created_at)}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                color: '#22c55e'
                                            }}
                                            title="Mark as read"
                                        >
                                            <Check size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(notification.id)}
                                        style={{
                                            padding: '6px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            color: '#9ca3af'
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '24px'
                    }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                background: 'white',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                background: 'white',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '400px',
                        maxWidth: '90%'
                    }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: '600' }}>
                            Confirm Delete
                        </h3>
                        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                            Are you sure you want to delete {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'all filtered'} notifications? 
                            This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={selectedItems.size > 0 ? deleteSelected : deleteAllFiltered}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
