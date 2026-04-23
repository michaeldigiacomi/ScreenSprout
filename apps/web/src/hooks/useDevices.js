import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useDevices() {
    return useQuery({
        queryKey: ['devices'],
        queryFn: async () => {
            const res = await api.get('/devices');
            // Normalize response
            let devicesData = [];
            if (Array.isArray(res.data)) {
                devicesData = res.data;
            } else if (res.data && Array.isArray(res.data.devices)) {
                devicesData = res.data.devices;
            } else if (res.data && Array.isArray(res.data.data)) {
                devicesData = res.data.data;
            }
            return devicesData;
        }
    });
}

export function useAssignDevice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ deviceId, childId }) => api.put(`/devices/${deviceId}/assign`, { childId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            queryClient.invalidateQueries({ queryKey: ['children'] });
        }
    });
}
export function useUpdateDevicePolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => api.put(`/policy/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        }
    });
}

export function useUpdateDeviceName() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, deviceName }) => api.put(`/devices/${id}`, { deviceName }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        }
    });
}
export function useGeneratePairingCode() {
    return useMutation({
        mutationFn: ({ childId, deviceName }) => api.post('/devices/pair/generate', { childId, deviceName }),
    });
}

export function useRevokeDevice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (deviceId) => api.delete(`/devices/pair/revoke/${deviceId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        }
    });
}
