import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LogOut, User, LayoutDashboard, Calendar, BarChart3,
    FolderOpen, Target, Menu, X, ChevronDown, Settings,
    Bell, Users, Clock, Activity, Globe, MapPin, History,
    Webhook, Home, Shield, Monitor, ChevronRight, Plus,
    Baby, ChevronLeft, PanelLeftClose, PanelLeft
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

// Helper to get initial username from localStorage
const getInitialUsername = () => {
    if (typeof window === 'undefined') return 'User';
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            return user.username || 'User';
        } catch {
            return 'User';
        }
    }
    return 'User';
};

export default function Header({
    isSidebarCollapsed: propIsCollapsed,
    onToggleSidebar,
    isMobile: propIsMobile
}) {
    const [username] = useState(getInitialUsername);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Internal state for backward compatibility
    const [internalIsMobile, setInternalIsMobile] = useState(false);
    const [internalIsSidebarCollapsed, setInternalIsSidebarCollapsed] = useState(false);

    const location = useLocation();
    const userMenuRef = useRef(null);
    const mobileMenuRef = useRef(null);

    // Use props if provided, otherwise internal state
    const isMobile = propIsMobile !== undefined ? propIsMobile : internalIsMobile;
    const isSidebarCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalIsSidebarCollapsed;

    // Toggle handler
    const handleToggleSidebar = () => {
        if (onToggleSidebar) {
            onToggleSidebar();
        } else {
            setInternalIsSidebarCollapsed(!internalIsSidebarCollapsed);
        }
    };

    // Detect mobile screen size and sidebar collapse state (only if props not provided)
    useEffect(() => {
        if (propIsMobile !== undefined && propIsCollapsed !== undefined) return;

        const checkScreenSize = () => {
            const width = window.innerWidth;
            if (propIsMobile === undefined) {
                setInternalIsMobile(width <= 1024);
            }
            // Collapse sidebar at < 1200px (but not on mobile where it's hidden)
            if (propIsCollapsed === undefined) {
                setInternalIsSidebarCollapsed(width < 1200 && width > 1024);
            }
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [propIsMobile, propIsCollapsed]);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && isMobileMenuOpen) {
                const mobileMenuBtn = document.getElementById('mobile-menu-btn');
                if (!mobileMenuBtn || !mobileMenuBtn.contains(e.target)) {
                    setIsMobileMenuOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    // Close mobile menu on route change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const isActive = (path) => location.pathname === path;

    // Main navigation items - organized for parents
    const mainNavItems = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/schedule', icon: Calendar, label: 'Schedule' },
        { path: '/activity-timeline', icon: Activity, label: 'Activity' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
    ];

    // Secondary navigation items
    const secondaryNavItems = [
        { path: '/categories', icon: FolderOpen, label: 'App Categories' },
        { path: '/time-requests', icon: Clock, label: 'Time Requests' },
        { path: '/goals-rewards', icon: Target, label: 'Goals & Rewards' },
        { path: '/location', icon: MapPin, label: 'Location' },
        { path: '/family-sharing', icon: Users, label: 'Family Sharing' },
    ];

    // Settings items
    const settingsNavItems = [
        { path: '/profile', icon: User, label: 'My Profile' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    // Mobile bottom navigation - most important actions
    const bottomNavItems = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/schedule', icon: Calendar, label: 'Schedule' },
        { path: '/activity-timeline', icon: Activity, label: 'Activity' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
        { path: '/#add-child', icon: Plus, label: 'Add Child', special: true },
    ];

    const NavLink = ({ item, inSidebar = false }) => (
        <Link
            to={item.path}
            className={`nav-link ${isActive(item.path) ? 'active-link' : ''}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                color: isActive(item.path) ? 'var(--primary-blue, #2563EB)' : 'var(--text-muted, #4b5563)',
                fontWeight: isActive(item.path) ? '600' : '500',
                fontSize: '14px',
                padding: inSidebar ? '12px 16px' : '10px 16px',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                background: isActive(item.path)
                    ? 'var(--nav-active-bg, linear-gradient(135deg, #eff6ff, #f0f9ff))'
                    : 'transparent',
                border: isActive(item.path) ? '1px solid var(--nav-active-border, #dbeafe)' : '1px solid transparent',
                marginBottom: inSidebar ? '4px' : '0',
            }}
            onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'var(--hover-bg, #f8fafc)';
                    e.currentTarget.style.color = 'var(--primary-blue, #2563EB)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted, #4b5563)';
                }
            }}
        >
            <item.icon size={20} strokeWidth={isActive(item.path) ? 2.5 : 2} />
            <span>{item.label}</span>
        </Link>
    );

    const SidebarNavLink = ({ item, isCollapsed }) => (
        <Link
            to={item.path}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0' : '12px',
                padding: isCollapsed ? '12px' : '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive(item.path) ? 'var(--primary-blue, #2563EB)' : 'var(--text-muted, #4b5563)',
                fontSize: '13px',
                fontWeight: isActive(item.path) ? '600' : '500',
                background: isActive(item.path) ? 'var(--nav-active-bg-light, #eff6ff)' : 'transparent',
                transition: 'all 0.2s ease',
                marginBottom: '2px',
            }}
            onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'var(--hover-bg, #f3f4f6)';
                    e.currentTarget.style.color = 'var(--primary-blue, #2563EB)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted, #4b5563)';
                }
            }}
            title={isCollapsed ? item.label : undefined}
        >
            <item.icon size={isCollapsed ? 22 : 18} strokeWidth={isActive(item.path) ? 2.5 : 2} />
            {!isCollapsed && <span>{item.label}</span>}
        </Link>
    );

    return (
        <>
            {/* Desktop Header */}
            <header style={{
                background: 'var(--header-bg, white)',
                borderBottom: '1px solid var(--header-border, #e5e7eb)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '0 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    height: '68px',
                }}>
                    {/* Left: Logo and Primary Nav */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        {/* Logo */}
                        <Link to="/" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            textDecoration: 'none',
                            flexShrink: 0,
                        }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                            }}>
                                <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                                    <rect x="6" y="10" width="28" height="18" rx="2" stroke="white" strokeWidth="2.5" />
                                    <path d="M16 28 L14 32 L26 32 L24 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                    <circle cx="20" cy="19" r="4" fill="white" />
                                </svg>
                            </div>
                            <span style={{
                                fontWeight: '800',
                                fontSize: '22px',
                                background: 'linear-gradient(to right, #2563EB, #14B8A6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '-0.5px',
                            }}>
                                ScreenSprout
                            </span>
                        </Link>


                    </div>

                    {/* Right: Actions */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        {/* Add Child Button - Prominently Displayed */}
                        <Link
                            to="/#add-child"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 18px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                                color: 'white',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '14px',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
                            }}
                        >
                            <Plus size={18} />
                            <span className="hide-on-small">Add Child</span>
                        </Link>

                        {/* Mobile Menu Button */}
                        {isMobile && (
                            <button
                                id="mobile-menu-btn"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                    background: isMobileMenuOpen ? '#f8fafc' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                title="Menu"
                            >
                                {isMobileMenuOpen ? <X size={22} color="#374151" /> : <Menu size={22} color="#374151" />}
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {/* Notification Bell */}
                        <NotificationBell />

                        {/* User Menu Dropdown */}
                        <div ref={userMenuRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                    background: isUserMenuOpen ? '#f8fafc' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                }}>
                                    {username.charAt(0).toUpperCase()}
                                </div>
                                <span className="username-text" style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {username}
                                </span>
                                <ChevronDown
                                    size={16}
                                    color="#9ca3af"
                                    style={{
                                        transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0)',
                                        transition: 'transform 0.2s',
                                    }}
                                />
                            </button>

                            {/* User Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    right: 0,
                                    width: '220px',
                                    background: 'var(--dropdown-bg, white)',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                    border: '1px solid var(--dropdown-border, #e5e7eb)',
                                    zIndex: 1000,
                                    overflow: 'hidden',
                                    animation: 'slideUp 0.2s ease-out',
                                }}>
                                    {/* User Info Header */}
                                    <div style={{
                                        padding: '16px',
                                        borderBottom: '1px solid var(--border-color, #f3f4f6)',
                                        background: 'var(--bg-secondary, linear-gradient(135deg, #f8fafc, #f0f9ff))',
                                    }}>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            color: 'var(--text-heading, #111827)',
                                        }}>
                                            {username}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--text-muted, #6b7280)',
                                            marginTop: '2px',
                                        }}>
                                            Parent Account
                                        </div>
                                    </div>

                                    {/* Quick Menu Items */}
                                    <div style={{ padding: '8px' }}>
                                        {settingsNavItems.map(item => (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    textDecoration: 'none',
                                                    color: isActive(item.path) ? 'var(--primary-blue, #2563EB)' : 'var(--text-muted, #4b5563)',
                                                    fontSize: '14px',
                                                    fontWeight: isActive(item.path) ? '600' : '500',
                                                    background: isActive(item.path) ? 'var(--nav-active-bg-light, #eff6ff)' : 'transparent',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <item.icon size={18} />
                                                {item.label}
                                            </Link>
                                        ))}

                                        {/* Divider */}
                                        <div style={{
                                            height: '1px',
                                            background: 'var(--border-color, #e5e7eb)',
                                            margin: '8px 0',
                                        }} />

                                        {/* Logout */}
                                        <button
                                            onClick={handleLogout}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <LogOut size={18} />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Persistent Sidebar Navigation - Always Visible */}
            <aside
                className={`sidebar-nav ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                style={{
                    position: 'fixed',
                    left: 0,
                    top: '68px',
                    width: isSidebarCollapsed ? '70px' : '240px',
                    height: 'calc(100vh - 68px)',
                    background: 'var(--sidebar-bg, #f8fafc)',
                    borderRight: '1px solid var(--sidebar-border, #e5e7eb)',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    zIndex: 90,
                    padding: isSidebarCollapsed ? '16px 8px' : '16px 16px',
                    transition: 'width 0.3s ease, padding 0.3s ease',
                }}
            >
                {/* Collapse/Expand Toggle Button */}
                <div style={{
                    display: 'flex',
                    justifyContent: isSidebarCollapsed ? 'center' : 'flex-end',
                    marginBottom: '16px',
                }}>
                    <button
                        onClick={handleToggleSidebar}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color, #e5e7eb)',
                            background: 'var(--bg-secondary, white)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            color: 'var(--text-muted, #6b7280)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--hover-bg, #f3f4f6)';
                            e.currentTarget.style.color = 'var(--primary-blue, #2563EB)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary, white)';
                            e.currentTarget.style.color = 'var(--text-muted, #6b7280)';
                        }}
                        title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {isSidebarCollapsed ? (
                            <PanelLeft size={20} />
                        ) : (
                            <PanelLeftClose size={20} />
                        )}
                    </button>
                </div>

                {/* My Family Section */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                        gap: '8px',
                        padding: isSidebarCollapsed ? '0 0 12px 0' : '0 8px 12px 8px',
                        borderBottom: '1px solid var(--border-color, #e5e7eb)',
                        marginBottom: '12px',
                    }}>
                        <Baby size={isSidebarCollapsed ? 22 : 18} color="var(--primary-blue, #2563EB)" />
                        {!isSidebarCollapsed && (
                            <span style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                color: 'var(--primary-blue, #2563EB)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                My Family
                            </span>
                        )}
                    </div>
                    <div>
                        {mainNavItems.map(item => (
                            <SidebarNavLink key={item.path} item={item} isCollapsed={isSidebarCollapsed} />
                        ))}
                    </div>
                </div>

                {/* Monitoring Section */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        padding: isSidebarCollapsed ? '0 0 12px 0' : '0 8px 12px 8px',
                        borderBottom: '1px solid var(--border-color, #e5e7eb)',
                        marginBottom: '12px',
                        textAlign: isSidebarCollapsed ? 'center' : 'left',
                    }}>
                        {!isSidebarCollapsed ? (
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted, #9ca3af)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                Monitoring
                            </span>
                        ) : (
                            <div style={{
                                width: '20px',
                                height: '2px',
                                background: 'var(--text-muted, #9ca3af)',
                                margin: '0 auto',
                                borderRadius: '1px',
                            }} />
                        )}
                    </div>
                    <div>
                        {secondaryNavItems.map(item => (
                            <SidebarNavLink key={item.path} item={item} isCollapsed={isSidebarCollapsed} />
                        ))}
                    </div>
                </div>

                {/* Quick Help - Hide when collapsed */}
                {!isSidebarCollapsed && (
                    <div style={{
                        padding: '16px',
                        background: 'var(--info-light, linear-gradient(135deg, #eff6ff, #f0f9ff))',
                        borderRadius: '12px',
                        border: '1px solid var(--info-border, #dbeafe)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                        }}>
                            <Shield size={18} color="var(--primary-blue, #2563EB)" />
                            <span style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--text-heading, #1e40af)',
                            }}>
                                Quick Tip
                            </span>
                        </div>
                        <p style={{
                            fontSize: '12px',
                            color: 'var(--text-muted, #3b82f6)',
                            lineHeight: '1.5',
                            margin: 0,
                        }}>
                            Click "Add Child" to create a profile for each of your children.
                        </p>
                    </div>
                )}
            </aside>

            {/* Mobile Menu Overlay */}
            {isMobile && isMobileMenuOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: '68px',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 150,
                        animation: 'fadeIn 0.2s ease-out',
                    }}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Menu Panel */}
            {isMobile && (
                <div
                    ref={mobileMenuRef}
                    style={{
                        position: 'fixed',
                        top: '68px',
                        left: 0,
                        right: 0,
                        background: 'var(--mobile-menu-bg, white)',
                        borderBottom: '1px solid var(--mobile-menu-border, #e5e7eb)',
                        boxShadow: isMobileMenuOpen ? '0 10px 40px rgba(0,0,0,0.12)' : 'none',
                        zIndex: 200,
                        maxHeight: isMobileMenuOpen ? '70vh' : '0',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease-out',
                    }}
                >
                    <div style={{ padding: '16px 20px' }}>
                        {/* Add Child - Prominent in mobile menu */}
                        <Link
                            to="/#add-child"
                            onClick={() => setIsMobileMenuOpen(false)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '14px 20px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                                color: 'white',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '16px',
                                marginBottom: '20px',
                            }}
                        >
                            <Plus size={20} />
                            Add a Child
                        </Link>

                        {/* Mobile Navigation Sections */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted, #9ca3af)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                padding: '8px 0',
                            }}>
                                Main Menu
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {mainNavItems.map(item => (
                                    <NavLink key={item.path} item={item} />
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted, #9ca3af)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                padding: '8px 0',
                            }}>
                                Monitoring & Controls
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {secondaryNavItems.map(item => (
                                    <NavLink key={item.path} item={item} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted, #9ca3af)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                padding: '8px 0',
                            }}>
                                Account
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {settingsNavItems.map(item => (
                                    <NavLink key={item.path} item={item} />
                                ))}
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    <LogOut size={20} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation Bar */}
            {isMobile && (
                <nav style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '64px',
                    background: 'var(--bottom-nav-bg, white)',
                    borderTop: '1px solid var(--bottom-nav-border, #e5e7eb)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    zIndex: 100,
                    padding: '0 8px',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                }}>
                    {bottomNavItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                color: item.special
                                    ? '#2563EB'
                                    : (isActive(item.path) ? '#2563EB' : '#9ca3af'),
                                background: item.special ? '#eff6ff' : 'transparent',
                                transition: 'all 0.2s ease',
                                flex: 1,
                            }}
                        >
                            <div style={{
                                width: item.special ? '44px' : '24px',
                                height: item.special ? '44px' : '24px',
                                borderRadius: item.special ? '50%' : '0',
                                background: item.special ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: item.special ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                                marginTop: item.special ? '-20px' : '0',
                                border: item.special ? '3px solid white' : 'none',
                            }}>
                                <item.icon
                                    size={item.special ? 24 : 22}
                                    color={item.special ? 'white' : 'currentColor'}
                                    strokeWidth={isActive(item.path) || item.special ? 2.5 : 2}
                                />
                            </div>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: isActive(item.path) || item.special ? '600' : '500',
                                color: item.special ? '#2563EB' : (isActive(item.path) ? '#2563EB' : '#9ca3af'),
                            }}>
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </nav>
            )}

            {/* CSS Variables and Animations */}
            <style>{`
                :root {
                    --header-bg: white;
                    --header-border: #e5e7eb;
                    --sidebar-bg: #f8fafc;
                    --sidebar-border: #e5e7eb;
                    --dropdown-bg: white;
                    --dropdown-border: #e5e7eb;
                    --mobile-menu-bg: white;
                    --mobile-menu-border: #e5e7eb;
                    --bottom-nav-bg: white;
                    --bottom-nav-border: #e5e7eb;
                }

                .dark {
                    --header-bg: #1f2937;
                    --header-border: #374151;
                    --sidebar-bg: #111827;
                    --sidebar-border: #374151;
                    --dropdown-bg: #1f2937;
                    --dropdown-border: #374151;
                    --mobile-menu-bg: #1f2937;
                    --mobile-menu-border: #374151;
                    --bottom-nav-bg: #1f2937;
                    --bottom-nav-border: #374151;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .hide-on-small {
                        display: none !important;
                    }
                    
                    .username-text {
                        display: none !important;
                    }
                }

                @media (max-width: 480px) {
                    header > div {
                        padding: 0 12px !important;
                    }
                    
                    header button,
                    header a {
                        padding: 8px 12px !important;
                    }
                }

                /* Page content adjustment for sidebar */
                @media (min-width: 1025px) {
                    .page-container .container {
                        margin-left: 240px;
                        max-width: calc(100% - 240px);
                        transition: margin-left 0.3s ease, max-width 0.3s ease;
                    }
                }

                /* Collapsed sidebar adjustments */
                @media (min-width: 1025px) and (max-width: 1199px) {
                    .page-container .container {
                        margin-left: 70px;
                        max-width: calc(100% - 70px);
                    }
                }

                /* Adjust for mobile bottom nav */
                @media (max-width: 1024px) {
                    .page-container {
                        padding-bottom: 80px;
                    }
                }

                /* Sidebar transition styles */
                .sidebar-nav {
                    transition: width 0.3s ease, padding 0.3s ease;
                }

                .sidebar-nav * {
                    transition: opacity 0.2s ease;
                }

                /* Scrollbar styling */
                aside::-webkit-scrollbar {
                    width: 6px;
                }

                aside::-webkit-scrollbar-track {
                    background: transparent;
                }

                aside::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 3px;
                }

                aside::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }

                .dark aside::-webkit-scrollbar-thumb {
                    background: #4b5563;
                }
            `}</style>
        </>
    );
}
