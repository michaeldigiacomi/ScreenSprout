import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { csrfManager } from '../lib/csrf';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [csrfReady, setCsrfReady] = useState(false);
    const navigate = useNavigate();

    // Ensure CSRF token is ready before allowing form submission
    useEffect(() => {
        const initCsrf = async () => {
            try {
                await csrfManager.init();
                setCsrfReady(true);
            } catch (err) {
                console.error('Failed to initialize CSRF:', err);
                // Still allow attempts - the API will handle it
                setCsrfReady(true);
            }
        };
        initCsrf();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!csrfReady) {
            setError('Please wait, initializing...');
            return;
        }

        const endpoint = isRegister ? '/auth/register' : '/auth/login';

        try {
            const res = await api.post(endpoint, { username, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user || { username }));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #ffffff 100%)',
            padding: '20px'
        }}>
            <div className="card animate-slide-up" style={{ 
                width: '100%', 
                maxWidth: '400px',
                textAlign: 'center',
                borderTop: '4px solid transparent',
                borderImage: 'linear-gradient(to right, #2563EB, #14B8A6) 1',
                borderImageSlice: '1 0 0 0'
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '24px' }}>
                    <svg width="48" height="48" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '16px' }}>
                        <rect x="4" y="8" width="32" height="22" rx="3" stroke="url(#g)" strokeWidth="2"/>
                        <path d="M16 30 L14 34 L26 34 L24 30" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M20 20 C20 16 16 14 14 16 C14 18 16 22 20 22 C24 22 26 18 26 16 C24 14 20 16 20 20" fill="url(#g)"/>
                        <defs>
                            <linearGradient id="g" x1="4" y1="8" x2="36" y2="32">
                                <stop offset="0%" stopColor="#2563EB"/>
                                <stop offset="100%" stopColor="#14B8A6"/>
                            </linearGradient>
                        </defs>
                    </svg>
                    
                    <h1 style={{ 
                        margin: 0,
                        background: 'linear-gradient(to right, #2563EB, #14B8A6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: '28px'
                    }}>
                        ScreenSprout
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '8px' }}>
                        {isRegister ? 'Create your account' : 'Welcome back!'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={!csrfReady}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={!csrfReady}
                        />
                    </div>
                    
                    <button type="submit" style={{ width: '100%', marginTop: '10px' }} disabled={!csrfReady}>
                        {isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                {error && (
                    <div className="alert alert-error" style={{ marginTop: '20px' }}>
                        {error}
                    </div>
                )}

                <p style={{ 
                    textAlign: 'center', 
                    marginTop: '24px', 
                    fontSize: '14px', 
                    color: '#6b7280' 
                }}>
                    {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        disabled={!csrfReady}
                        style={{
                            background: 'transparent',
                            color: '#2563EB',
                            padding: 0,
                            fontSize: '14px',
                            fontWeight: '600',
                            boxShadow: 'none',
                            width: 'auto'
                        }}
                    >
                        {isRegister ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
