import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  Clock, CheckCircle, XCircle, MessageSquare, Filter,
  User, Smartphone, Calendar, AlertCircle, Clock3,
  ChevronDown, ChevronUp, Timer, AppWindow, CalendarClock
} from 'lucide-react';

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', color: '#d97706', icon: Clock3 },
  approved: { bg: '#d1fae5', color: '#059669', icon: CheckCircle },
  denied: { bg: '#fee2e2', color: '#dc2626', icon: XCircle },
  expired: { bg: '#e5e7eb', color: '#6b7280', icon: Clock },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af', icon: XCircle }
};

const REQUEST_TYPE_LABELS = {
  extra_time: { label: 'Extra Time', icon: Timer },
  app_access: { label: 'App Access', icon: AppWindow },
  schedule_override: { label: 'Schedule Override', icon: CalendarClock }
};

export default function TimeRequests() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, denied: 0, today_total: 0 });
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedChild, setSelectedChild] = useState('all');
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [responseModal, setResponseModal] = useState(null);
  const [responseData, setResponseData] = useState({ approvedMinutes: '', parentResponse: '' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load children for filter
      const childrenRes = await api.get('/children');
      setChildren(childrenRes.data);
      
      // Load stats
      const statsRes = await api.get('/time-requests/stats');
      setStats(statsRes.data);
      
      // Load requests with filters
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (selectedChild !== 'all') params.append('childId', selectedChild);
      
      const requestsRes = await api.get(`/time-requests?${params}`);
      setRequests(requestsRes.data);
    } catch (err) {
      console.error('Failed to load time requests:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, selectedChild]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespond = async (id, status) => {
    try {
      const request = requests.find(r => r.id === id);
      const maxMinutes = request?.requested_value || 60;
      
      const payload = {
        status,
        approvedMinutes: status === 'approved' ? (parseInt(responseData.approvedMinutes) || maxMinutes) : null,
        parentResponse: responseData.parentResponse
      };
      
      await api.put(`/time-requests/${id}/respond`, payload);
      
      setResponseModal(null);
      setResponseData({ approvedMinutes: '', parentResponse: '' });
      loadData();
    } catch (err) {
      console.error('Failed to respond to request:', err);
      alert('Failed to respond. Please try again.');
    }
  };

  const openResponseModal = (request, action) => {
    setResponseModal({ request, action });
    setResponseData({
      approvedMinutes: request.requested_value || '',
      parentResponse: ''
    });
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const config = STATUS_COLORS[status] || STATUS_COLORS.pending;
    const Icon = config.icon;
    return (
      <span className="badge" style={{ 
        background: config.bg, 
        color: config.color,
        textTransform: 'capitalize'
      }}>
        <Icon size={12} /> {status}
      </span>
    );
  };

  const getRequestTypeBadge = (type) => {
    const config = REQUEST_TYPE_LABELS[type] || REQUEST_TYPE_LABELS.extra_time;
    const Icon = config.icon;
    return (
      <span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
        <Icon size={12} /> {config.label}
      </span>
    );
  };

  return (
    <div className="page-container">
      <Header />

      <div className="container animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent mb-2">
            Time Requests
          </h1>
          <p className="text-gray-600">
            Manage requests for extra screen time and app access from your children
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats.pending}</p>
              </div>
              <Clock3 size={32} style={{ color: '#f59e0b', opacity: 0.5 }} />
            </div>
          </div>
          
          <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{stats.approved}</p>
              </div>
              <CheckCircle size={32} style={{ color: '#10b981', opacity: 0.5 }} />
            </div>
          </div>
          
          <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Denied</p>
                <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats.denied}</p>
              </div>
              <XCircle size={32} style={{ color: '#ef4444', opacity: 0.5 }} />
            </div>
          </div>
          
          <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold" style={{ color: '#6366f1' }}>{stats.today_total}</p>
              </div>
              <Calendar size={32} style={{ color: '#6366f1', opacity: 0.5 }} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field"
              style={{ width: 'auto', minWidth: '140px' }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="expired">Expired</option>
            </select>
            
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="input-field"
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="all">All Children</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="card text-center py-12">
            <div className="animate-pulse flex flex-col items-center">
              <Clock3 size={48} className="text-blue-300 mb-4" />
              <p className="text-gray-500">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="card text-center py-16">
            <div className="mb-4">
              <Clock size={64} className="mx-auto text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No requests found</h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? "When your children request extra time or app access, they'll appear here."
                : `No ${filter} requests match your filters.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <div 
                key={request.id} 
                className="card hover:shadow-lg transition-shadow"
                style={{ 
                  borderLeft: `4px solid ${STATUS_COLORS[request.status]?.color || '#9ca3af'}` 
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(request.status)}
                      {getRequestTypeBadge(request.request_type)}
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <User size={14} /> {request.child_name}
                      </span>
                      {request.device_name && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Smartphone size={14} /> {request.device_name}
                        </span>
                      )}
                      <span className="text-sm text-gray-400">
                        {formatTimeAgo(request.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {request.request_type === 'extra_time' && `Request for ${request.requested_value} extra minutes`}
                      {request.request_type === 'app_access' && `Request to use ${request.requested_app}`}
                      {request.request_type === 'schedule_override' && `Request to override schedule`}
                    </h3>
                    
                    <p className="text-gray-600 mb-3">
                      <span className="font-medium">Reason:</span> {request.reason}
                    </p>
                    
                    {request.status === 'approved' && (
                      <div className="bg-green-50 p-3 rounded-lg mb-3">
                        <p className="text-sm text-green-800">
                          <CheckCircle size={14} className="inline mr-1" />
                          <strong>Approved:</strong> {request.approved_minutes} minutes
                          {request.parent_response && ` - "${request.parent_response}"`}
                        </p>
                      </div>
                    )}
                    
                    {request.status === 'denied' && request.parent_response && (
                      <div className="bg-red-50 p-3 rounded-lg mb-3">
                        <p className="text-sm text-red-800">
                          <XCircle size={14} className="inline mr-1" />
                          <strong>Response:</strong> "{request.parent_response}"
                        </p>
                      </div>
                    )}
                    
                    {request.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => openResponseModal(request, 'approve')}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button
                          onClick={() => openResponseModal(request, 'deny')}
                          className="btn bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2"
                        >
                          <XCircle size={16} /> Deny
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedRequest === request.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {/* Expanded Details */}
                {expandedRequest === request.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Request ID:</strong> {request.id}</p>
                        <p><strong>Created:</strong> {new Date(request.created_at).toLocaleString()}</p>
                        {request.approved_at && (
                          <p><strong>Responded:</strong> {new Date(request.approved_at).toLocaleString()}</p>
                        )}
                      </div>
                      <div>
                        {request.approved_by_username && (
                          <p><strong>Responded by:</strong> {request.approved_by_username}</p>
                        )}
                        {request.expires_at && (
                          <p><strong>Expires:</strong> {new Date(request.expires_at).toLocaleString()}</p>
                        )}
                        {request.used_at && (
                          <p><strong>Used at:</strong> {new Date(request.used_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {responseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {responseModal.action === 'approve' ? 'Approve Request' : 'Deny Request'}
            </h2>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                <strong>{responseModal.request.child_name}</strong> is requesting:
              </p>
              <p className="font-medium">
                {responseModal.request.request_type === 'extra_time' && 
                  `${responseModal.request.requested_value} extra minutes`}
                {responseModal.request.request_type === 'app_access' && 
                  `Access to ${responseModal.request.requested_app}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">"{responseModal.request.reason}"</p>
            </div>
            
            {responseModal.action === 'approve' && responseModal.request.request_type === 'extra_time' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Minutes to Approve
                </label>
                <input
                  type="number"
                  value={responseData.approvedMinutes}
                  onChange={(e) => setResponseData({ ...responseData, approvedMinutes: e.target.value })}
                  className="input-field"
                  min="1"
                  max="240"
                  placeholder={responseModal.request.requested_value}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Requested: {responseModal.request.requested_value} minutes
                </p>
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">
                Response Message (Optional)
              </label>
              <textarea
                value={responseData.parentResponse}
                onChange={(e) => setResponseData({ ...responseData, parentResponse: e.target.value })}
                className="input-field"
                rows="3"
                placeholder={responseModal.action === 'approve' 
                  ? "Great job on your homework!" 
                  : "Maybe after dinner..."}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResponseModal(null);
                  setResponseData({ approvedMinutes: '', parentResponse: '' });
                }}
                className="btn flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespond(responseModal.request.id, 
                  responseModal.action === 'approve' ? 'approved' : 'denied')}
                className={`btn flex-1 flex items-center justify-center gap-2 ${
                  responseModal.action === 'approve'
                    ? 'btn-primary'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {responseModal.action === 'approve' ? (
                  <><CheckCircle size={18} /> Approve</>
                ) : (
                  <><XCircle size={18} /> Deny</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
