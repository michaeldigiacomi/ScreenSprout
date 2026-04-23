import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import analytics from '../lib/analytics';
import { Shield, Gift, Plus, X, Edit2, Save, Monitor, Smartphone, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

import { useChildren, useCreateChild, useUpdateChild } from '../hooks/useChildren';
import { useDevices, useAssignDevice, useUpdateDevicePolicy, useUpdateDeviceName } from '../hooks/useDevices';
import { useBonusTime } from '../hooks/useBonusTime';
import DevicePairingModal from '../components/DevicePairingModal';

const getIcon = (type) => {
    if (type === 'windows') return <Monitor size={18} />;
    return <Smartphone size={18} />;
};

const ChildCard = ({ child, onEdit, onAssignDevice }) => {
    const { data: bonus } = useBonusTime(child.id);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const deviceId = e.dataTransfer.getData("deviceId");
        if (deviceId) {
            onAssignDevice(deviceId, child.id);
        }
    };

    const handleDragStart = (e, deviceId) => {
        e.dataTransfer.setData("deviceId", deviceId);
    };

    const handleUnassign = (e, deviceId) => {
        e.stopPropagation(); // Prevent drag start if clicking btn
        onAssignDevice(deviceId, null);
    };

    return (
        <Card
            className={`h-full flex flex-col border-l-4 border-l-primary-blue transition-colors ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            padding="p-5"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-teal flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {child.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-semibold text-lg text-text-heading">{child.name}</h3>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {bonus?.totalMinutes > 0 && (
                    <Badge variant="warning" className="gap-1">
                        <Gift size={12} />
                        {bonus.totalMinutes}m bonus
                    </Badge>
                )}
                <Badge variant="info" className="gap-1 bg-blue-50 text-primary-blue border-blue-200">
                    <Clock size={12} />
                    {Math.floor(child.used_seconds / 60)}m / {child.daily_limit_minutes}m
                </Badge>
            </div>

            <div className="flex gap-2 mb-4">
                <Button
                    variant="warning"
                    size="sm"
                    onClick={() => window.location.href = '/rewards'}
                    className="flex-1"
                >
                    <Gift size={12} /> Grant
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(child, 'child')}
                    className="flex-1"
                >
                    <Edit2 size={12} /> Policy
                </Button>
            </div>

            {/* Drop Zone for Devices */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-auto min-h-[100px] rounded-xl p-3 border-2 border-dashed transition-colors ${isDragOver
                    ? 'border-primary-blue bg-blue-100/50'
                    : 'border-primary-blue/30 bg-bg-secondary'
                    }`}
            >
                {(!child.devices || child.devices.length === 0) && (
                    <p className="text-xs text-text-muted text-center py-8 pointer-events-none">
                        Drop devices here to assign
                    </p>
                )}

                {(child.devices || []).map(dev => (
                    <div
                        key={dev.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, dev.id)}
                        className="bg-white dark:bg-slate-700 p-2.5 rounded-lg mb-2 shadow-sm border border-border-color cursor-grab active:cursor-grabbing flex justify-between items-center group hover:border-primary-blue/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-sm text-text-main">
                            <span className="text-primary-blue">{getIcon(dev.device_type)}</span>
                            <span className="font-medium truncate max-w-[120px]" title={dev.device_name}>{dev.device_name}</span>
                        </div>
                        <button
                            onClick={(e) => handleUnassign(e, dev.id)}
                            className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Unassign Device"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default function Dashboard() {
    const location = useLocation();
    const [showAddChild, setShowAddChild] = useState(() => window.location.hash === '#add-child');
    const [newChildName, setNewChildName] = useState('');
    const [editingChild, setEditingChild] = useState(null);
    const [showPairing, setShowPairing] = useState(false);

    // Hooks
    const { data: children } = useChildren();
    const { data: devices } = useDevices();
    const createChild = useCreateChild();
    const updateChild = useUpdateChild();
    const assignDevice = useAssignDevice();
    const updateDevicePolicy = useUpdateDevicePolicy();
    const updateDeviceName = useUpdateDeviceName();

    // Clear URL hash if present
    useEffect(() => {
        if (location.hash === '#add-child') {
            window.history.replaceState(null, '', ' ');
        }
    }, [location.hash]);

    // Computed
    const unassignedDevices = devices ? devices.filter(d => !d.child_id) : [];

    // Handlers
    const handleCreateChild = async (e) => {
        e.preventDefault();
        try {
            await createChild.mutateAsync({ name: newChildName, dailyLimitMinutes: 120 });
            analytics.trackFeatureUsage('add_child', { childName: newChildName });
            setNewChildName('');
            setShowAddChild(false);
        } catch (err) {
            alert('Failed to create child: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleAssignDevice = (deviceId, childId) => {
        assignDevice.mutate({ deviceId, childId });
    };

    const handleStartEditing = (item, type) => {
        let limit = 120;
        let blocked = [];
        let alwaysAllowed = [];
        let name = '';

        if (type === 'child') {
            limit = item.daily_limit_minutes;
            blocked = item.blocked_apps || [];
            alwaysAllowed = item.always_allowed_apps || [];
            name = item.name;
        } else {
            const policy = item.policy_json || {};
            limit = policy.dailyLimitMinutes || 120;
            blocked = policy.blockedApps || [];
            alwaysAllowed = policy.alwaysAllowedApps || [];
            name = item.device_name;
        }

        setEditingChild({
            type,
            id: item.id,
            name,
            dailyLimitMinutes: limit, // keep as number or string? Input uses string usually.
            blockedAppsStr: blocked.join(', '),
            alwaysAllowedAppsStr: alwaysAllowed.join(', ')
        });
    };

    const handleSavePolicy = async (e) => {
        e.preventDefault();
        try {
            const appsArray = editingChild.blockedAppsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const alwaysAllowedArray = editingChild.alwaysAllowedAppsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const limit = parseInt(editingChild.dailyLimitMinutes);

            if (editingChild.type === 'child') {
                await updateChild.mutateAsync({
                    id: editingChild.id,
                    name: editingChild.name,
                    dailyLimitMinutes: limit,
                    blockedApps: appsArray,
                    alwaysAllowedApps: alwaysAllowedArray
                });
            } else {
                await updateDevicePolicy.mutateAsync({
                    id: editingChild.id,
                    dailyLimitMinutes: limit,
                    blockedApps: appsArray,
                    alwaysAllowedApps: alwaysAllowedArray
                });
                if (editingChild.name) {
                    await updateDeviceName.mutateAsync({ id: editingChild.id, deviceName: editingChild.name });
                }
            }
            setEditingChild(null);
        } catch {
            alert('Failed to update policy');
        }
    };

    const handleDragStart = (e, deviceId) => {
        e.dataTransfer.setData("deviceId", deviceId);
    };

    const handleUnassignedDrop = (e) => {
        e.preventDefault();
        const deviceId = e.dataTransfer.getData("deviceId");
        if (deviceId) handleAssignDevice(deviceId, null);
    };

    return (
        <div className="animate-fade-in">
            {/* Header Section */}
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-text-heading flex items-center gap-3">
                    <Shield size={32} className="text-primary-blue" />
                    <span className="bg-gradient-to-r from-primary-blue to-primary-teal bg-clip-text text-transparent">
                        Dashboard
                    </span>
                </h1>
            </div>

            {/* Add Child Form */}
            {showAddChild && (
                <Card className="mb-6 border-l-4 border-l-primary-blue animate-slide-up">
                    <h3 className="text-lg font-semibold text-text-heading mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-primary-blue" />
                        New Child Profile
                    </h3>
                    <form onSubmit={handleCreateChild} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <Input
                                placeholder="Child's Name (e.g. Noah)"
                                value={newChildName}
                                onChange={e => setNewChildName(e.target.value)}
                                required
                                className="mb-0"
                            />
                        </div>
                        <Button type="submit">
                            <Save size={16} /> Create
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setShowAddChild(false)}
                            type="button"
                        >
                            Cancel
                        </Button>
                    </form>
                </Card>
            )}

            {/* Edit Modal */}
            {editingChild && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setEditingChild(null); }}
                >
                    <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                        <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
                            <Edit2 size={24} className="text-primary-blue" />
                            Edit {editingChild.type === 'child' ? 'Profile' : 'Device'}
                        </h2>
                        <form onSubmit={handleSavePolicy} className="space-y-4">
                            <Input
                                label="Name"
                                value={editingChild.name}
                                onChange={e => setEditingChild({ ...editingChild, name: e.target.value })}
                                required
                            />
                            <Input
                                type="number"
                                label="Daily Limit (Minutes)"
                                value={editingChild.dailyLimitMinutes}
                                onChange={e => setEditingChild({ ...editingChild, dailyLimitMinutes: e.target.value })}
                                required
                            />
                            <Input
                                label="Blocked Apps (comma separated)"
                                value={editingChild.blockedAppsStr}
                                onChange={e => setEditingChild({ ...editingChild, blockedAppsStr: e.target.value })}
                            />
                            <Input
                                label="Always Allowed Apps"
                                value={editingChild.alwaysAllowedAppsStr}
                                onChange={e => setEditingChild({ ...editingChild, alwaysAllowedAppsStr: e.target.value })}
                            />
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-color">
                                <Button variant="secondary" onClick={() => setEditingChild(null)} type="button">Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Children Grid */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 mt-8">
                <Shield size={20} className="text-primary-blue" />
                <h2 className="text-lg font-semibold text-text-heading">
                    Child Profiles
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children?.map(child => (
                    <ChildCard
                        key={child.id}
                        child={child}
                        onEdit={handleStartEditing}
                        onAssignDevice={handleAssignDevice}
                    />
                ))}
            </div>

            {/* Unassigned Devices */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 mt-10">
                <Smartphone size={20} className="text-text-muted" />
                <h2 className="text-lg font-semibold text-text-heading">
                    Unassigned Devices
                </h2>
                <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => setShowPairing(true)}
                >
                    <Plus size={16} /> Connect Device
                </Button>
            </div>

            <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[120px] bg-bg-secondary rounded-2xl p-6 border-2 border-dashed border-border-color transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-gray-100'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-gray-100'); }}
                onDrop={(e) => { e.currentTarget.classList.remove('bg-gray-100'); handleUnassignedDrop(e); }}
            >
                {(!unassignedDevices || unassignedDevices.length === 0) && (
                    <div className="col-span-full flex flex-col items-center justify-center text-text-muted py-8">
                        <Smartphone size={32} className="mb-2 opacity-50" />
                        <p>Drag devices here to unassign them</p>
                    </div>
                )}

                {unassignedDevices?.map((device) => (
                    <Card
                        key={device.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, device.id)}
                        className="cursor-grab active:cursor-grabbing border-l-4 border-l-gray-400 hover:border-primary-blue transition-colors group"
                        padding="p-4"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-text-muted">{getIcon(device.device_type)}</span>
                                <span className="font-semibold text-text-heading truncate max-w-[100px]" title={device.device_name}>
                                    {device.device_name}
                                </span>
                            </div>
                            <Badge variant={device.device_type === 'windows' ? 'info' : 'default'} className="uppercase text-[10px]">
                                {device.device_type}
                            </Badge>
                        </div>
                        <div className="text-xs text-text-muted mb-3 space-y-1">
                            <div className="flex items-center gap-1">
                                <Clock size={12} />
                                <span>Last: {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs py-1.5 h-auto mb-2"
                            onClick={() => handleStartEditing(device, 'device')}
                        >
                            <Edit2 size={12} /> Edit Policy
                        </Button>
                    </Card>
                ))}
            </div>

            {showPairing && (
                <DevicePairingModal onClose={() => setShowPairing(false)} />
            )}
        </div>
    );
}
