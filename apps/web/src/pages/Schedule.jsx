import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import Header from '../components/Header';
import { Calendar, Clock, Plus, Trash2, Edit2, Sun, Moon, BookOpen, Users, ToggleLeft, ToggleRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESETS = {
  bedtime: { name: 'Bedtime', startTime: '20:00', endTime: '07:00', blockedApps: ['*'], alwaysAllowedApps: [] },
  homework: { name: 'Homework Time', startTime: '15:30', endTime: '17:30', blockedApps: ['minecraft', 'roblox', 'youtube', 'tiktok'], alwaysAllowedApps: ['calculator', 'notepad', 'docs'] },
  dinner: { name: 'Family Dinner', startTime: '18:00', endTime: '19:00', blockedApps: ['*'], alwaysAllowedApps: [] },
  weekend: { name: 'Weekend Fun', startTime: '09:00', endTime: '12:00', blockedApps: [], alwaysAllowedApps: ['*'] }
};

export default function Schedule() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    blockedApps: '',
    alwaysAllowedApps: '',
    isActive: true
  });

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await api.get('/children');
        const childrenData = Array.isArray(res.data) ? res.data : (res.data?.children || []);
        setChildren(childrenData);
        if (childrenData.length > 0 && !selectedChild) {
          setSelectedChild(childrenData[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchChildren();
  }, [selectedChild]);

  useEffect(() => {
    if (!selectedChild) return;
    let cancelled = false;
    api.get(`/schedules?childId=${selectedChild}`)
      .then(res => {
        const schedulesData = Array.isArray(res.data) ? res.data : (res.data?.schedules || []);
        if (!cancelled) setSchedules(schedulesData);
      })
      .catch(err => console.error(err));
    return () => { cancelled = true; };
  }, [selectedChild]);

  const loadSchedules = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const res = await api.get(`/schedules?childId=${selectedChild}`);
      const schedulesData = Array.isArray(res.data) ? res.data : (res.data?.schedules || []);
      setSchedules(schedulesData);
    } catch (err) {
      console.error(err);
    }
  }, [selectedChild]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        childId: selectedChild,
        name: formData.name,
        description: formData.description,
        daysOfWeek: formData.daysOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        blockedApps: formData.blockedApps.split(',').map(s => s.trim()).filter(s => s),
        alwaysAllowedApps: formData.alwaysAllowedApps.split(',').map(s => s.trim()).filter(s => s),
        isActive: formData.isActive
      };

      if (editingSchedule) {
        await api.put(`/schedules/${editingSchedule.id}`, data);
      } else {
        await api.post('/schedules', data);
      }

      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
    } catch (err) {
      alert('Failed to save schedule');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      loadSchedules();
    } catch (err) {
      alert('Failed to delete schedule');
      console.error(err);
    }
  };

  const handleToggleActive = async (schedule) => {
    try {
      await api.put(`/schedules/${schedule.id}`, {
        ...schedule,
        daysOfWeek: schedule.days_of_week,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        blockedApps: schedule.blocked_apps,
        alwaysAllowedApps: schedule.always_allowed_apps,
        isActive: !schedule.is_active
      });
      loadSchedules();
    } catch (err) {
      alert('Failed to toggle schedule');
      console.error(err);
    }
  };

  const startEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || '',
      daysOfWeek: schedule.days_of_week,
      startTime: schedule.start_time.slice(0, 5),
      endTime: schedule.end_time.slice(0, 5),
      blockedApps: (schedule.blocked_apps || []).join(', '),
      alwaysAllowedApps: (schedule.always_allowed_apps || []).join(', '),
      isActive: schedule.is_active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '17:00',
      blockedApps: '',
      alwaysAllowedApps: '',
      isActive: true
    });
  };

  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      blockedApps: preset.blockedApps.join(', '),
      alwaysAllowedApps: preset.alwaysAllowedApps.join(', ')
    }));
  };

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(dayIndex)
        ? prev.daysOfWeek.filter(d => d !== dayIndex)
        : [...prev.daysOfWeek, dayIndex].sort()
    }));
  };

  return (
    <div className="page-container">
      <Header />
      <div className="container animate-fade-in">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px' 
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
              <Calendar size={24} />
            </div>
            Smart Schedules
          </h1>
          
          <button 
            onClick={() => { setShowModal(true); resetForm(); setEditingSchedule(null); }} 
            style={{ width: 'auto' }}
          >
            <Plus size={18} /> Add Schedule
          </button>
        </div>

        {/* Child Selector */}
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #2563EB' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Select Child</label>
          <select
            value={selectedChild || ''}
            onChange={e => setSelectedChild(e.target.value)}
            style={{ maxWidth: '300px', marginBottom: 0 }}
          >
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
        </div>

        {/* Schedules Grid */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {schedules.map((schedule, index) => (
            <div 
              key={schedule.id} 
              className="card animate-slide-up"
              style={{ 
                animationDelay: `${index * 100}ms`,
                opacity: schedule.is_active ? 1 : 0.6,
                borderLeft: `4px solid ${schedule.is_active ? '#2563EB' : '#9ca3af'}`
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{schedule.name}</h3>
                  {schedule.description && (
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>{schedule.description}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleToggleActive(schedule)}
                    className="btn-secondary"
                    style={{ 
                      padding: '6px', 
                      width: 'auto',
                      background: 'transparent'
                    }}
                    title={schedule.is_active ? 'Disable' : 'Enable'}
                  >
                    {schedule.is_active ? 
                      <ToggleRight size={24} color="#14B8A6" /> : 
                      <ToggleLeft size={24} color="#9ca3af" />
                    }
                  </button>
                  
                  <button 
                    onClick={() => startEdit(schedule)}
                    className="btn-secondary"
                    style={{ padding: '6px', width: 'auto', background: 'transparent' }}
                  >
                    <Edit2 size={18} color="#6b7280" />
                  </button>
                  
                  <button 
                    onClick={() => handleDelete(schedule.id)}
                    className="btn-danger"
                    style={{ padding: '6px', width: 'auto' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '12px' }}>
                  {DAYS.map((day, idx) => (
                    <span
                      key={day}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: schedule.days_of_week.includes(idx) ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : '#f3f4f6',
                        color: schedule.days_of_week.includes(idx) ? 'white' : '#9ca3af'
                      }}
                    >
                      {day[0]}
                    </span>
                  ))}
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  color: '#374151', 
                  fontSize: '14px',
                  marginBottom: '12px'
                }}>
                  <Clock size={16} color="#2563EB" />
                  <b>{schedule.start_time.slice(0, 5)}</b> to <b>{schedule.end_time.slice(0, 5)}</b>
                </div>

                {(schedule.blocked_apps?.length > 0 || schedule.always_allowed_apps?.length > 0) && (
                  <div style={{ fontSize: '12px' }}>
                    {schedule.blocked_apps?.length > 0 && (
                      <div style={{ color: '#dc2626', marginBottom: '4px' }}>
                        <b>Blocked:</b> {schedule.blocked_apps.join(', ')}
                      </div>
                    )}
                    {schedule.always_allowed_apps?.length > 0 && (
                      <div style={{ color: '#0d9488' }}>
                        <b>Allowed:</b> {schedule.always_allowed_apps.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {schedules.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#6b7280',
            background: 'white',
            borderRadius: '16px',
            border: '2px dashed #e5e7eb'
          }}>
            <Calendar size={48} style={{ marginBottom: '20px', opacity: 0.5, color: '#2563EB' }} />
            <h3>No schedules yet</h3>
            <p>Create your first schedule to manage screen time automatically.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={24} color="#2563EB" />
              {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
            </h2>

            {/* Presets */}
            {!editingSchedule && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Quick Presets</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => applyPreset('bedtime')} className="btn-secondary" style={{ width: 'auto', fontSize: '13px' }}>
                    <Moon size={14} /> Bedtime
                  </button>
                  <button type="button" onClick={() => applyPreset('homework')} className="btn-secondary" style={{ width: 'auto', fontSize: '13px' }}>
                    <BookOpen size={14} /> Homework
                  </button>
                  <button type="button" onClick={() => applyPreset('dinner')} className="btn-secondary" style={{ width: 'auto', fontSize: '13px' }}>
                    <Users size={14} /> Dinner
                  </button>
                  <button type="button" onClick={() => applyPreset('weekend')} className="btn-secondary" style={{ width: 'auto', fontSize: '13px' }}>
                    <Sun size={14} /> Weekend
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Schedule Name</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Homework Time"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this schedule for?"
                />
              </div>

              <div className="form-group">
                <label>Days of Week</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DAYS.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={formData.daysOfWeek.includes(idx) ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        width: '48px',
                        height: '40px',
                        padding: '0',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Blocked Apps (comma separated, * = all)</label>
                <input
                  value={formData.blockedApps}
                  onChange={e => setFormData({ ...formData, blockedApps: e.target.value })}
                  placeholder="e.g. minecraft, youtube, roblox"
                />
              </div>

              <div className="form-group">
                <label>Always Allowed Apps (exempt from blocking)</label>
                <input
                  value={formData.alwaysAllowedApps}
                  onChange={e => setFormData({ ...formData, alwaysAllowedApps: e.target.value })}
                  placeholder="e.g. calculator, docs"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ width: '100%' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  {editingSchedule ? 'Save Changes' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
