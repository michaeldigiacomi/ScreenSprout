import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useChildren() {
    return useQuery({
        queryKey: ['children'],
        queryFn: async () => {
            const res = await api.get('/children');
            // Normalize response
            return Array.isArray(res.data) ? res.data : (res.data?.data || []);
        },
    });
}

export function useChild(id) {
    return useQuery({
        queryKey: ['children', id],
        queryFn: async () => {
            const res = await api.get(`/children/${id}`);
            return res.data;
        },
        enabled: !!id
    });
}

export function useCreateChild() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newChild) => api.post('/children', newChild),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['children'] });
        }
    });
}
export function useUpdateChild() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => api.put(`/children/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['children'] });
        }
    });
}
