import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { 
  Users, UserPlus, Mail, Clock, CheckCircle, XCircle, 
  Shield, AlertTriangle, Trash2, Send, RefreshCw,
  UserCheck, UserX, Info
} from 'lucide-react';

export default function FamilySharing() {
  const [sharedAccess, setSharedAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  const loadSharedAccess = async () => {
    try {
      setLoading(true);
      const res = await api.get('/share');
      setSharedAccess(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to load shared access:', err);
      setError('Failed to load shared access list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharedAccess();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setInviteLoading(true);
      setError('');
      
      await api.post('/share/invite', { email: inviteEmail });
      
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      loadSharedAccess();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to send invitation:', err);
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/share/${id}`);
      
      setSuccess('Access revoked successfully');
      loadSharedAccess();
      setShowConfirmModal(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to revoke access:', err);
      setError(err.response?.data?.error || 'Failed to revoke access');
      setShowConfirmModal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/share/${id}`);
      
      setSuccess('Invitation cancelled');
      loadSharedAccess();
      setShowConfirmModal(null);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      setError(err.response?.data?.error || 'Failed to cancel invitation');
      setShowConfirmModal(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={18} style={{ color: '#10b981' }} />;
      case 'pending':
        return <Clock size={18} style={{ color: '#f59e0b' }} />;
      case 'rejected':
        return <XCircle size={18} style={{ color: '#ef4444' }} />;
      default:
        return <Info size={18} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Declined';
      default:
        return status;
    }
  };

  const pendingInvites = sharedAccess.filter(s => s.status === 'pending');
  const activeShares = sharedAccess.filter(s => s.status === 'accepted');
  const _declinedInvites = sharedAccess.filter(s => s.status === 'rejected');

  return (
    <div className="page-container">
      <Header />
      <div className="container animate-fade-in">
        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Users size={32} style={{ color: '#2563EB' }} />
              Family Sharing
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '16px' }}>
              Share screen time reports and manage access for family members
            </p>
          </div>
          
          <button
            onClick={loadSharedAccess}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#dc2626'
          }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {success && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#16a34a'
          }}>
            <CheckCircle size={20} />
            <span>{success}</span>
            <button 
              onClick={() => setSuccess('')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={24} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {sharedAccess.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Shares</div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={24} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {activeShares.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={24} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {pendingInvites.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Invite Form */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <UserPlus size={20} style={{ color: '#2563EB' }} />
              Invite Family Member
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px 0' }}>
              Send an invitation to share screen time reports
            </p>

            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af'
                  }} />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family@example.com"
                    disabled={inviteLoading}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{
                background: '#f0f9ff',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px'
              }}>
                <Shield size={18} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0369a1', marginBottom: '2px' }}>
                    What they'll see
                  </div>
                  <div style={{ fontSize: '12px', color: '#0ea5e9' }}>
                    Invited members can view screen time reports and activity data for all your children, but cannot modify settings.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: inviteLoading || !inviteEmail ? '#9ca3af' : '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: inviteLoading || !inviteEmail ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {inviteLoading ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Invitation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Shared Access List */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Users size={20} style={{ color: '#2563EB' }} />
              Shared With
            </h2>

            {sharedAccess.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280'
              }}>
                <Users size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>No shared access yet</p>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Invite family members to share screen time reports
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sharedAccess.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      border: '1px solid #f3f4f6'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: share.status === 'accepted' ? '#dbeafe' : '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {share.status === 'accepted' ? (
                        <UserCheck size={20} style={{ color: '#2563EB' }} />
                      ) : (
                        <Clock size={20} style={{ color: '#f59e0b' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {share.viewer_email}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {getStatusIcon(share.status)}
                        <span>{getStatusText(share.status)}</span>
                        <span style={{ color: '#d1d5db' }}>•</span>
                        <span>{new Date(share.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowConfirmModal(share)}
                      style={{
                        padding: '8px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.color = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#9ca3af';
                      }}
                      title={share.status === 'pending' ? 'Cancel invitation' : 'Revoke access'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div style={{
          marginTop: '32px',
          background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #dbeafe'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1e40af',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Info size={18} />
            About Family Sharing
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#3b82f6',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <li>Invited members receive read-only access to screen time reports</li>
            <li>They can view activity for all children on your account</li>
            <li>Only you can modify time limits, blocked apps, and settings</li>
            <li>You can revoke access at any time</li>
            <li>Pending invitations expire after 7 days</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={24} style={{ color: '#dc2626' }} />
            </div>

            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              {showConfirmModal.status === 'pending' ? 'Cancel Invitation?' : 'Revoke Access?'}
            </h3>

            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              margin: '0 0 20px 0',
              lineHeight: '1.5'
            }}>
              {showConfirmModal.status === 'pending' 
                ? `Are you sure you want to cancel the invitation sent to ${showConfirmModal.viewer_email}?`
                : `Are you sure you want to revoke access for ${showConfirmModal.viewer_email}? They will no longer be able to view your screen time reports.`
              }
            </p>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowConfirmModal(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Keep
              </button>
              <button
                onClick={() => {
                  if (showConfirmModal.status === 'pending') {
                    handleCancelInvite(showConfirmModal.id);
                  } else {
                    handleRevoke(showConfirmModal.id);
                  }
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Processing...' : (showConfirmModal.status === 'pending' ? 'Cancel' : 'Revoke')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
