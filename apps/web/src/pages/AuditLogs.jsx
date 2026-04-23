import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  History, Filter, Search, Calendar, User, Clock,
  ChevronDown, ChevronUp, FileText, Download, RefreshCw,
  Shield, Smartphone, UserCircle, Gift, CalendarDays,
  Settings, AlertCircle, CheckCircle, XCircle, Eye
} from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    limit: 25,
    offset: 0,
    total: 0,
    hasMore: false
  });

  // Load logs with useCallback to fix dependency warning
  const loadLogs = useCallback(async (resetOffset = true) => {
    try {
      setLoading(true);
      const offset = resetOffset ? 0 : pagination.offset;
      
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: offset
      });
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const res = await api.get(`/audit-logs?${params}`);
      
      // Defensive coding: ensure res.data is an object with expected properties
      const data = res.data || {};
      const logsData = Array.isArray(data.logs) ? data.logs : [];
      const paginationData = data.pagination || {};
      
      if (resetOffset) {
        setLogs(logsData);
      } else {
        setLogs(prev => [...prev, ...logsData]);
      }
      
      setPagination({
        limit: paginationData.limit || 25,
        offset: offset + logsData.length,
        total: paginationData.total || 0,
        hasMore: paginationData.hasMore || false
      });
    } catch (err) {
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, filters]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/audit-logs/stats?days=30');
      // Defensive coding: ensure stats is an object
      setStats(res.data || {});
    } catch (err) {
      console.error('Failed to load audit stats:', err);
      setStats({});
    }
  }, []);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadLogs(true);
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setTimeout(() => loadLogs(true), 0);
  };

  const loadMore = () => {
    loadLogs(false);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return <CheckCircle size={16} className="text-green-500" />;
    if (action.includes('UPDATE')) return <Settings size={16} className="text-blue-500" />;
    if (action.includes('DELETE')) return <XCircle size={16} className="text-red-500" />;
    if (action.includes('PAUSE')) return <AlertCircle size={16} className="text-orange-500" />;
    if (action.includes('RESUME')) return <RefreshCw size={16} className="text-green-500" />;
    if (action.includes('GRANT')) return <Gift size={16} className="text-purple-500" />;
    return <FileText size={16} className="text-gray-500" />;
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'child': return <UserCircle size={16} />;
      case 'device': return <Smartphone size={16} />;
      case 'schedule': return <CalendarDays size={16} />;
      case 'policy': return <Shield size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const formatActionName = (action) => {
    return action.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: 'var(--bg-color, #f8fafc)' }}>
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
              <History size={24} />
            </div>
            Audit Logs
          </h1>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={exportLogs}
              disabled={logs.length === 0}
              className="btn-secondary"
            >
              <Download size={16} /> Export
            </button>
            <button 
              onClick={() => { loadLogs(true); loadStats(); }}
              disabled={loading}
              className="btn-secondary"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px',
            marginBottom: '25px'
          }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Actions (30d)
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563EB' }}>
                {stats.totalActions}
              </div>
            </div>
            
            {stats.actionsByType?.slice(0, 3).map((action, idx) => (
              <div key={idx} className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {formatActionName(action.action)}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#14B8A6' }}>
                  {action.count}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ marginBottom: '25px' }}>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              width: '100%',
              padding: '15px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <Filter size={18} />
            Filters
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {showFilters && (
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Search
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Search actions or entities..."
                      value={filters.search}
                      onChange={e => handleFilterChange('search', e.target.value)}
                      style={{ paddingLeft: '35px' }}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Action Type
                  </label>
                  <select 
                    value={filters.action} 
                    onChange={e => handleFilterChange('action', e.target.value)}
                  >
                    <option value="">All Actions</option>
                    <option value="UPDATE_CHILD">Update Child</option>
                    <option value="UPDATE_POLICY">Update Policy</option>
                    <option value="CREATE_SCHEDULE">Create Schedule</option>
                    <option value="UPDATE_SCHEDULE">Update Schedule</option>
                    <option value="GRANT_BONUS_TIME">Grant Bonus Time</option>
                    <option value="PAUSE_DEVICE">Pause Device</option>
                    <option value="RESUME_DEVICE">Resume Device</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Entity Type
                  </label>
                  <select 
                    value={filters.entityType} 
                    onChange={e => handleFilterChange('entityType', e.target.value)}
                  >
                    <option value="">All Entities</option>
                    <option value="child">Child</option>
                    <option value="device">Device</option>
                    <option value="schedule">Schedule</option>
                    <option value="policy">Policy</option>
                  </select>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={e => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={e => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={clearFilters} className="btn-secondary">
                  Clear
                </button>
                <button onClick={applyFilters}>
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Logs Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
              <History size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
              <h3 style={{ margin: '0 0 8px 0' }}>No audit logs found</h3>
              <p>Actions you take will be recorded here for accountability.</p>
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                      Time
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                      Action
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                      Entity
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                      Details
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                      
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <React.Fragment key={log.id}>
                      <tr 
                        style={{ 
                          borderBottom: '1px solid #f3f4f6',
                          background: idx % 2 === 0 ? 'white' : '#fafafa'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} />
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getActionIcon(log.action)}
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>
                              {formatActionName(log.action)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getEntityIcon(log.entity_type)}
                            <span style={{ fontSize: '13px' }}>
                              {log.entity_name || log.entity_type}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {log.new_values && Object.keys(log.new_values).slice(0, 2).map(key => (
                            <span key={key} style={{ marginRight: '10px' }}>
                              {key}: {typeof log.new_values[key] === 'object' 
                                ? JSON.stringify(log.new_values[key]).slice(0, 20) + '...'
                                : String(log.new_values[key]).slice(0, 30)
                              }
                            </span>
                          ))}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              cursor: 'pointer',
                              padding: '4px',
                              color: '#6b7280'
                            }}
                          >
                            {expandedLog === log.id ? <ChevronUp size={18} /> : <Eye size={18} />}
                          </button>
                        </td>
                      </tr>
                      
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={5} style={{ padding: '0', background: '#f9fafb' }}>
                            <div style={{ padding: '20px' }}>
                              <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Full Details</h4>
                              
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                                gap: '20px'
                              }}>
                                <div>
                                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                                    Action
                                  </label>
                                  <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                                    {log.action}
                                  </div>
                                </div>
                                
                                <div>
                                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                                    Entity Type
                                  </label>
                                  <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                                    {log.entity_type}
                                  </div>
                                </div>
                                
                                <div>
                                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                                    Entity Name
                                  </label>
                                  <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                                    {log.entity_name || 'N/A'}
                                  </div>
                                </div>
                                
                                <div>
                                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                                    Timestamp
                                  </label>
                                  <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              
                              {(log.old_values || log.new_values) && (
                                <div style={{ marginTop: '20px' }}>
                                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                                    Changes
                                  </label>
                                  <pre style={{ 
                                    marginTop: '8px',
                                    padding: '15px',
                                    background: '#1f2937',
                                    color: '#e5e7eb',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    fontSize: '13px',
                                    maxHeight: '300px'
                                  }}>
                                    {JSON.stringify({
                                      old: log.old_values,
                                      new: log.new_values
                                    }, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {log.metadata && (
                                <div style={{ marginTop: '20px' }}>
                                  <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                                    Metadata
                                  </label>
                                  <pre style={{ 
                                    marginTop: '8px',
                                    padding: '15px',
                                    background: '#f3f4f6',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    fontSize: '13px',
                                    maxHeight: '200px'
                                  }}>
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {pagination.hasMore && (
                <div style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                  <button 
                    onClick={loadMore}
                    disabled={loading}
                    className="btn-secondary"
                    style={{ minWidth: '200px' }}
                  >
                    {loading ? 'Loading...' : `Load More (${pagination.total - pagination.offset} remaining)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        <p style={{ marginTop: '15px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          Audit logs are retained for 90 days for security and accountability purposes.
        </p>
      </div>
    </div>
  );
}
