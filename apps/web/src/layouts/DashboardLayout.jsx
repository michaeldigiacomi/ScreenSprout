import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

export default function DashboardLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen size and sidebar collapse state
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width <= 1024);
            // Collapse sidebar at < 1200px (but not on mobile where it's hidden)
            if (width < 1200 && width > 1024) {
                setIsSidebarCollapsed(true);
            } else if (width >= 1200) {
                setIsSidebarCollapsed(false);
            }
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return (
        <div className="min-h-screen bg-bg-color text-text-main font-sans">
            {/* 
        We pass the state down to Header. 
        Note: We need to update Header.jsx to accept these props. 
      */}
            <Header
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
                isMobile={isMobile}
            />

            {/* Main Content Wrapper */}
            <main
                className="transition-all duration-300 ease-in-out pt-6 px-4 pb-20 md:px-6 md:pb-8"
                style={{
                    marginLeft: isMobile ? '0' : (isSidebarCollapsed ? '70px' : '240px')
                }}
            >
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
