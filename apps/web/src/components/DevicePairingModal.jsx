import React, { useState, useEffect } from 'react';
import { X, Smartphone, Loader, Copy, Check, Clock, ExternalLink } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import { useChildren } from '../hooks/useChildren';
import { useGeneratePairingCode } from '../hooks/useDevices';

export default function DevicePairingModal({ onClose }) {
    const [step, setStep] = useState(1); // 1: Select Child, 2: Display Code
    const [selectedChildId, setSelectedChildId] = useState('');
    const [deviceName, setDeviceName] = useState('New Desktop');
    const [pairingData, setPairingData] = useState(null);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const [copied, setCopied] = useState(false);

    const { data: children, isLoading: isLoadingChildren } = useChildren();
    const generateCode = useGeneratePairingCode();

    // Auto-select first child (derived value avoids setState in effect)
    const activeChildId = selectedChildId || children?.[0]?.id || '';

    // Timer logic
    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [step, timeLeft]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        try {
            const res = await generateCode.mutateAsync({
                childId: activeChildId,
                deviceName
            });
            setPairingData(res.data);
            setStep(2);
            setTimeLeft(600);
        } catch (err) {
            alert('Failed to generate code: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleCopy = () => {
        if (pairingData?.code) {
            navigator.clipboard.writeText(pairingData.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <Card className="w-full max-w-md animate-slide-up relative overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X size={20} />
                </button>

                <div className="mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue">
                        <Smartphone size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-heading">Connect Device</h2>
                        <p className="text-sm text-text-muted">Pair a new desktop or laptop</p>
                    </div>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                Select Child
                            </label>
                            {isLoadingChildren ? (
                                <div className="h-10 w-full bg-gray-100 animate-pulse rounded-xl" />
                            ) : (
                                <select
                                    value={activeChildId}
                                    onChange={(e) => setSelectedChildId(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue dark:border-gray-600 dark:bg-slate-900 dark:text-gray-100"
                                    required
                                >
                                    <option value="" disabled>Select a child profile...</option>
                                    {children?.map(child => (
                                        <option key={child.id} value={child.id}>{child.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <Input
                            label="Device Name"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="e.g. Timmy's Gaming PC"
                            required
                        />

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={generateCode.isPending || !activeChildId}
                            >
                                {generateCode.isPending ? (
                                    <><Loader size={16} className="animate-spin mr-2" /> Generating...</>
                                ) : (
                                    'Generate Pairing Code'
                                )}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-dashed border-primary-blue/30">
                            <p className="text-sm text-text-muted mb-2">Enter this code on the device:</p>
                            <div className="text-5xl font-mono font-bold tracking-wider text-primary-blue mb-2">
                                {pairingData?.code}
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                                <Clock size={14} />
                                <span>Expires in {formatTime(timeLeft)}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                className="w-full bg-gradient-to-r from-primary-blue to-primary-teal hover:opacity-90"
                                onClick={() => window.location.href = `screensprout://pair?code=${pairingData?.code}`}
                            >
                                <ExternalLink size={16} className="mr-2" />
                                Launch App to Pair
                            </Button>

                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={handleCopy}
                            >
                                {copied ? <Check size={16} className="text-green-500 mr-2" /> : <Copy size={16} className="mr-2" />}
                                {copied ? 'Copied!' : 'Copy Code'}
                            </Button>

                            <p className="text-xs text-text-muted max-w-xs mx-auto">
                                If the app is installed on this device, click Launch to pair automatically.
                            </p>
                        </div>

                        <Button variant="ghost" className="text-sm" onClick={onClose}>
                            Done
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
