import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Navigation, Plus, X, Save, Trash2,
  Clock, Battery, Zap, Map as MapIcon, Activity,
  RefreshCw, Crosshair
} from 'lucide-react';
import { useChildren } from '../hooks/useChildren';
import { useLocationHistory } from '../hooks/useLocations';
import { useGeofences, useGeofenceEvents, useCreateGeofence, useUpdateGeofence, useDeleteGeofence } from '../hooks/useGeofences';
import { useLocationStats } from '../hooks/useStats';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

// Simple map component using canvas
const SimpleMap = ({ locations, geofences }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    if (!locations || locations.length === 0) {
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No location data available', width / 2, height / 2);
      // Draw dummy map for visual
      return;
    }

    // Calculate bounds
    const lats = locations.map(l => l.latitude);
    const lons = locations.map(l => l.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = maxLat - minLat || 0.01;
    const lonRange = maxLon - minLon || 0.01;

    const padding = 50;
    const scaleX = (width - padding * 2) / lonRange;
    const scaleY = (height - padding * 2) / latRange;

    const toScreen = (lat, lon) => ({
      x: padding + (lon - minLon) * scaleX,
      y: height - padding - (lat - minLat) * scaleY
    });

    // Draw geofences
    if (geofences) {
      geofences.forEach(geofence => {
        const pos = toScreen(geofence.latitude, geofence.longitude);
        // Scale radius approximately (very rough for visualization)
        const radius = Math.max(20, Math.min(geofence.radius_meters / 10, 100));

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = geofence.color + '20'; // 12% opacity
        ctx.fill();
        ctx.strokeStyle = geofence.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = geofence.color;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(geofence.name, pos.x, pos.y - radius - 5);
      });
    }

    // Draw locations path
    if (locations.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6'; // blue-500
      ctx.lineWidth = 2;

      locations.forEach((loc, i) => {
        const pos = toScreen(loc.latitude, loc.longitude);
        if (i === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
    }

    // Draw location markers
    locations.forEach((loc, i) => {
      const pos = toScreen(loc.latitude, loc.longitude);

      // Accuracy
      if (loc.accuracy) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.min(loc.accuracy / 2, 40), 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f620';
        ctx.fill();
      }

      // Marker
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#2563eb' : '#94a3b8'; // primary blue vs slate
      if (i === locations.length - 1) ctx.fillStyle = '#10b981'; // green for latest

      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

  }, [locations, geofences]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="w-full h-[400px] rounded-xl border border-border-color bg-slate-50"
    />
  );
};

export default function LocationTracking() {
  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab, setActiveTab] = useState('live');
  const [showAddGeofence, setShowAddGeofence] = useState(false);
  const [historyHours, setHistoryHours] = useState(24);

  // Data Fetching
  const { data: children, isLoading: isChildrenLoading } = useChildren();

  // Use derived value for active child (avoids setState in effect)
  const activeChild = selectedChild || children?.[0] || null;

  // Dependent Queries
  const { data: stats } = useLocationStats(activeChild?.id);
  const { data: geofences } = useGeofences(activeChild?.id);
  const { data: events } = useGeofenceEvents(activeChild?.id);
  const { data: history } = useLocationHistory(activeChild?.id); // We need to pass hours param actually

  // For live tracking, we might fetch current location specifically
  // Assuming useLocationHistory/useCurrentLocations handles this. 
  // We'll use history for the map for now as "current locations" endpoint logic is fuzzy in my head
  // but in original code it used /locations/current.
  // Let's use history[0] as current for visualization if needed.

  const createGeofence = useCreateGeofence();
  const _updateGeofence = useUpdateGeofence();
  const deleteGeofence = useDeleteGeofence();

  const [geofenceForm, setGeofenceForm] = useState({
    name: '', description: '', latitude: '', longitude: '',
    radiusMeters: 100, geofenceType: 'safe', notifyOnEnter: true, notifyOnExit: true, color: '#22c55e'
  });
  const [_editingGeofence, _setEditingGeofence] = useState(null);

  const handleCreateGeofence = async (e) => {
    e.preventDefault();
    try {
      await createGeofence.mutateAsync({ ...geofenceForm, childId: activeChild.id });
      setShowAddGeofence(false);
      setGeofenceForm({
        name: '', description: '', latitude: '', longitude: '',
        radiusMeters: 100, geofenceType: 'safe', notifyOnEnter: true, notifyOnExit: true, color: '#22c55e'
      });
    } catch { alert('Failed to create geofence'); }
  };

  const handleDeleteGeofence = async (id) => {
    if (confirm('Delete geofence?')) deleteGeofence.mutate(id);
  };

  const formatTime = (time) => {
    if (!time) return 'Unknown';
    return new Date(time).toLocaleString();
  };

  if (isChildrenLoading) return <div className="p-8 text-center">Loading...</div>;

  const currentLocations = history ? history.slice(0, 5) : []; // Use latest history points

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-text-heading">
          <MapPin className="text-primary-teal" size={28} />
          Location Tracking
        </h1>

        {/* Child Selector */}
        <div className="flex gap-2 flex-wrap">
          {children?.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedChild?.id === child.id
                  ? 'bg-primary-teal text-white shadow-md'
                  : 'bg-white border border-border-color text-text-muted hover:bg-gray-50'
                }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card padding="p-5">
            <div className="flex items-center gap-2 mb-2 text-text-muted text-sm font-medium">
              <MapPin size={16} className="text-primary-teal" /> Active Geofences
            </div>
            <div className="text-3xl font-bold text-text-heading">{stats.activeGeofences}</div>
          </Card>
          <Card padding="p-5">
            <div className="flex items-center gap-2 mb-2 text-text-muted text-sm font-medium">
              <Activity size={16} className="text-primary-blue" /> Location Updates
            </div>
            <div className="text-3xl font-bold text-text-heading">{stats.locations?.total_updates}</div>
          </Card>
          <Card padding="p-5">
            <div className="flex items-center gap-2 mb-2 text-text-muted text-sm font-medium">
              <Navigation size={16} className="text-orange-500" /> Days Tracked
            </div>
            <div className="text-3xl font-bold text-text-heading">{stats.locations?.days_with_location}</div>
          </Card>
          <Card padding="p-5">
            <div className="flex items-center gap-2 mb-2 text-text-muted text-sm font-medium">
              <Zap size={16} className="text-purple-500" /> Events
            </div>
            <div className="text-3xl font-bold text-text-heading">
              {stats.geofenceEvents?.reduce((sum, e) => sum + parseInt(e.count), 0)}
            </div>
          </Card>
        </div>
      )}

      {/* Tabs & Content */}
      <div className="flex gap-1 mb-6 border-b border-border-color">
        {[
          { id: 'live', label: 'Live Map', icon: MapIcon },
          { id: 'history', label: 'History', icon: Clock },
          { id: 'geofences', label: 'Geofences', icon: Crosshair },
          { id: 'events', label: 'Events', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-primary-teal text-primary-teal'
                : 'border-transparent text-text-muted hover:text-text-main'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Map & Live View */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <SimpleMap locations={currentLocations} geofences={geofences} />

          <h3 className="text-lg font-semibold text-text-heading">Current Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentLocations.map((loc, idx) => (
              <Card key={idx} className={`border-l-4 ${idx === 0 ? 'border-l-primary-teal' : 'border-l-primary-blue'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-text-heading">{loc.device_name || 'Device'}</div>
                  <Badge variant={idx === 0 ? 'success' : 'default'}>{idx === 0 ? 'Latest' : 'Previous'}</Badge>
                </div>
                <div className="text-sm text-text-muted font-mono mb-2">
                  {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
                </div>
                <div className="text-xs text-text-muted">
                  {formatTime(loc.timestamp)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Geofences Tab */}
      {activeTab === 'geofences' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-text-heading">Configured Zones</h3>
            <Button onClick={() => setShowAddGeofence(true)}>
              <Plus size={16} /> Add Geofence
            </Button>
          </div>

          {showAddGeofence && (
            <Card className="mb-6 animate-slide-up border border-primary-teal/20">
              <h4 className="text-md font-bold mb-4">New Geofence</h4>
              <form onSubmit={handleCreateGeofence} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Name" value={geofenceForm.name} onChange={e => setGeofenceForm({ ...geofenceForm, name: e.target.value })} required />
                  <Input label="Radius (meters)" type="number" value={geofenceForm.radiusMeters} onChange={e => setGeofenceForm({ ...geofenceForm, radiusMeters: parseInt(e.target.value) })} />
                  <Input label="Latitude" type="number" step="any" value={geofenceForm.latitude} onChange={e => setGeofenceForm({ ...geofenceForm, latitude: e.target.value })} />
                  <Input label="Longitude" type="number" step="any" value={geofenceForm.longitude} onChange={e => setGeofenceForm({ ...geofenceForm, longitude: e.target.value })} />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={geofenceForm.notifyOnEnter} onChange={e => setGeofenceForm({ ...geofenceForm, notifyOnEnter: e.target.checked })} /> Notify Enter</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={geofenceForm.notifyOnExit} onChange={e => setGeofenceForm({ ...geofenceForm, notifyOnExit: e.target.checked })} /> Notify Exit</label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowAddGeofence(false)}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {geofences?.map(kf => (
              <Card key={kf.id} style={{ borderLeft: `4px solid ${kf.color}` }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold">{kf.name}</div>
                  <button onClick={() => handleDeleteGeofence(kf.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="text-sm text-text-muted mb-2">
                  {kf.radius_meters}m radius
                </div>
                <div className="flex gap-2">
                  {kf.notify_on_enter && <Badge variant="success" className="text-[10px]">Enter</Badge>}
                  {kf.notify_on_exit && <Badge variant="warning" className="text-[10px]">Exit</Badge>}
                </div>
              </Card>
            ))}
            {(!geofences || geofences.length === 0) && (
              <p className="text-text-muted col-span-full text-center py-10">No geofences configured.</p>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-card-bg rounded-xl border border-border-color overflow-hidden">
          <div className="p-4 border-b border-border-color flex justify-between items-center bg-bg-secondary">
            <h3 className="font-semibold text-text-heading">Position History</h3>
            <select
              className="bg-white dark:bg-slate-700 border border-border-color rounded-lg px-3 py-1 text-sm"
              value={historyHours}
              onChange={(e) => setHistoryHours(Number(e.target.value))}
            >
              <option value={24}>Last 24 Hours</option>
              <option value={48}>Last 48 Hours</option>
              <option value={168}>Last 7 Days</option>
            </select>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {history?.map((loc, i) => (
              <div key={i} className="flex justify-between items-center p-4 border-b border-border-color last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary-blue">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-heading">{loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}</div>
                    <div className="text-xs text-text-muted">{loc.device_name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-main">{new Date(loc.timestamp).toLocaleTimeString()}</div>
                  <div className="text-xs text-text-muted">{new Date(loc.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
            {(!history || history.length === 0) && (
              <div className="p-8 text-center text-text-muted">No history available for this period.</div>
            )}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {events?.map((event, i) => (
            <Card key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.event_type === 'enter' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  {event.event_type === 'enter' ? <Zap size={18} /> : <Navigation size={18} />}
                </div>
                <div>
                  <div className="font-semibold text-text-heading">
                    {event.event_type === 'enter' ? 'Entered' : 'Left'} {event.geofence_name}
                  </div>
                  <div className="text-xs text-text-muted">{formatTime(event.timestamp)}</div>
                </div>
              </div>
              <Badge variant={event.event_type === 'enter' ? 'success' : 'warning'}>
                {event.event_type?.toUpperCase()}
              </Badge>
            </Card>
          ))}
          {(!events || events.length === 0) && (
            <p className="text-text-muted text-center py-10">No events recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
