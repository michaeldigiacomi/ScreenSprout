import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useGeofences(childId) {
    return useQuery({
        queryKey: ['geofences', childId],
        queryFn: async () => {
            const res = await api.get(`/geofences?childId=${childId}`);
            return Array.isArray(res.data) ? res.data : (res.data?.geofences || []);
        },
        enabled: !!childId
    });
}

export function useGeofenceEvents(childId) {
    return useQuery({
        queryKey: ['geofenceEvents', childId],
        queryFn: async () => {
            const res = await api.get(`/geofences/events/${childId}?limit=50`);
            return Array.isArray(res.data) ? res.data : (res.data?.events || []);
        },
        enabled: !!childId
    });
}

export function useCreateGeofence() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newGeofence) => api.post('/geofences', newGeofence),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['geofences', variables.childId] });
            queryClient.invalidateQueries({ queryKey: ['stats', variables.childId] });
        }
    });
}

export function useUpdateGeofence() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => api.put(`/geofences/${id}`, data),
        onSuccess: () => {
            // We might need to know childId to invalidate correctly, or invalidate all
            // Assuming we pass childId in variables or just invalidate all 'geofences'
            queryClient.invalidateQueries({ queryKey: ['geofences'] });
        }
    });
}

export function useDeleteGeofence() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => api.delete(`/geofences/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geofences'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        }
    });
}
