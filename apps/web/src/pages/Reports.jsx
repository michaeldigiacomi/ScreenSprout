import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { BarChart3, TrendingUp, FileSpreadsheet, FileText, Calendar, Users } from 'lucide-react';

export default function Reports() {
    const [topApps, setTopApps] = useState([]);
    const [dailyTrends, setDailyTrends] = useState([]);
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState('all');
    const [period, setPeriod] = useState('7d');
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const res = await api.get('/children');
                const childrenData = Array.isArray(res.data) ? res.data : (res.data?.children || []);
                setChildren(childrenData);
            } catch (err) {
                console.error(err);
            }
        };
        fetchChildren();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const params = new URLSearchParams({ period });
                if (selectedChild !== 'all') params.append('childId', selectedChild);

                const appsRes = await api.get(`/reports/usage-by-app?${params}`);
                const trendsRes = await api.get(`/reports/daily-trends?${params}`);

                const appsData = Array.isArray(appsRes.data) ? appsRes.data : (appsRes.data?.apps || []);
                const trendsData = Array.isArray(trendsRes.data) ? trendsRes.data : (trendsRes.data?.trends || []);

                setTopApps(appsData.map(d => ({
                    name: d.app_name,
                    minutes: Math.round(d.total_seconds / 60)
                })));

                setDailyTrends(trendsData.map(d => ({
                    date: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
                    fullDate: new Date(d.date).toLocaleDateString(),
                    minutes: Math.round(d.total_seconds / 60)
                })));
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, [period, selectedChild]);

    const exportToCSV = () => {
        setExportLoading(true);
        
        let csv = 'ScreenSprout Usage Report\n';
        csv += `Generated: ${new Date().toLocaleString()}\n`;
        csv += `Period: ${period === '7d' ? 'Last 7 Days' : 'Last 30 Days'}\n`;
        csv += `Child: ${selectedChild === 'all' ? 'All Children' : children.find(c => c.id === selectedChild)?.name || 'Unknown'}\n\n`;
        
        csv += 'DAILY SCREEN TIME\n';
        csv += 'Date,Minutes\n';
        dailyTrends.forEach(day => {
            csv += `${day.fullDate},${day.minutes}\n`;
        });
        
        csv += '\nTOP APPS\n';
        csv += 'App Name,Minutes\n';
        topApps.forEach(app => {
            csv += `"${app.name}",${app.minutes}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screensprout-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setExportLoading(false);
    };

    const exportToPDF = () => {
        setExportLoading(true);
        
        const printWindow = window.open('', '_blank');
        const childName = selectedChild === 'all' ? 'All Children' : children.find(c => c.id === selectedChild)?.name || 'Unknown';
        
        printWindow.document.write(`
            <html>
            <head>
                <title>ScreenSprout Report</title>
                <style>
                    body { font-family: Inter, Arial, sans-serif; padding: 40px; color: #374151; }
                    h1 { 
                        color: #2563EB; 
                        background: linear-gradient(to right, #2563EB, #14B8A6);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }
                    .meta { color: #6b7280; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                    th { background: #eff6ff; color: #1e40af; font-weight: 600; }
                    .section { margin: 30px 0; }
                    .total { font-size: 24px; font-weight: bold; color: #2563EB; }
                </style>
            </head>
            <body>
                <h1>📊 ScreenSprout Usage Report</h1>
                <div class="meta">
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Period:</strong> ${period === '7d' ? 'Last 7 Days' : 'Last 30 Days'}</p>
                    <p><strong>Child:</strong> ${childName}</p>
                </div>
                
                <div class="section">
                    <h2>Daily Screen Time</h2>
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Minutes</th></tr>
                        </thead>
                        <tbody>
                            ${dailyTrends.map(day => `
                                <tr>
                                    <td>${day.fullDate}</td>
                                    <td>${day.minutes} minutes</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h2>Top Apps</h2>
                    <table>
                        <thead>
                            <tr><th>App Name</th><th>Minutes</th></tr>
                        </thead>
                        <tbody>
                            ${topApps.map(app => `
                                <tr>
                                    <td>${app.name}</td>
                                    <td>${app.minutes} minutes</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <script>
                    window.print();
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        setExportLoading(false);
    };

    const totalMinutes = dailyTrends.reduce((sum, d) => sum + d.minutes, 0);
    const avgMinutes = Math.round(totalMinutes / (dailyTrends.length || 1));

    return (
        <div className="page-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <Header />
            <div className="container animate-fade-in" style={{ maxWidth: '1000px' }}>
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
                            <BarChart3 size={24} />
                        </div>
                        Analytics & Reports
                    </h1>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={exportToCSV} 
                            disabled={exportLoading}
                            className="btn-primary"
                            style={{ width: 'auto' }}
                        >
                            <FileSpreadsheet size={16} /> Export CSV
                        </button>
                        <button 
                            onClick={exportToPDF} 
                            disabled={exportLoading}
                            className="btn-secondary"
                            style={{ width: 'auto' }}
                        >
                            <FileText size={16} /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #2563EB' }}>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                                <Users size={14} style={{ display: 'inline', marginRight: '4px' }} /> Child
                            </label>
                            <select 
                                value={selectedChild} 
                                onChange={e => setSelectedChild(e.target.value)}
                                style={{ minWidth: '150px', marginBottom: 0 }}
                            >
                                <option value="all">All Children</option>
                                {children.map(child => (
                                    <option key={child.id} value={child.id}>{child.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                                <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> Period
                            </label>
                            <select 
                                value={period} 
                                onChange={e => setPeriod(e.target.value)}
                                style={{ minWidth: '150px', marginBottom: 0 }}
                            >
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #14B8A6' }}>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#14B8A6' }}>
                            {totalMinutes}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Minutes</div>
                    </div>
                    
                    <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3b82f6' }}>
                            {avgMinutes}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '14px' }}>Daily Average</div>
                    </div>
                    
                    <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>
                            {topApps.length}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '14px' }}>Apps Used</div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                    {/* Top Apps */}
                    <div className="card">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={20} color="#2563EB" />
                            Top Apps ({period === '7d' ? '7' : '30'} Days)
                        </h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer>
                                <BarChart data={topApps} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'white', 
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar dataKey="minutes" fill="url(#gradient)" radius={[0, 4, 4, 0]} barSize={20} />
                                    <defs>
                                        <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#2563EB" />
                                            <stop offset="100%" stopColor="#14B8A6" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Trends */}
                    <div className="card">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={20} color="#2563EB" />
                            Daily Screen Time
                        </h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer>
                                <LineChart data={dailyTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis width={40} tick={{ fontSize: 12 }} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'white', 
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="minutes" 
                                        stroke="#2563EB" 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: 'white' }} 
                                        activeDot={{ r: 6, fill: '#14B8A6' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
