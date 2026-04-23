import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { User, Share2, Mail, Users, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function Profile() {
    const [profile, setProfile] = useState({ full_name: '', email: '', bio: '' });
    const [sharedViewers, setSharedViewers] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProfile();
        loadSharedAccess();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await api.get('/profile');
            setProfile(res.data);
        } catch { console.error('Failed to load profile'); }
    };

    const loadSharedAccess = async () => {
        try {
            const res = await api.get('/share');
            setSharedViewers(res.data);
        } catch { console.error('Failed to load shared access'); }
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.put('/profile', profile);
            setMsg('Profile updated successfully!');
            setTimeout(() => setMsg(''), 3000);
        } catch {
            setError('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const sendInvite = async (e) => {
        e.preventDefault();
        try {
            await api.post('/share/invite', { viewerEmail: inviteEmail });
            setInviteEmail('');
            loadSharedAccess();
            setMsg('Invitation sent successfully!');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            if (err.response && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError('Failed to send invite');
            }
        }
    };

    return (
        <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <Header />
            <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
                <h1 style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'center',
                    marginBottom: '30px'
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
                        <User size={24} />
                    </div>
                    My Profile
                </h1>

                {/* Alerts */}
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}
                
                {msg && (
                    <div className="alert alert-success" style={{ marginBottom: '20px' }}>
                        <CheckCircle size={20} />
                        {msg}
                    </div>
                )}

                {/* Profile Form */}
                <div className="card animate-slide-up" style={{ borderLeft: '4px solid #2563EB' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Personal Information</h2>
                    
                    <form onSubmit={updateProfile}>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input
                                    id="fullName"
                                    value={profile.full_name || ''}
                                    onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                    placeholder="Jane Doe"
                                    style={{ marginBottom: 0 }}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={profile.email || ''}
                                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                                    placeholder="jane@example.com"
                                    style={{ marginBottom: 0 }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '10px' }}>
                            <label htmlFor="bio">Bio / Notes</label>
                            <textarea
                                id="bio"
                                value={profile.bio || ''}
                                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                placeholder="A bit about yourself..."
                                rows={4}
                                style={{ 
                                    width: '100%', 
                                    resize: 'vertical',
                                    minHeight: '100px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" disabled={loading} style={{ width: 'auto' }}>
                                <Save size={18} /> 
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Shared Access */}
                <h2 style={{ 
                    marginTop: '40px', 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'center' 
                }}>
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
                        <Share2 size={18} />
                    </div>
                    Delegated Access
                </h2>
                
                <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                    Allow other parents or guardians to view screen time reports. They cannot change settings.
                </p>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Invite Form */}
                    <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={18} color="#2563EB" />
                            Invite a Parent
                        </h3>
                        
                        <form onSubmit={sendInvite}>
                            <div className="form-group">
                                <label htmlFor="inviteEmail">Email Address</label>
                                <input
                                    id="inviteEmail"
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder="partner@example.com"
                                    style={{ marginBottom: '10px' }}
                                />
                            </div>
                            
                            <button type="submit" style={{ width: '100%' }}>
                                <Mail size={16} /> Send Invite
                            </button>
                        </form>
                    </div>

                    {/* List */}
                    <div className="card animate-slide-up" style={{ animationDelay: '200ms' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} color="#2563EB" />
                            Who has access?
                        </h3>
                        
                        {sharedViewers.length === 0 && (
                            <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                                No one yet. Invite someone above.
                            </p>
                        )}

                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {sharedViewers.map(share => (
                                <li 
                                    key={share.id} 
                                    style={{ 
                                        padding: '12px 0', 
                                        borderBottom: '1px solid #f3f4f6',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ fontWeight: 500 }}>{share.viewer_email}</span>
                                    <span className={`badge badge-${share.status === 'accepted' ? 'active' : 'warning'}`}>
                                        {share.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
