import api from './api';

export interface NotificationResponse {
    id: number;
    title: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export const NotificationService = {
    getMyNotifications: async (): Promise<NotificationResponse[]> => {
        const response = await api.get('/notifications');
        return response.data.result;
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await api.get('/notifications/unread-count');
        return response.data.result;
    },

    markAsRead: async (id: number): Promise<void> => {
        await api.post(`/notifications/${id}/read`);
    },

    getNotificationById: async (id: number): Promise<NotificationResponse> => {
        const response = await api.get(`/notifications/${id}`);
        return response.data.result;
    },

    deleteNotification: async (id: number): Promise<void> => {
        await api.delete(`/notifications/${id}`);
    }
};
