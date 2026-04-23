import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useLocationHistory(childId, startTime, endTime) {
    return useQuery({
        queryKey: ['locations', childId, startTime, endTime],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startTime) params.append('startTime', startTime);
            if (endTime) params.append('endTime', endTime);

            const res = await api.get(`/locations/${childId}/history?${params.toString()}`);
            return res.data;
        },
        enabled: !!childId
    });
}

export function useCurrentLocations() {
    return useQuery({
        queryKey: ['locations', 'current'],
        queryFn: async () => {
            // This endpoint might not exist, checking original code... 
            // Original code uses /locations/current presumably or manual filtering?
            // Let's assume we need to fetch latest for all children.
            // Actually, original code in LocationTracking might be polling.
            // Let's checking LocationTracking.jsx first.
            return [];
        },
        enabled: false // Placeholder until I check the code
    });
}
