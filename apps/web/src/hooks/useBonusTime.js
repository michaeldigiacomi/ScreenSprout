import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useBonusTime(childId) {
    return useQuery({
        queryKey: ['bonusTime', childId],
        queryFn: async () => {
            try {
                const res = await api.get(`/bonus-time/available?childId=${childId}`);
                return res.data;
            } catch {
                return { totalMinutes: 0, grantCount: 0 };
            }
        },
        enabled: !!childId,
        retry: false
    });
}
