import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useLocationStats(childId) {
    return useQuery({
        queryKey: ['stats', childId],
        queryFn: async () => {
            const res = await api.get(`/locations/stats/${childId}?days=7`);
            return res.data;
        },
        enabled: !!childId
    });
}
